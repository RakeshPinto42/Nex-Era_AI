// Customer Profitability — rank customers by true profit after direct, support
// and account costs. Pure, browser-only.

import { toNum, type Table } from "@/lib/finance/csv";
import type { ColumnMapping } from "./types";

export type ProfitRow = {
  customer: string;
  revenue: number;
  directCost: number;
  supportCost: number;
  accountCost: number;
  profit: number;
  marginPct: number;
  revenueSharePct: number;
};

export type ProfitMapping = ColumnMapping; // customer, revenue, directCost?, supportCost?, accountCost?

export type ProfitResult = {
  rows: ProfitRow[];
  totals: { revenue: number; cost: number; profit: number; marginPct: number };
  lossMakers: ProfitRow[];
};

const cell = (r: string[], i: number | undefined) => (i == null || i < 0 ? "" : r[i] ?? "");
const n = (r: string[], i: number | undefined) => {
  const v = toNum(cell(r, i));
  return Number.isFinite(v) ? v : 0;
};

export function computeProfitability(table: Table, m: ProfitMapping): ProfitResult {
  const byCust = new Map<string, ProfitRow>();
  for (const r of table.rows) {
    const customer = cell(r, m.customer).trim() || "(unnamed)";
    const cur =
      byCust.get(customer) ??
      ({ customer, revenue: 0, directCost: 0, supportCost: 0, accountCost: 0, profit: 0, marginPct: 0, revenueSharePct: 0 } as ProfitRow);
    cur.revenue += n(r, m.revenue);
    cur.directCost += n(r, m.directCost);
    cur.supportCost += n(r, m.supportCost);
    cur.accountCost += n(r, m.accountCost);
    byCust.set(customer, cur);
  }

  const rows = [...byCust.values()].map((c) => {
    const cost = c.directCost + c.supportCost + c.accountCost;
    c.profit = c.revenue - cost;
    c.marginPct = c.revenue ? (c.profit / c.revenue) * 100 : 0;
    return c;
  });

  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
  rows.forEach((r) => (r.revenueSharePct = totalRev ? (r.revenue / totalRev) * 100 : 0));
  rows.sort((a, b) => b.profit - a.profit);

  const cost = rows.reduce((s, r) => s + r.directCost + r.supportCost + r.accountCost, 0);
  const profit = totalRev - cost;
  return {
    rows,
    totals: { revenue: totalRev, cost, profit, marginPct: totalRev ? (profit / totalRev) * 100 : 0 },
    lossMakers: rows.filter((r) => r.profit < 0),
  };
}
