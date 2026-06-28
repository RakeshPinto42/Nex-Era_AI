/**
 * Finance Agent — types (Phase 5).
 *
 * The FP&A intelligence layer for Finance OS. Reasons over structured financial
 * information (extracted Excel/CSV/statements) and prepares structured insights
 * other agents consume. It AUGMENTS Finance OS — no forecasting/budgeting
 * engine, no ledger, no accounting logic, no calculations beyond high-level
 * analysis.
 */

export type KpiRecommendation = {
  name: string;
  rationale: string;
};

export type VarianceDriver = {
  driver: string;
  impact: string;
  direction: "up" | "down" | "flat";
};

/** Structured analysis downstream agents (Commentary, Analytics/Power BI) consume. */
export type FinanceInsights = {
  financialSummary: string;
  detectedMetrics: string[];
  trends: string[];
  anomalies: string[];
  varianceDrivers: VarianceDriver[];
  kpiRecommendations: KpiRecommendation[];
  suggestedCommentary: string;
  suggestedDashboard: string;
  /** Agent Registry ids to hand off to (Hermes decides). */
  suggestedNextAgents: string[];
  confidence: number;
  /** Whether reasoning came from the AI Router or the deterministic fallback. */
  mode: "ai" | "fallback";
  sources: string[];
};
