/**
 * Strategy Center — deterministic evaluation (Phase 12).
 *
 * Evaluates a strategy's explicit conditions against normalized market data
 * (from the Market Intelligence Tool, via the Investment Intelligence Agent).
 * Pure rule logic — no hidden behavior, no AI. Manual factors (Custom /
 * Portfolio Allocation / Time) are surfaced as manual checks, never auto-passed.
 */

import type { NormalizedMarketData } from "@/lib/agents/stock-agent/market-data";
import type { Condition, Strategy, Operator } from "./types";
import { metricDef } from "./types";

function resolve(metric: string, d: NormalizedMarketData): number | null {
  switch (metric) {
    case "price": return d.price;
    case "changePct": return d.changePct;
    case "marketCap": return d.marketCap;
    case "peRatio": return d.valuation.peRatio;
    case "pegRatio": return d.valuation.pegRatio;
    case "priceToSales": return d.valuation.priceToSales;
    case "evToEbitda": return d.valuation.evToEbitda;
    case "rsi14":
    case "rsiRisk": return d.technicals.rsi14;
    case "priceVsSma200Pct":
      return d.technicals.sma200 ? +(((d.price - d.technicals.sma200) / d.technicals.sma200) * 100).toFixed(2) : null;
    case "w52PositionPct": {
      const { high52w, low52w } = d.technicals;
      return high52w > low52w ? +(((d.price - low52w) / (high52w - low52w)) * 100).toFixed(1) : null;
    }
    case "debtToEquity":
    case "debtRisk": return d.financials.debtToEquity;
    case "grossMarginPct":
    case "grossMarginQuality": return d.financials.grossMarginPct;
    case "netMarginPct":
    case "netMarginQuality": return d.financials.netMarginPct;
    case "revenueGrowthPct": return d.financials.revenueGrowthPct;
    case "revenueCagr3yPct": return d.growth.revenueCagr3yPct;
    case "epsGrowthPct": return d.growth.epsGrowthPct;
    case "positiveNews": return d.news.filter((n) => n.sentiment === "positive").length;
    case "negativeNews": return d.news.filter((n) => n.sentiment === "negative").length;
    default: return null; // manual metrics
  }
}

function compare(actual: number, op: Operator, value: number, value2?: number): boolean {
  switch (op) {
    case ">": return actual > value;
    case ">=": return actual >= value;
    case "<": return actual < value;
    case "<=": return actual <= value;
    case "=": return actual === value;
    case "between": return value2 != null ? actual >= Math.min(value, value2) && actual <= Math.max(value, value2) : false;
    default: return false;
  }
}

export type ConditionResult = {
  condition: Condition;
  actual: number | null;
  pass: boolean | null; // null = manual / unresolved
  manual: boolean;
};

export type StrategyEvaluation = {
  ticker: string;
  company: string;
  entry: ConditionResult[];
  exit: ConditionResult[];
  risk: ConditionResult[];
  entryMet: boolean;
  exitMet: boolean;
  riskOk: boolean;
  passedEntry: number;
  evaluableEntry: number;
  confidence: number;
  meetsThreshold: boolean;
  signal: "Entry" | "Exit" | "No action";
  dataFreshness: string;
  fromMockData: boolean;
};

function evalList(conds: Condition[], d: NormalizedMarketData): ConditionResult[] {
  return conds.map((condition) => {
    const manual = metricDef(condition.metric)?.manual ?? false;
    const actual = manual ? null : resolve(condition.metric, d);
    const pass = actual == null ? null : compare(actual, condition.operator, condition.value, condition.value2);
    return { condition, actual, pass, manual: manual || actual == null };
  });
}

export function evaluateStrategy(strategy: Strategy, d: NormalizedMarketData): StrategyEvaluation {
  const entry = evalList(strategy.entryConditions, d);
  const exit = evalList(strategy.exitConditions, d);
  const risk = evalList(strategy.riskRules, d);

  const evaluable = entry.filter((r) => r.pass != null);
  const passedEntry = evaluable.filter((r) => r.pass).length;
  const evaluableEntry = evaluable.length;
  const entryMet = evaluableEntry > 0 && passedEntry === evaluableEntry;
  const exitMet = exit.some((r) => r.pass === true);
  const riskOk = risk.filter((r) => r.pass != null).every((r) => r.pass);
  const confidence = evaluableEntry ? passedEntry / evaluableEntry : 0;
  const meetsThreshold = confidence >= strategy.confidenceThreshold;

  const signal: StrategyEvaluation["signal"] = exitMet
    ? "Exit"
    : entryMet && meetsThreshold && riskOk
      ? "Entry"
      : "No action";

  return {
    ticker: d.ticker,
    company: d.company,
    entry,
    exit,
    risk,
    entryMet,
    exitMet,
    riskOk,
    passedEntry,
    evaluableEntry,
    confidence,
    meetsThreshold,
    signal,
    dataFreshness: `${d.freshness} · ${d.provider ?? "—"}${d.isMock ? " · MOCK" : ""}`,
    fromMockData: d.isMock,
  };
}
