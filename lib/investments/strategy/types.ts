/**
 * Strategy Center — types (Investment Hub Phase 12).
 *
 * Strategies are the DECISION ENGINE: explicit, visible rules users create, test
 * and save. Not a broker, not auto-trading. Every condition is transparent data —
 * AI may explain a strategy but never adds hidden rules.
 */

export type StrategyFactor =
  | "Price"
  | "Valuation"
  | "Technical Signals"
  | "Financial Ratios"
  | "Growth"
  | "Quality"
  | "Risk"
  | "News Events"
  | "Portfolio Allocation"
  | "Time"
  | "Custom";

export const STRATEGY_FACTORS: StrategyFactor[] = [
  "Price",
  "Valuation",
  "Technical Signals",
  "Financial Ratios",
  "Growth",
  "Quality",
  "Risk",
  "News Events",
  "Portfolio Allocation",
  "Time",
  "Custom",
];

export type Operator = ">" | ">=" | "<" | "<=" | "=" | "between";
export const OPERATORS: Operator[] = [">", ">=", "<", "<=", "=", "between"];

export type ConditionKind = "entry" | "exit" | "risk";

export type Condition = {
  id: string;
  factor: StrategyFactor;
  /** Metric id from METRICS (or "custom" for a manual, non-evaluated rule). */
  metric: string;
  operator: Operator;
  value: number;
  value2?: number; // for "between"
  note?: string;
};

export type ReviewFrequency = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
export const REVIEW_FREQUENCIES: ReviewFrequency[] = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"];

export type StrategyTemplateKey =
  | "Long Term Investing"
  | "Dividend Investing"
  | "ETF DCA"
  | "Value Investing"
  | "Growth Investing"
  | "Momentum"
  | "Swing Trading"
  | "Breakout"
  | "Mean Reversion"
  | "Custom";

export const STRATEGY_TEMPLATE_KEYS: StrategyTemplateKey[] = [
  "Long Term Investing",
  "Dividend Investing",
  "ETF DCA",
  "Value Investing",
  "Growth Investing",
  "Momentum",
  "Swing Trading",
  "Breakout",
  "Mean Reversion",
  "Custom",
];

export type Strategy = {
  id: string;
  name: string;
  description: string;
  template: StrategyTemplateKey;
  entryConditions: Condition[];
  exitConditions: Condition[];
  riskRules: Condition[];
  positionSizePct: number;
  maxAllocationPct: number;
  reviewFrequency: ReviewFrequency;
  /** 0..1 — minimum fraction of entry conditions that must pass to signal. */
  confidenceThreshold: number;
  createdAt: string;
  updatedAt: string;
};

/** Metric catalog — what each factor can evaluate against normalized market data. */
export type MetricDef = {
  metric: string;
  label: string;
  factor: StrategyFactor;
  unit?: string;
  /** Resolvable against market data, or a manual check (Custom/Portfolio/Time). */
  manual?: boolean;
};

export const METRICS: MetricDef[] = [
  { metric: "price", label: "Price", factor: "Price" },
  { metric: "changePct", label: "Daily change %", factor: "Price", unit: "%" },
  { metric: "marketCap", label: "Market cap", factor: "Price", unit: "$" },

  { metric: "peRatio", label: "P/E ratio", factor: "Valuation" },
  { metric: "pegRatio", label: "PEG ratio", factor: "Valuation" },
  { metric: "priceToSales", label: "Price/Sales", factor: "Valuation" },
  { metric: "evToEbitda", label: "EV/EBITDA", factor: "Valuation" },

  { metric: "rsi14", label: "RSI(14)", factor: "Technical Signals" },
  { metric: "priceVsSma200Pct", label: "Price vs 200-day SMA", factor: "Technical Signals", unit: "%" },
  { metric: "w52PositionPct", label: "52-week range position", factor: "Technical Signals", unit: "%" },

  { metric: "debtToEquity", label: "Debt / Equity", factor: "Financial Ratios" },
  { metric: "grossMarginPct", label: "Gross margin", factor: "Financial Ratios", unit: "%" },
  { metric: "netMarginPct", label: "Net margin", factor: "Financial Ratios", unit: "%" },

  { metric: "revenueGrowthPct", label: "Revenue growth", factor: "Growth", unit: "%" },
  { metric: "revenueCagr3yPct", label: "Revenue 3y CAGR", factor: "Growth", unit: "%" },
  { metric: "epsGrowthPct", label: "EPS growth", factor: "Growth", unit: "%" },

  { metric: "grossMarginQuality", label: "Gross margin (quality)", factor: "Quality", unit: "%" },
  { metric: "netMarginQuality", label: "Net margin (quality)", factor: "Quality", unit: "%" },

  { metric: "rsiRisk", label: "RSI overbought guard", factor: "Risk" },
  { metric: "debtRisk", label: "Leverage guard (D/E)", factor: "Risk" },

  { metric: "positiveNews", label: "Positive headlines", factor: "News Events", unit: "count" },
  { metric: "negativeNews", label: "Negative headlines", factor: "News Events", unit: "count" },

  { metric: "maxAllocation", label: "Max allocation", factor: "Portfolio Allocation", unit: "%", manual: true },
  { metric: "holdingPeriodDays", label: "Holding period", factor: "Time", unit: "days", manual: true },
  { metric: "custom", label: "Custom rule (manual)", factor: "Custom", manual: true },
];

export function metricsForFactor(factor: StrategyFactor): MetricDef[] {
  return METRICS.filter((m) => m.factor === factor);
}
export function metricDef(metric: string): MetricDef | undefined {
  return METRICS.find((m) => m.metric === metric);
}
