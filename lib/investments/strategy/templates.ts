/**
 * Strategy Center — templates (Phase 12).
 *
 * Ten starting points. Each seeds explicit, visible conditions the user can edit.
 * No hidden rules.
 */

import type {
  Strategy,
  Condition,
  StrategyFactor,
  Operator,
  StrategyTemplateKey,
  ReviewFrequency,
} from "./types";

let seq = 0;
const cid = () => `c-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function c(factor: StrategyFactor, metric: string, operator: Operator, value: number, value2?: number, note?: string): Condition {
  return { id: cid(), factor, metric, operator, value, value2, note };
}

type TemplateDef = {
  description: string;
  entry: Condition[];
  exit: Condition[];
  risk: Condition[];
  positionSizePct: number;
  maxAllocationPct: number;
  reviewFrequency: ReviewFrequency;
  confidenceThreshold: number;
};

const DEFS: Record<StrategyTemplateKey, TemplateDef> = {
  "Long Term Investing": {
    description: "Buy quality businesses and hold for years; review periodically.",
    entry: [c("Quality", "netMarginQuality", ">=", 10), c("Financial Ratios", "debtToEquity", "<=", 1.5)],
    exit: [c("Valuation", "peRatio", ">", 40)],
    risk: [c("Risk", "debtRisk", "<=", 2)],
    positionSizePct: 5, maxAllocationPct: 25, reviewFrequency: "Quarterly", confidenceThreshold: 0.6,
  },
  "Dividend Investing": {
    description: "Stable, cash-generative names held for income.",
    entry: [c("Quality", "netMarginQuality", ">=", 8), c("Financial Ratios", "debtToEquity", "<=", 1.2)],
    exit: [c("Financial Ratios", "netMarginPct", "<", 3)],
    risk: [c("Risk", "debtRisk", "<=", 1.5)],
    positionSizePct: 4, maxAllocationPct: 20, reviewFrequency: "Quarterly", confidenceThreshold: 0.6,
  },
  "ETF DCA": {
    description: "Dollar-cost average a diversified ETF on a fixed schedule.",
    entry: [c("Time", "holdingPeriodDays", ">=", 365, undefined, "Recurring contribution regardless of price")],
    exit: [],
    risk: [c("Portfolio Allocation", "maxAllocation", "<=", 60)],
    positionSizePct: 10, maxAllocationPct: 60, reviewFrequency: "Monthly", confidenceThreshold: 0.5,
  },
  "Value Investing": {
    description: "Buy below intrinsic value; sell as the gap closes.",
    entry: [c("Valuation", "peRatio", "<", 15), c("Valuation", "priceToSales", "<", 2)],
    exit: [c("Valuation", "peRatio", ">", 25)],
    risk: [c("Financial Ratios", "debtToEquity", "<=", 1.5)],
    positionSizePct: 6, maxAllocationPct: 20, reviewFrequency: "Quarterly", confidenceThreshold: 0.66,
  },
  "Growth Investing": {
    description: "Own fast growers; tolerate richer multiples.",
    entry: [c("Growth", "revenueGrowthPct", ">=", 20), c("Growth", "epsGrowthPct", ">=", 15)],
    exit: [c("Growth", "revenueGrowthPct", "<", 10)],
    risk: [c("Risk", "rsiRisk", "<=", 80)],
    positionSizePct: 5, maxAllocationPct: 18, reviewFrequency: "Monthly", confidenceThreshold: 0.6,
  },
  Momentum: {
    description: "Ride established uptrends; exit when momentum breaks.",
    entry: [c("Technical Signals", "priceVsSma200Pct", ">", 0), c("Technical Signals", "rsi14", "between", 50, 70)],
    exit: [c("Technical Signals", "priceVsSma200Pct", "<", 0)],
    risk: [c("Risk", "rsiRisk", "<=", 80)],
    positionSizePct: 4, maxAllocationPct: 15, reviewFrequency: "Weekly", confidenceThreshold: 0.66,
  },
  "Swing Trading": {
    description: "Capture multi-day swings within a range.",
    entry: [c("Technical Signals", "rsi14", "between", 40, 60), c("Technical Signals", "w52PositionPct", "<", 70)],
    exit: [c("Technical Signals", "rsi14", ">", 70)],
    risk: [c("Risk", "rsiRisk", "<=", 75)],
    positionSizePct: 3, maxAllocationPct: 12, reviewFrequency: "Daily", confidenceThreshold: 0.6,
  },
  Breakout: {
    description: "Enter as price clears the upper range with strength.",
    entry: [c("Technical Signals", "w52PositionPct", ">=", 90), c("Technical Signals", "priceVsSma200Pct", ">", 5)],
    exit: [c("Technical Signals", "priceVsSma200Pct", "<", 0)],
    risk: [c("Risk", "rsiRisk", "<=", 85)],
    positionSizePct: 3, maxAllocationPct: 10, reviewFrequency: "Daily", confidenceThreshold: 0.66,
  },
  "Mean Reversion": {
    description: "Buy oversold, exit toward the mean.",
    entry: [c("Technical Signals", "rsi14", "<", 30), c("Technical Signals", "w52PositionPct", "<", 25)],
    exit: [c("Technical Signals", "rsi14", ">", 55)],
    risk: [c("Financial Ratios", "debtToEquity", "<=", 2)],
    positionSizePct: 3, maxAllocationPct: 12, reviewFrequency: "Daily", confidenceThreshold: 0.6,
  },
  Custom: {
    description: "Start from scratch with your own visible rules.",
    entry: [],
    exit: [],
    risk: [],
    positionSizePct: 5, maxAllocationPct: 20, reviewFrequency: "Monthly", confidenceThreshold: 0.6,
  },
};

export const TEMPLATE_SUMMARIES: { key: StrategyTemplateKey; description: string }[] =
  (Object.keys(DEFS) as StrategyTemplateKey[]).map((key) => ({ key, description: DEFS[key].description }));

/** Build a fresh Strategy from a template. Fresh condition ids each time. */
export function strategyFromTemplate(key: StrategyTemplateKey): Strategy {
  const d = DEFS[key];
  const now = new Date().toISOString();
  const clone = (arr: Condition[]): Condition[] => arr.map((x) => ({ ...x, id: cid() }));
  return {
    id: `s-${Date.now().toString(36)}-${(seq++).toString(36)}`,
    name: key === "Custom" ? "New Strategy" : key,
    description: d.description,
    template: key,
    entryConditions: clone(d.entry),
    exitConditions: clone(d.exit),
    riskRules: clone(d.risk),
    positionSizePct: d.positionSizePct,
    maxAllocationPct: d.maxAllocationPct,
    reviewFrequency: d.reviewFrequency,
    confidenceThreshold: d.confidenceThreshold,
    createdAt: now,
    updatedAt: now,
  };
}

export function newConditionId(): string {
  return cid();
}
