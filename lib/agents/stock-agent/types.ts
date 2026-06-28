/**
 * Stock Agent — types (Investment Hub Phase 1).
 *
 * Structured Investment Insights produced by reasoning over normalized market
 * data. The Stock Agent never recommends buy/sell, never predicts prices, and
 * every conclusion references supplied data. This is research, not advice.
 */

export type InvestmentInsights = {
  ticker: string;
  company: string;
  exchange: string;
  sector: string;
  industry: string;

  companySummary: string;
  businessQuality: string;
  economicMoat: string;
  financialHealth: string;
  growth: string;
  profitability: string;
  valuation: string;
  technicalOutlook: string;
  newsSummary: string;

  catalysts: string[];
  risks: string[];

  bullCase: string;
  bearCase: string;
  baseCase: string;
  investmentThesis: string;

  confidence: number;
  dataFreshness: string;
  suggestedHoldingPeriod: string;
  suggestedReviewDate: string;
  /** Agent Registry ids to hand off to (Hermes decides). */
  suggestedNextAgents: string[];

  mode: "ai" | "fallback";
  /** True when the underlying market data was mocked (tool not built yet). */
  fromMockData: boolean;
};
