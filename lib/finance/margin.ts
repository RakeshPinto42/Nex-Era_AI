// Margin / profitability analysis: gross profit + margin % per segment.
// Pure compute — runs in the browser.

import { toNum, type Table } from "./csv";

export type MarginRow = {
  segment: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number; // %
};

export type MarginResult = {
  rows: MarginRow[];
  totals: { revenue: number; cost: number; profit: number; margin: number };
};

export function computeMargin(
  table: Table,
  map: { segment: number; revenue: number; cost: number },
): MarginResult {
  // Aggregate revenue + cost per segment.
  const agg = new Map<string, { revenue: number; cost: number }>();
  for (const r of table.rows) {
    const seg = (r[map.segment] ?? "").trim() || "(unlabeled)";
    const rev = toNum(r[map.revenue]);
    const cost = toNum(r[map.cost]);
    if (!Number.isFinite(rev) && !Number.isFinite(cost)) continue;
    const cur = agg.get(seg) ?? { revenue: 0, cost: 0 };
    cur.revenue += Number.isFinite(rev) ? rev : 0;
    cur.cost += Number.isFinite(cost) ? cost : 0;
    agg.set(seg, cur);
  }

  const rows: MarginRow[] = [...agg.entries()]
    .map(([segment, { revenue, cost }]) => {
      const profit = revenue - cost;
      return {
        segment,
        revenue,
        cost,
        profit,
        margin: revenue ? (profit / revenue) * 100 : 0,
      };
    })
    .sort((a, b) => b.profit - a.profit);

  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  const profit = revenue - cost;
  return {
    rows,
    totals: { revenue, cost, profit, margin: revenue ? (profit / revenue) * 100 : 0 },
  };
}
