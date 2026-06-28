/**
 * Live Market Terminal — types (Investment Hub Phase 5).
 *
 * Lightweight, pollable market snapshot powering a live terminal. Data comes
 * from the Market Intelligence Tool (cached). No advice, no trading.
 */

export type LiteQuote = {
  ticker: string;
  company: string;
  sector: string;
  market: string;
  currency: string;
  price: number;
  changePct: number;
  marketCap: number;
  volume: number | null; // not provided by the normalized schema yet
  nextEarnings: string | null;
  newsCount: number;
};

export type NewsTick = {
  ticker: string;
  title: string;
  sentiment: "positive" | "negative" | "neutral";
  source: string;
  date: string;
};

export type SectorPerf = { sector: string; avgChangePct: number; count: number };

export type Breadth = { advancers: number; decliners: number; unchanged: number; ratio: number };

export type AIOpportunity = {
  ticker: string;
  company: string;
  score: number;
  confidence: number;
  signals: string[];
};

export type EconEvent = {
  date: string;
  time: string;
  title: string;
  importance: "low" | "medium" | "high";
  region: string;
};

export type TerminalSnapshot = {
  asOf: string;
  quotes: LiteQuote[];
  gainers: LiteQuote[];
  losers: LiteQuote[];
  mostActive: LiteQuote[];
  trending: LiteQuote[];
  breadth: Breadth;
  sectors: SectorPerf[];
  earnings: LiteQuote[];
  news: NewsTick[];
  aiOpportunities: AIOpportunity[];
  mockData: boolean;
};
