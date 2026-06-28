/**
 * Portfolio Intelligence — types.
 *
 * An AI portfolio ANALYSIS workspace (not a broker, not trading). Reuses the
 * Market Intelligence Tool (prices/factors), Opportunity Engine (missed opps)
 * and AI Router (the "why"). No duplicate logic.
 */

export type Holding = {
  ticker: string;
  quantity: number;
  avgCost?: number; // optional → enables total P&L
};

export type HoldingRow = {
  ticker: string;
  company: string;
  sector: string;
  country: string;
  assetClass: "Stock" | "ETF" | "Crypto";
  quantity: number;
  price: number;
  currency: string;
  changePct: number;
  marketValue: number;
  weightPct: number;
  todayPnl: number;
  totalPnl: number | null; // null when avgCost unknown
  valuationZone: "Undervalued" | "Fair Value" | "Rich" | "Unknown";
  drawdownFrom52wHighPct: number;
};

export type Allocation = { label: string; pct: number; value: number };

export type AISuggestion = { title: string; why: string; severity: "info" | "warn" | "high" };

export type MissedOpportunity = { ticker: string; company: string; conviction: number; reason: string };

export type PortfolioAnalysis = {
  asOf: string;
  holdings: HoldingRow[];
  portfolioValue: number;
  todayPnl: number;
  todayPnlPct: number;
  totalPnl: number | null;
  sectorAllocation: Allocation[];
  countryAllocation: Allocation[];
  assetAllocation: Allocation[];
  estimatedDividendIncome: number;
  volatilityPct: number;
  diversificationScore: number; // 0..100
  riskScore: number; // 0..100 (higher = riskier)
  maxDrawdownPct: number;
  concentrationRisk: { topTicker: string; topWeightPct: number; flagged: boolean };
  overvalued: string[];
  undervalued: string[];
  missedOpportunities: MissedOpportunity[];
  watchlistCorrelation: { sharedSectors: string[]; note: string };
  suggestions: AISuggestion[];
  explanation: string;
  explanationMode: "ai" | "deterministic";
  mockData: boolean;
};
