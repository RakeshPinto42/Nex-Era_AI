// Variance analysis: Actual vs Budget (or Plan vs Forecast) per line item.
// Pure compute — runs in the browser on the user's table.

import { toNum, type Table } from "./csv";

export type MetricKind = "revenue" | "cost";

export type VarianceRow = {
  label: string;
  actual: number;
  budget: number;
  variance: number; // actual - budget
  pct: number; // variance / |budget| * 100
  favorable: boolean;
};

export type VarianceResult = {
  rows: VarianceRow[];
  totals: { actual: number; budget: number; variance: number; pct: number };
  favorableCount: number;
  unfavorableCount: number;
};

export type VarianceMap = {
  label: number;
  actual: number;
  budget: number;
  kind: MetricKind; // revenue: higher is good; cost: lower is good
};

export function computeVariance(table: Table, map: VarianceMap): VarianceResult {
  const rows: VarianceRow[] = [];
  for (const r of table.rows) {
    const label = (r[map.label] ?? "").trim();
    const actual = toNum(r[map.actual]);
    const budget = toNum(r[map.budget]);
    if (!label && !Number.isFinite(actual) && !Number.isFinite(budget)) continue;
    const a = Number.isFinite(actual) ? actual : 0;
    const b = Number.isFinite(budget) ? budget : 0;
    const variance = a - b;
    const pct = b !== 0 ? (variance / Math.abs(b)) * 100 : a !== 0 ? 100 : 0;
    // Revenue: actual > budget = favorable. Cost: actual < budget = favorable.
    const favorable = map.kind === "revenue" ? variance >= 0 : variance <= 0;
    rows.push({ label, actual: a, budget: b, variance, pct, favorable });
  }

  const totA = rows.reduce((s, r) => s + r.actual, 0);
  const totB = rows.reduce((s, r) => s + r.budget, 0);
  const totV = totA - totB;
  const totals = {
    actual: totA,
    budget: totB,
    variance: totV,
    pct: totB !== 0 ? (totV / Math.abs(totB)) * 100 : 0,
  };

  return {
    rows,
    totals,
    favorableCount: rows.filter((r) => r.favorable).length,
    unfavorableCount: rows.filter((r) => !r.favorable).length,
  };
}
