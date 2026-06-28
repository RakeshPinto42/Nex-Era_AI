/**
 * Opportunity Ranking Engine — types (Investment Hub Phase 6).
 *
 * Ranks opportunities by overall CONVICTION (a multi-factor composite), never by
 * price movement alone. Every opportunity explains why it ranks. No advice.
 */

export type FactorScores = {
  businessQuality: number; // 0..100
  financialHealth: number;
  growth: number;
  valuation: number;
  technical: number;
  newsImpact: number;
  risk: number; // 0..100, higher = riskier
};

export type Opportunity = {
  ticker: string;
  company: string;
  sector: string;
  market: string;
  currency: string;
  price: number;
  changePct: number;
  marketCap: number;
  factors: FactorScores;
  conviction: number; // 0..100 — the ranking key
  confidence: number; // 0..1
  catalysts: string[];
  reason: string;
  fromMock: boolean;
};

export type RankCategoryKey =
  | "todays_top"
  | "best_value"
  | "highest_growth"
  | "momentum"
  | "turnarounds"
  | "dividend"
  | "small_cap"
  | "large_cap"
  | "ai_picks";

export type RankCategory = {
  key: RankCategoryKey;
  title: string;
  emoji: string;
  items: Opportunity[];
};

export type OpportunityResult = {
  asOf: string;
  scanned: number;
  categories: RankCategory[];
  mockData: boolean;
};
