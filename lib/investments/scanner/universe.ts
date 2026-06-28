/**
 * AI Market Scanner — configurable market universe (Phase 4).
 *
 * The Scanner does NOT scan every company — it scans a configurable universe
 * per market (Yahoo-compatible symbols, resolved through the Market Intelligence
 * Tool). Extend these lists or make them user-configurable later.
 */

import type { MarketKey } from "./types";

export const UNIVERSE: Record<MarketKey, string[]> = {
  us: ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "XOM", "UNH", "PG", "KO", "PFE", "DIS"],
  india: ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS"],
  etf: ["VOO", "QQQ", "SPY", "VTI", "ARKK", "SCHD", "VYM", "IWM"],
  crypto: ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX"],
  indices: ["^GSPC", "^IXIC", "^DJI", "^NSEI", "^FTSE", "^N225"],
  forex: ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDINR=X"],
  commodities: ["GC=F", "SI=F", "CL=F", "NG=F"],
};

/** Resolve the symbols to scan for the selected markets (bounded). */
export function symbolsFor(markets: MarketKey[], capPerMarket = 12): { market: MarketKey; symbol: string }[] {
  const out: { market: MarketKey; symbol: string }[] = [];
  for (const m of markets) {
    for (const symbol of (UNIVERSE[m] ?? []).slice(0, capPerMarket)) {
      out.push({ market: m, symbol });
    }
  }
  return out;
}
