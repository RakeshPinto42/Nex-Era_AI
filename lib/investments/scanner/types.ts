/**
 * AI Market Scanner — types (Investment Hub Phase 4).
 *
 * The Scanner DISCOVERS opportunities (candidate generation from signals) and
 * shortlists the highest-priority ones for the Investment Intelligence Agent to
 * RESEARCH. It never duplicates the agent and never gives advice/guaranteed
 * returns.
 */

export type MarketKey = "us" | "india" | "etf" | "crypto" | "indices" | "forex" | "commodities";

export const MARKET_LABELS: Record<MarketKey, string> = {
  us: "US Stocks",
  india: "Indian Stocks",
  etf: "ETFs",
  crypto: "Crypto",
  indices: "Indices",
  forex: "Forex",
  commodities: "Commodities",
};

export type ScanSignal =
  | "large_change"
  | "breakout_52w"
  | "low_52w"
  | "momentum"
  | "relative_strength"
  | "undervalued"
  | "earnings_week"
  | "news_driven"
  | "hidden_gem"
  | "dividend"
  | "volatility";

export const SIGNAL_LABELS: Record<ScanSignal, string> = {
  large_change: "Large price change",
  breakout_52w: "52-week breakout",
  low_52w: "52-week low",
  momentum: "Momentum",
  relative_strength: "Relative strength",
  undervalued: "Undervalued",
  earnings_week: "Earnings this week",
  news_driven: "News driven",
  hidden_gem: "Hidden gem",
  dividend: "Dividend candidate",
  volatility: "Elevated volatility",
};

/** Optional Investment Intelligence Agent enrichment for shortlisted candidates. */
export type CandidateResearch = {
  confidence: number;
  businessQuality: string;
  valuation: string;
  investmentThesis: string;
  bullCase: string;
  bearCase: string;
};

export type Candidate = {
  ticker: string;
  company: string;
  market: MarketKey;
  sector: string;
  currency: string;
  price: number;
  changePct: number;
  marketCap: number;
  signals: ScanSignal[];
  score: number;
  reason: string;
  research?: CandidateResearch;
};

export type FeedKey =
  | "high_conviction"
  | "undervalued"
  | "momentum"
  | "breakouts"
  | "dividend"
  | "earnings_week"
  | "news_driven"
  | "hidden_gems"
  | "ai_watchlist"
  | "macro";

export type Feed = {
  key: FeedKey;
  title: string;
  emoji: string;
  candidates: Candidate[];
};

export type ScanStatus = {
  lastScan: string;
  companiesScanned: number;
  candidatesFound: number;
  queueDepth: number;
  markets: MarketKey[];
  mockData: boolean;
};

export type ScanResult = {
  status: ScanStatus;
  feeds: Feed[];
};

export type ScanRequest = {
  markets: MarketKey[];
  /** Tickers the user already holds — used to diversify (downrank held sectors). */
  holdings?: string[];
};
