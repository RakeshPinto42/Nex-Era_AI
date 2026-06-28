// AI Market Scanner — engine (Phase 4).
//
// Discovers candidates from signals over a configurable universe, scores +
// shortlists them, passes only the top picks to the Investment Intelligence
// Agent for research, then assembles dynamic feeds. Reuses the Market
// Intelligence Tool (data) and the IIA (analyzeStock) — never duplicates them.
// Never gives advice or guaranteed returns.

import "server-only";
import { marketIntelligenceTool } from "@/lib/investments/market-intelligence";
import type { NormalizedMarketData } from "@/lib/agents/stock-agent/market-data";
import { analyzeStock } from "@/lib/agents/stock-agent/analyze";
import { symbolsFor } from "./universe";
import {
  SIGNAL_LABELS,
  type Candidate,
  type CandidateResearch,
  type Feed,
  type FeedKey,
  type MarketKey,
  type ScanRequest,
  type ScanResult,
  type ScanSignal,
} from "./types";

const SIGNAL_WEIGHT: Record<ScanSignal, number> = {
  large_change: 1, breakout_52w: 2, low_52w: 1, momentum: 2, relative_strength: 2,
  undervalued: 2, earnings_week: 1, news_driven: 1, hidden_gem: 2, dividend: 1, volatility: 0.5,
};

function deriveSignals(d: NormalizedMarketData): ScanSignal[] {
  const s: ScanSignal[] = [];
  const { high52w, low52w, sma200, rsi14 } = d.technicals;
  const w52 = high52w > low52w ? (d.price - low52w) / (high52w - low52w) : null;
  const rs = sma200 ? (d.price / sma200 - 1) * 100 : null;

  if (Math.abs(d.changePct) >= 3) s.push("large_change");
  if (w52 != null && w52 >= 0.9) s.push("breakout_52w");
  if (w52 != null && w52 <= 0.1) s.push("low_52w");
  if (rs != null && rs > 2 && rsi14 >= 50 && rsi14 <= 72) s.push("momentum");
  if (rs != null && rs > 5) s.push("relative_strength");
  if (d.valuation.peRatio > 0 && d.valuation.peRatio < 15) s.push("undervalued");
  if (d.earnings.nextDate) {
    const days = (+new Date(d.earnings.nextDate) - Date.now()) / 86400000;
    if (days >= 0 && days <= 7) s.push("earnings_week");
  }
  if (d.news.some((n) => n.sentiment !== "neutral")) s.push("news_driven");
  if (d.marketCap > 0 && d.marketCap < 10e9 && d.financials.netMarginPct >= 8) s.push("hidden_gem");
  if (d.marketCap >= 50e9 && Math.abs(d.changePct) < 1.5) s.push("dividend");
  if (Math.abs(d.changePct) >= 5 || rsi14 > 75 || rsi14 < 25) s.push("volatility");
  return s;
}

function scoreOf(signals: ScanSignal[], d: NormalizedMarketData): number {
  const base = signals.reduce((n, sig) => n + SIGNAL_WEIGHT[sig], 0);
  return +(base + Math.min(3, Math.abs(d.changePct) / 3)).toFixed(2);
}

function toResearch(insights: Awaited<ReturnType<typeof analyzeStock>>): CandidateResearch {
  return {
    confidence: insights.confidence,
    businessQuality: insights.businessQuality,
    valuation: insights.valuation,
    investmentThesis: insights.investmentThesis,
    bullCase: insights.bullCase,
    bearCase: insights.bearCase,
  };
}

const FEED_DEFS: { key: FeedKey; title: string; emoji: string; match: (c: Candidate) => boolean }[] = [
  { key: "high_conviction", title: "High Conviction", emoji: "🔥", match: (c) => !!c.research },
  { key: "undervalued", title: "Undervalued", emoji: "💎", match: (c) => c.signals.includes("undervalued") },
  { key: "momentum", title: "Momentum", emoji: "🚀", match: (c) => c.signals.includes("momentum") || c.signals.includes("relative_strength") },
  { key: "breakouts", title: "Breakouts", emoji: "📈", match: (c) => c.signals.includes("breakout_52w") },
  { key: "dividend", title: "Dividend Opportunities", emoji: "💰", match: (c) => c.signals.includes("dividend") },
  { key: "earnings_week", title: "Earnings This Week", emoji: "⚠", match: (c) => c.signals.includes("earnings_week") },
  { key: "news_driven", title: "News Driven", emoji: "📰", match: (c) => c.signals.includes("news_driven") },
  { key: "hidden_gems", title: "Hidden Gems", emoji: "⭐", match: (c) => c.signals.includes("hidden_gem") },
  { key: "ai_watchlist", title: "AI Watchlist", emoji: "📊", match: () => true },
  { key: "macro", title: "Macro Opportunities", emoji: "🏦", match: (c) => ["indices", "forex", "commodities"].includes(c.market) },
];

export async function runScan(req: ScanRequest): Promise<ScanResult> {
  const targets = symbolsFor(req.markets);
  const holdings = new Set((req.holdings ?? []).map((h) => h.trim().toUpperCase()).filter(Boolean));

  const dataByTicker = new Map<string, NormalizedMarketData>();
  let mockData = false;

  const scanned = await Promise.all(
    targets.map(async ({ market, symbol }) => {
      try {
        const d = await marketIntelligenceTool.getNormalized(symbol);
        return { market, d };
      } catch {
        return null;
      }
    }),
  );

  // Build candidates.
  let candidates: Candidate[] = [];
  for (const row of scanned) {
    if (!row) continue;
    const { market, d } = row;
    if (d.isMock) mockData = true;
    dataByTicker.set(d.ticker, d);
    const signals = deriveSignals(d);
    if (signals.length === 0) continue;
    candidates.push({
      ticker: d.ticker,
      company: d.company,
      market,
      sector: d.sector,
      currency: d.currency,
      price: d.price,
      changePct: d.changePct,
      marketCap: d.marketCap,
      signals,
      score: scoreOf(signals, d),
      reason: signals.slice(0, 2).map((s) => SIGNAL_LABELS[s]).join(" · ") || "On the radar",
    });
  }

  // Personalization: diversify away from sectors the user already holds.
  const heldSectors = new Set<string>();
  for (const c of candidates) if (holdings.has(c.ticker)) heldSectors.add(c.sector);
  for (const c of candidates) {
    if (heldSectors.has(c.sector) && !holdings.has(c.ticker) && c.score < 6) {
      c.score = +Math.max(0, c.score - 1.5).toFixed(2);
      c.reason = `${c.reason} · diversifies vs your holdings`;
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  // Shortlist: only the top candidates go to the Investment Intelligence Agent.
  const shortlist = candidates.slice(0, 3);
  await Promise.all(
    shortlist.map(async (c) => {
      const d = dataByTicker.get(c.ticker);
      if (!d) return;
      try {
        const insights = await analyzeStock(d);
        c.research = toResearch(insights);
      } catch {
        /* research is best-effort */
      }
    }),
  );

  // Build feeds.
  const feeds: Feed[] = FEED_DEFS.map((def) => {
    const list = candidates.filter(def.match).sort((a, b) => {
      if (def.key === "high_conviction") return (b.research?.confidence ?? 0) - (a.research?.confidence ?? 0);
      return b.score - a.score;
    }).slice(0, 8);
    return { key: def.key, title: def.title, emoji: def.emoji, candidates: list };
  }).filter((f) => f.candidates.length > 0);

  return {
    status: {
      lastScan: new Date().toISOString(),
      companiesScanned: dataByTicker.size,
      candidatesFound: candidates.length,
      queueDepth: shortlist.length,
      markets: req.markets,
      mockData,
    },
    feeds,
  };
}
