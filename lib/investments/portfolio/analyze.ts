// Portfolio Intelligence — analysis engine.
//
// Reuses the Market Intelligence Tool (per-holding normalized data), the
// Opportunity Engine (missed opportunities) and the AI Router (the "why").
// Computes allocations, risk, diversification, drawdown, over/undervaluation.
// Analysis only — no trading. No duplicate provider/agent logic.

import "server-only";
import { marketIntelligenceTool } from "@/lib/investments/market-intelligence";
import { rankOpportunities } from "@/lib/investments/opportunity/rank";
import { completeWithFallback, type ChatMsg } from "@/lib/llm/infer";
import type { NormalizedMarketData } from "@/lib/agents/stock-agent/market-data";
import type {
  Holding, HoldingRow, Allocation, PortfolioAnalysis, AISuggestion, MissedOpportunity,
} from "./types";

function countryOf(d: NormalizedMarketData): string {
  if (d.country) return d.country; // canonical schema (real classification)
  if (d.exchange === "NSE" || d.exchange === "BSE" || d.currency === "INR") return "India";
  if (d.exchange === "Crypto") return "Global";
  return "United States";
}

/** Realized daily volatility (%) from a close series, or null if unavailable. */
function realizedVol(closes?: number[]): number | null {
  if (!closes || closes.length < 6) return null;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  if (rets.length < 5) return null;
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / rets.length);
  return +(sd * 100).toFixed(2);
}
function assetOf(d: NormalizedMarketData): "Stock" | "ETF" | "Crypto" {
  if (d.exchange === "Crypto") return "Crypto";
  if (/etf|index|fund/i.test(d.industry) || ["VOO", "QQQ", "SPY", "VTI", "ARKK", "SCHD", "VYM", "IWM"].includes(d.ticker)) return "ETF";
  return "Stock";
}
function zoneOf(d: NormalizedMarketData): HoldingRow["valuationZone"] {
  if (d.valuation.peRatio <= 0) return "Unknown";
  const s = 100 - d.valuation.peRatio * 2.2 - d.valuation.priceToSales * 1.5;
  return s >= 66 ? "Undervalued" : s >= 45 ? "Fair Value" : "Rich";
}
function alloc(map: Map<string, number>, total: number): Allocation[] {
  return [...map.entries()]
    .map(([label, value]) => ({ label, value, pct: total ? +((value / total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.value - a.value);
}

async function aiWhy(summary: string): Promise<{ text: string; mode: "ai" | "deterministic" }> {
  const system =
    "You explain an investment portfolio's posture in plain language. Use ONLY the provided metrics. Explain WHY (concentration, valuation, risk, diversification) — not just restating numbers. No advice, no price targets. 3-4 sentences.";
  const messages: ChatMsg[] = [{ role: "user", content: summary }];
  try {
    const r = await completeWithFallback(system, messages, undefined, { maxTokens: 500 });
    if (r) return { text: r.text.trim(), mode: "ai" };
  } catch { /* */ }
  return { text: "", mode: "deterministic" };
}

export async function analyzePortfolio(holdings: Holding[], watchlist: string[] = []): Promise<PortfolioAnalysis> {
  const capped = holdings.filter((h) => h.ticker?.trim() && h.quantity > 0).slice(0, 25);
  const datas = await Promise.all(
    capped.map(async (h) => {
      try { return { h, d: await marketIntelligenceTool.getNormalized(h.ticker) }; } catch { return null; }
    }),
  );

  let mockData = false;
  let dividendIncome = 0;
  const volByTicker = new Map<string, number | null>();
  const rows: HoldingRow[] = [];
  for (const row of datas) {
    if (!row) continue;
    const { h, d } = row;
    if (d.isMock) mockData = true;
    const marketValue = d.price * h.quantity;
    if (d.dividend && d.dividend.yieldPct > 0) dividendIncome += marketValue * (d.dividend.yieldPct / 100);
    volByTicker.set(d.ticker, realizedVol(d.priceHistory?.["1M"] ?? d.priceHistory?.["3M"]));
    const todayPnl = marketValue * (d.changePct / 100);
    const totalPnl = h.avgCost ? (d.price - h.avgCost) * h.quantity : null;
    const dd = d.technicals.high52w > 0 ? ((d.price - d.technicals.high52w) / d.technicals.high52w) * 100 : 0;
    rows.push({
      ticker: d.ticker, company: d.company, sector: d.sector, country: countryOf(d), assetClass: assetOf(d),
      quantity: h.quantity, price: d.price, currency: d.currency, changePct: d.changePct,
      marketValue, weightPct: 0, todayPnl, totalPnl,
      valuationZone: zoneOf(d), drawdownFrom52wHighPct: +dd.toFixed(1),
    });
  }

  const portfolioValue = rows.reduce((s, r) => s + r.marketValue, 0);
  rows.forEach((r) => (r.weightPct = portfolioValue ? +((r.marketValue / portfolioValue) * 100).toFixed(1) : 0));
  rows.sort((a, b) => b.marketValue - a.marketValue);

  const todayPnl = rows.reduce((s, r) => s + r.todayPnl, 0);
  const totalPnlVals = rows.map((r) => r.totalPnl).filter((v): v is number => v != null);
  const totalPnl = totalPnlVals.length === rows.length && rows.length > 0 ? totalPnlVals.reduce((a, b) => a + b, 0) : null;

  const sectorMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const assetMap = new Map<string, number>();
  for (const r of rows) {
    sectorMap.set(r.sector, (sectorMap.get(r.sector) ?? 0) + r.marketValue);
    countryMap.set(r.country, (countryMap.get(r.country) ?? 0) + r.marketValue);
    assetMap.set(r.assetClass, (assetMap.get(r.assetClass) ?? 0) + r.marketValue);
  }

  // Weighted volatility — uses realized daily vol from price history when
  // available (canonical schema), else falls back to the daily-move proxy.
  const volatilityPct = portfolioValue
    ? +rows.reduce((s, r) => {
        const real = volByTicker.get(r.ticker);
        const vol = real ?? Math.abs(r.changePct);
        return s + vol * (r.marketValue / portfolioValue);
      }, 0).toFixed(2)
    : 0;
  const volIsReal = rows.some((r) => volByTicker.get(r.ticker) != null);
  const hhi = rows.reduce((s, r) => s + (r.weightPct / 100) ** 2, 0);
  const diversificationScore = +(Math.max(0, (1 - hhi)) * 100).toFixed(0);
  const top = rows[0];
  const concentrationRisk = { topTicker: top?.ticker ?? "—", topWeightPct: top?.weightPct ?? 0, flagged: (top?.weightPct ?? 0) > 25 };
  const maxDrawdownPct = rows.length ? +Math.min(...rows.map((r) => r.drawdownFrom52wHighPct)).toFixed(1) : 0;
  const riskScore = +Math.max(0, Math.min(100,
    concentrationRisk.topWeightPct * 0.4 + volatilityPct * 6 + Math.abs(maxDrawdownPct) * 0.4 + (100 - diversificationScore) * 0.3,
  )).toFixed(0);

  const overvalued = rows.filter((r) => r.valuationZone === "Rich").map((r) => r.ticker);
  const undervalued = rows.filter((r) => r.valuationZone === "Undervalued").map((r) => r.ticker);

  // missed opportunities — reuse the Opportunity Engine, exclude held names
  const held = new Set(rows.map((r) => r.ticker.toUpperCase()));
  let missedOpportunities: MissedOpportunity[] = [];
  try {
    const ranked = await rankOpportunities(["us", "etf", "crypto"]);
    const topCat = ranked.categories.find((c) => c.key === "todays_top");
    missedOpportunities = (topCat?.items ?? [])
      .filter((o) => !held.has(o.ticker.toUpperCase()))
      .slice(0, 4)
      .map((o) => ({ ticker: o.ticker, company: o.company, conviction: o.conviction, reason: o.reason }));
  } catch { /* best-effort */ }

  // watchlist correlation (sector overlap proxy)
  const portSectors = new Set(rows.map((r) => r.sector));
  const sharedSectors = [...new Set(watchlist.map((w) => rows.find((r) => r.ticker.toUpperCase() === w.toUpperCase())?.sector).filter((s): s is string => !!s))]
    .filter((s) => portSectors.has(s));

  // suggestions (deterministic, each with a WHY)
  const suggestions: AISuggestion[] = [];
  if (concentrationRisk.flagged) suggestions.push({ title: `Trim ${concentrationRisk.topTicker} concentration`, why: `${concentrationRisk.topTicker} is ${concentrationRisk.topWeightPct}% of the book — a single-name shock would dominate returns.`, severity: "high" });
  if (diversificationScore < 50) suggestions.push({ title: "Increase diversification", why: `Holdings are concentrated (diversification ${diversificationScore}/100); spreading across sectors reduces idiosyncratic risk.`, severity: "warn" });
  if (overvalued.length) suggestions.push({ title: `Review richly-valued names`, why: `${overvalued.join(", ")} screen as Rich on earnings multiples — more downside if growth disappoints.`, severity: "warn" });
  if (sectorMap.size <= 2 && rows.length > 2) suggestions.push({ title: "Add a different sector", why: `Exposure spans only ${sectorMap.size} sector(s); a new sector lowers correlation.`, severity: "warn" });
  if (missedOpportunities.length) suggestions.push({ title: `Consider ${missedOpportunities[0].ticker}`, why: `High Opportunity Engine conviction (${missedOpportunities[0].conviction}) and not currently held.`, severity: "info" });
  if (suggestions.length === 0) suggestions.push({ title: "Balanced posture", why: "No concentration, valuation or diversification flags from current data.", severity: "info" });

  const summary = [
    `Value $${portfolioValue.toFixed(0)}, today P&L ${todayPnl >= 0 ? "+" : ""}$${todayPnl.toFixed(0)}.`,
    `Top weight ${concentrationRisk.topTicker} ${concentrationRisk.topWeightPct}%. Diversification ${diversificationScore}/100. Risk ${riskScore}/100.`,
    `Volatility ${volatilityPct}% (${volIsReal ? "realized" : "proxy"}), max drawdown ${maxDrawdownPct}%.`,
    `Overvalued: ${overvalued.join(", ") || "none"}. Undervalued: ${undervalued.join(", ") || "none"}.`,
    `Sectors: ${[...sectorMap.keys()].join(", ")}.`,
  ].join(" ");
  const ai = await aiWhy(summary);

  return {
    asOf: new Date().toISOString(),
    holdings: rows,
    portfolioValue: +portfolioValue.toFixed(2),
    todayPnl: +todayPnl.toFixed(2),
    todayPnlPct: portfolioValue ? +((todayPnl / portfolioValue) * 100).toFixed(2) : 0,
    totalPnl: totalPnl != null ? +totalPnl.toFixed(2) : null,
    sectorAllocation: alloc(sectorMap, portfolioValue),
    countryAllocation: alloc(countryMap, portfolioValue),
    assetAllocation: alloc(assetMap, portfolioValue),
    estimatedDividendIncome: +dividendIncome.toFixed(0),
    volatilityPct,
    diversificationScore,
    riskScore,
    maxDrawdownPct,
    concentrationRisk,
    overvalued,
    undervalued,
    missedOpportunities,
    watchlistCorrelation: {
      sharedSectors,
      note: sharedSectors.length ? `Watchlist overlaps your holdings in ${sharedSectors.join(", ")} — adding them raises concentration.` : "Watchlist adds diversification vs current holdings.",
    },
    suggestions,
    explanation: ai.text || `Portfolio worth $${portfolioValue.toFixed(0)} with risk ${riskScore}/100. ${concentrationRisk.flagged ? `Concentrated in ${concentrationRisk.topTicker}.` : "No major concentration."} Diversification ${diversificationScore}/100.`,
    explanationMode: ai.mode,
    mockData,
  };
}
