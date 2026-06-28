// Live Market Terminal — snapshot builder (Phase 5).
//
// Aggregates a market snapshot from the Market Intelligence Tool (cached).
// Reused by the terminal API; a short module cache dedupes frequent polls.
// No advice, no trading.

import "server-only";
import { marketIntelligenceTool } from "@/lib/investments/market-intelligence";
import { UNIVERSE } from "@/lib/investments/scanner/universe";
import type { LiteQuote, NewsTick, TerminalSnapshot, SectorPerf, AIOpportunity } from "./types";

// Terminal universe — bounded for responsiveness; covers all six markets.
const TERMINAL_SYMBOLS: { market: string; symbol: string }[] = [
  ...UNIVERSE.us.slice(0, 10).map((symbol) => ({ market: "US", symbol })),
  ...UNIVERSE.india.slice(0, 5).map((symbol) => ({ market: "India", symbol })),
  ...UNIVERSE.etf.slice(0, 5).map((symbol) => ({ market: "ETF", symbol })),
  ...UNIVERSE.crypto.slice(0, 5).map((symbol) => ({ market: "Crypto", symbol })),
  ...UNIVERSE.commodities.slice(0, 3).map((symbol) => ({ market: "Commodities", symbol })),
  ...UNIVERSE.forex.slice(0, 3).map((symbol) => ({ market: "Forex", symbol })),
];

let cache: { t: number; snap: TerminalSnapshot } | null = null;
const CACHE_MS = 12_000;

function aiScore(q: LiteQuote): AIOpportunity {
  const signals: string[] = [];
  if (Math.abs(q.changePct) >= 3) signals.push("large move");
  if (q.newsCount > 0) signals.push("news");
  if (q.nextEarnings) {
    const d = (+new Date(q.nextEarnings) - Date.now()) / 86400000;
    if (d >= 0 && d <= 7) signals.push("earnings soon");
  }
  const score = +(Math.abs(q.changePct) + q.newsCount * 0.5 + signals.length).toFixed(2);
  return { ticker: q.ticker, company: q.company, score, confidence: Math.min(0.9, 0.4 + score / 15), signals };
}

export async function buildTerminalSnapshot(): Promise<TerminalSnapshot> {
  if (cache && Date.now() - cache.t < CACHE_MS) return cache.snap;

  const news: NewsTick[] = [];
  const quotes: LiteQuote[] = [];

  const rows = await Promise.all(
    TERMINAL_SYMBOLS.map(async ({ market, symbol }) => {
      try {
        return { market, d: await marketIntelligenceTool.getNormalized(symbol) };
      } catch {
        return null;
      }
    }),
  );

  let mockData = false;
  for (const row of rows) {
    if (!row) continue;
    const { market, d } = row;
    if (d.isMock) mockData = true;
    quotes.push({
      ticker: d.ticker, company: d.company, sector: d.sector, market, currency: d.currency,
      price: d.price, changePct: d.changePct, marketCap: d.marketCap, volume: d.avgVolume ?? null,
      nextEarnings: d.earnings.nextDate || null, newsCount: d.news.length,
    });
    for (const n of d.news.slice(0, 2)) news.push({ ticker: d.ticker, ...n });
  }

  const byChangeDesc = [...quotes].sort((a, b) => b.changePct - a.changePct);
  const byAbsChange = [...quotes].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));

  const advancers = quotes.filter((q) => q.changePct > 0.05).length;
  const decliners = quotes.filter((q) => q.changePct < -0.05).length;
  const unchanged = quotes.length - advancers - decliners;

  const sectorMap = new Map<string, { sum: number; n: number }>();
  for (const q of quotes) {
    const e = sectorMap.get(q.sector) ?? { sum: 0, n: 0 };
    e.sum += q.changePct; e.n += 1; sectorMap.set(q.sector, e);
  }
  const sectors: SectorPerf[] = [...sectorMap.entries()]
    .map(([sector, e]) => ({ sector, avgChangePct: +(e.sum / e.n).toFixed(2), count: e.n }))
    .sort((a, b) => b.avgChangePct - a.avgChangePct);

  const earnings = quotes
    .filter((q) => q.nextEarnings && (+new Date(q.nextEarnings) - Date.now()) / 86400000 <= 14 && +new Date(q.nextEarnings) >= Date.now())
    .sort((a, b) => +new Date(a.nextEarnings!) - +new Date(b.nextEarnings!));

  const aiOpportunities = quotes.map(aiScore).sort((a, b) => b.score - a.score).slice(0, 8);

  const snap: TerminalSnapshot = {
    asOf: new Date().toISOString(),
    quotes,
    gainers: byChangeDesc.slice(0, 8),
    losers: byChangeDesc.slice(-8).reverse(),
    mostActive: byAbsChange.slice(0, 8),
    trending: [...quotes].sort((a, b) => Math.abs(b.changePct) + b.newsCount - (Math.abs(a.changePct) + a.newsCount)).slice(0, 8),
    breadth: { advancers, decliners, unchanged, ratio: decliners ? +(advancers / decliners).toFixed(2) : advancers },
    sectors,
    earnings,
    news: news.slice(0, 20),
    aiOpportunities,
    mockData,
  };

  cache = { t: Date.now(), snap };
  return snap;
}
