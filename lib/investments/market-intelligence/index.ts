/**
 * Market Intelligence Tool — the ONLY gateway between the Investment Hub and
 * external market providers. No agent may call a provider directly.
 *
 * Responsibilities: provider abstraction, failover, response normalization,
 * caching, rate-limit management, data freshness, unified schema. Returns one
 * NormalizedMarketData. No UI, no business logic.
 *
 * Implements the MarketIntelligenceTool interface the Stock Agent depends on,
 * so swapping the mock for this is a one-line change at the call site.
 */

import "server-only";
import type { MarketIntelligenceTool, NormalizedMarketData } from "@/lib/agents/stock-agent/market-data";
import { mockMarketIntelligenceTool } from "@/lib/agents/stock-agent/market-data";
import {
  EQUITY_PROVIDERS,
  CRYPTO_PROVIDERS,
  fetchNews,
  type AssetKind,
  type Provider,
  type ProviderPartial,
} from "./providers";
import { getCached, setCached, cacheAge, freshnessFor } from "./cache";

const CRYPTO_SET = new Set(["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "DOT", "MATIC", "LTC", "LINK", "TRX"]);

function classify(ticker: string): AssetKind {
  const t = ticker.toUpperCase();
  if (/-?USDT?$/.test(t)) return "crypto";
  if (CRYPTO_SET.has(t.replace(/-?USDT?$/, ""))) return "crypto";
  return "equity";
}

const NESTED = ["valuation", "financials", "growth", "technicals", "earnings"] as const;
type NestedKey = (typeof NESTED)[number];

function cleanObj<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
}

/** Merge a provider partial into the accumulator, keeping first non-undefined (priority order). */
function accumulate(acc: ProviderPartial, pp: ProviderPartial): void {
  for (const [k, v] of Object.entries(pp)) {
    if (v === undefined || v === null) continue;
    if (NESTED.includes(k as NestedKey)) {
      const target = (acc[k as NestedKey] ?? {}) as Record<string, unknown>;
      for (const [f, fv] of Object.entries(cleanObj(v as Record<string, unknown>))) {
        if (target[f] === undefined) target[f] = fv;
      }
      (acc as Record<string, unknown>)[k] = target;
    } else if (acc[k as keyof ProviderPartial] === undefined) {
      (acc as Record<string, unknown>)[k] = v;
    }
  }
}

function finalize(p: ProviderPartial, ticker: string, kind: AssetKind, used: string[]): NormalizedMarketData {
  const v: Partial<NormalizedMarketData["valuation"]> = p.valuation ?? {};
  const f: Partial<NormalizedMarketData["financials"]> = p.financials ?? {};
  const g: Partial<NormalizedMarketData["growth"]> = p.growth ?? {};
  const t: Partial<NormalizedMarketData["technicals"]> = p.technicals ?? {};
  const e: Partial<NormalizedMarketData["earnings"]> = p.earnings ?? {};
  return {
    ticker: p.ticker ?? ticker.toUpperCase(),
    company: p.company || ticker.toUpperCase(),
    exchange: p.exchange || (kind === "crypto" ? "Crypto" : "—"),
    sector: p.sector || (kind === "crypto" ? "Crypto" : "Unknown"),
    industry: p.industry || "Unknown",
    currency: p.currency || "USD",
    price: p.price ?? 0,
    changePct: p.changePct ?? 0,
    marketCap: p.marketCap ?? 0,
    valuation: {
      peRatio: v.peRatio ?? 0, pegRatio: v.pegRatio ?? 0, priceToSales: v.priceToSales ?? 0, evToEbitda: v.evToEbitda ?? 0,
    },
    financials: {
      revenue: f.revenue ?? 0, revenueGrowthPct: f.revenueGrowthPct ?? 0, grossMarginPct: f.grossMarginPct ?? 0,
      netMarginPct: f.netMarginPct ?? 0, freeCashFlow: f.freeCashFlow ?? 0, totalDebt: f.totalDebt ?? 0, debtToEquity: f.debtToEquity ?? 0,
    },
    growth: { revenueCagr3yPct: g.revenueCagr3yPct ?? 0, epsGrowthPct: g.epsGrowthPct ?? 0 },
    technicals: {
      sma50: t.sma50 ?? 0, sma200: t.sma200 ?? 0, rsi14: t.rsi14 ?? 50, high52w: t.high52w ?? 0, low52w: t.low52w ?? 0,
    },
    earnings: { lastEps: e.lastEps ?? 0, epsSurprisePct: e.epsSurprisePct ?? 0, nextDate: e.nextDate ?? "" },
    news: p.news ?? [],
    asOf: new Date().toISOString(),
    freshness: "fresh",
    dataPoints: p.dataPoints ?? 0,
    isMock: false,
    provider: used.join("+") || "none",
  };
}

async function gather(ticker: string, kind: AssetKind): Promise<NormalizedMarketData | null> {
  const chain: Provider[] = kind === "crypto" ? CRYPTO_PROVIDERS : EQUITY_PROVIDERS;
  const acc: ProviderPartial = {};
  const used: string[] = [];

  for (const p of chain) {
    if (!p.enabled()) continue;
    try {
      const r = await p.fetch(ticker, kind);
      if (r) {
        accumulate(acc, r);
        used.push(p.name);
      }
    } catch {
      // provider failed → failover to the next
    }
  }

  if (!used.length || acc.price === undefined) return null;

  const data = finalize(acc, ticker, kind, used);
  // enrich with news (best-effort; non-blocking failure)
  const query = kind === "crypto" ? `${data.company} crypto price` : `${data.company} stock`;
  data.news = await fetchNews(query);
  return data;
}

export const marketIntelligenceTool: MarketIntelligenceTool = {
  async getNormalized(rawTicker: string): Promise<NormalizedMarketData> {
    const ticker = rawTicker.trim();
    const kind = classify(ticker);
    const key = `mi:${kind}:${ticker.toUpperCase()}`;

    const cached = getCached<NormalizedMarketData>(key, 60_000);
    if (cached) return { ...cached, freshness: freshnessFor(cacheAge(key)) };

    try {
      const data = await gather(ticker, kind);
      if (data) {
        setCached(key, data);
        return data;
      }
    } catch {
      // fall through to mock
    }

    // Last resort: never hard-fail — return mock data clearly flagged.
    return mockMarketIntelligenceTool.getNormalized(ticker);
  },
};
