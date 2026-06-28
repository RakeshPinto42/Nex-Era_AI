/**
 * Market Intelligence Tool — interface + MOCK provider (Investment Hub Phase 1).
 *
 * The Stock Agent NEVER calls Yahoo/AlphaVantage/Finnhub/etc. directly. It
 * consumes NORMALIZED market data from the Market Intelligence Tool. That tool
 * is NOT built yet — this file defines its normalized contract and a deterministic
 * MOCK so the Stock Agent can be developed against a stable interface. Swapping
 * in the real tool later requires no agent changes.
 *
 * No real API calls, no provider logic, no caching, no auth here.
 */

export type NewsImpact = {
  title: string;
  sentiment: "positive" | "negative" | "neutral";
  source: string;
  date: string;
};

/** Normalized, provider-agnostic market data the Stock Agent reasons over. */
export type NormalizedMarketData = {
  ticker: string;
  company: string;
  exchange: string;
  sector: string;
  industry: string;
  currency: string;
  price: number;
  changePct: number;
  marketCap: number;
  valuation: { peRatio: number; pegRatio: number; priceToSales: number; evToEbitda: number };
  financials: {
    revenue: number;
    revenueGrowthPct: number;
    grossMarginPct: number;
    netMarginPct: number;
    freeCashFlow: number;
    totalDebt: number;
    debtToEquity: number;
  };
  growth: { revenueCagr3yPct: number; epsGrowthPct: number };
  technicals: { sma50: number; sma200: number; rsi14: number; high52w: number; low52w: number };
  earnings: { lastEps: number; epsSurprisePct: number; nextDate: string };
  news: NewsImpact[];
  asOf: string;
  freshness: "fresh" | "delayed" | "stale";
  dataPoints: number;
  isMock: boolean;
  /** Provider(s) that supplied the data (set by the Market Intelligence Tool). */
  provider?: string;
};

/** The tool interface the Stock Agent depends on (mock today, real later). */
export interface MarketIntelligenceTool {
  getNormalized(ticker: string): Promise<NormalizedMarketData>;
}

// ---- deterministic mock ----

function rng(s: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KNOWN: Record<string, { company: string; exchange: string; sector: string; industry: string }> = {
  AAPL: { company: "Apple Inc.", exchange: "NASDAQ", sector: "Technology", industry: "Consumer Electronics" },
  MSFT: { company: "Microsoft Corporation", exchange: "NASDAQ", sector: "Technology", industry: "Software—Infrastructure" },
  NVDA: { company: "NVIDIA Corporation", exchange: "NASDAQ", sector: "Technology", industry: "Semiconductors" },
  AMZN: { company: "Amazon.com, Inc.", exchange: "NASDAQ", sector: "Consumer Cyclical", industry: "Internet Retail" },
  GOOGL: { company: "Alphabet Inc.", exchange: "NASDAQ", sector: "Communication Services", industry: "Internet Content" },
  TSLA: { company: "Tesla, Inc.", exchange: "NASDAQ", sector: "Consumer Cyclical", industry: "Auto Manufacturers" },
  JPM: { company: "JPMorgan Chase & Co.", exchange: "NYSE", sector: "Financial Services", industry: "Banks—Diversified" },
  RELIANCE: { company: "Reliance Industries Ltd.", exchange: "NSE", sector: "Energy", industry: "Oil & Gas Refining" },
};

const between = (r: () => number, lo: number, hi: number, dp = 2) =>
  +(lo + r() * (hi - lo)).toFixed(dp);

export const SUPPORTED_MARKETS = ["US (NYSE/NASDAQ)", "India (NSE/BSE)", "Crypto", "ETF"];

/** Mock Market Intelligence Tool — deterministic per ticker. */
export const mockMarketIntelligenceTool: MarketIntelligenceTool = {
  async getNormalized(rawTicker: string): Promise<NormalizedMarketData> {
    const ticker = rawTicker.trim().toUpperCase();
    const r = rng(ticker || "GENERIC");
    const meta =
      KNOWN[ticker] ?? {
        company: `${ticker} Holdings`,
        exchange: r() > 0.5 ? "NYSE" : "NASDAQ",
        sector: ["Technology", "Healthcare", "Industrials", "Financial Services", "Energy"][Math.floor(r() * 5)],
        industry: "Diversified",
      };

    const price = between(r, 20, 600);
    const sma50 = +(price * between(r, 0.9, 1.05, 4)).toFixed(2);
    const sma200 = +(price * between(r, 0.8, 1.1, 4)).toFixed(2);

    return {
      ticker,
      company: meta.company,
      exchange: meta.exchange,
      sector: meta.sector,
      industry: meta.industry,
      currency: meta.exchange === "NSE" || meta.exchange === "BSE" ? "INR" : "USD",
      price,
      changePct: between(r, -4, 4),
      marketCap: Math.round(between(r, 5, 3000) * 1e9),
      valuation: {
        peRatio: between(r, 8, 45),
        pegRatio: between(r, 0.5, 3),
        priceToSales: between(r, 1, 15),
        evToEbitda: between(r, 5, 30),
      },
      financials: {
        revenue: Math.round(between(r, 1, 400) * 1e9),
        revenueGrowthPct: between(r, -10, 35),
        grossMarginPct: between(r, 20, 75),
        netMarginPct: between(r, 2, 35),
        freeCashFlow: Math.round(between(r, -2, 90) * 1e9),
        totalDebt: Math.round(between(r, 0, 120) * 1e9),
        debtToEquity: between(r, 0, 2.5),
      },
      growth: { revenueCagr3yPct: between(r, -5, 30), epsGrowthPct: between(r, -15, 40) },
      technicals: {
        sma50,
        sma200,
        rsi14: between(r, 20, 80, 1),
        high52w: +(price * between(r, 1.05, 1.6, 4)).toFixed(2),
        low52w: +(price * between(r, 0.5, 0.95, 4)).toFixed(2),
      },
      earnings: {
        lastEps: between(r, -1, 12),
        epsSurprisePct: between(r, -20, 20, 1),
        nextDate: new Date(Date.now() + Math.floor(r() * 80 + 5) * 86400000).toISOString().slice(0, 10),
      },
      news: [
        { title: `${meta.company} reports quarterly results`, sentiment: r() > 0.5 ? "positive" : "neutral", source: "MarketWire", date: new Date().toISOString().slice(0, 10) },
        { title: `Analysts revise ${ticker} estimates`, sentiment: r() > 0.5 ? "positive" : "negative", source: "Street", date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) },
        { title: `${meta.sector} sector outlook update`, sentiment: "neutral", source: "SectorDesk", date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10) },
      ],
      asOf: new Date().toISOString(),
      freshness: "delayed",
      dataPoints: 24,
      isMock: true,
      provider: "mock",
    };
  },
};
