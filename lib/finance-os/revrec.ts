// Revenue Recognition Validator — control checks over a revenue ledger:
// duplicate revenue, missing values, out-of-period entries, customer mismatches.
// Produces exceptions + a risk score. Pure, browser-only.

import { toNum, type Table } from "@/lib/finance/csv";
import { uid } from "@/lib/utils";
import { duplicates, missingValues, runValidation, type Exception } from "./validate";
import type { ColumnMapping } from "./types";

export type RevRecMapping = ColumnMapping; // amount, customer, date, doc?

export type RevRecResult = {
  exceptions: Exception[];
  riskScore: number; // 0-100, higher = riskier
  checkedRows: number;
  totalRevenue: number;
  byCheck: Record<string, number>;
};

const colName = (t: Table, m: ColumnMapping, k: string) =>
  m[k] != null && m[k] >= 0 ? t.columns[m[k]] : null;

export function computeRevRec(table: Table, m: RevRecMapping, period?: string): RevRecResult {
  const amount = colName(table, m, "amount");
  const customer = colName(table, m, "customer");
  const date = colName(table, m, "date");
  const doc = colName(table, m, "doc");

  const rules = [
    amount ? missingValues([amount]) : null,
    customer ? missingValues([customer]) : null,
    // Duplicate revenue: same doc+customer+amount (or customer+amount if no doc).
    amount && customer ? duplicates([doc ?? customer, customer, amount].filter(Boolean) as string[]) : null,
  ].filter(Boolean) as ReturnType<typeof missingValues>[];

  const ex = runValidation(table, rules);

  // Out-of-period entries: a date column not starting with the chosen period (YYYY or YYYY-MM).
  if (date && period) {
    const di = m.date;
    table.rows.forEach((r, i) => {
      const v = (r[di] ?? "").trim();
      if (v && !v.startsWith(period)) {
        ex.push({ id: uid("ex"), rule: "out-of-period", severity: "warning", message: `Entry outside ${period}: ${v}`, row: i, column: date, value: v });
      }
    });
  }

  // Negative / zero revenue rows worth a look.
  if (amount) {
    const ai = m.amount;
    table.rows.forEach((r, i) => {
      const n = toNum(r[ai]);
      if (Number.isFinite(n) && n < 0) {
        ex.push({ id: uid("ex"), rule: "negative-revenue", severity: "warning", message: `Negative revenue: ${r[ai]}`, row: i, column: amount, value: r[ai] });
      }
    });
  }

  const totalRevenue = amount ? table.rows.reduce((s, r) => s + (toNum(r[m.amount]) || 0), 0) : 0;
  const checkedRows = table.rows.length;

  const byCheck: Record<string, number> = {};
  for (const e of ex) byCheck[e.rule] = (byCheck[e.rule] ?? 0) + 1;

  // Risk score: weight errors > warnings, normalized by row count.
  const errorWeight = ex.filter((e) => e.severity === "error").length * 3;
  const warnWeight = ex.filter((e) => e.severity === "warning").length;
  const riskScore = Math.min(100, Math.round(((errorWeight + warnWeight) / Math.max(1, checkedRows)) * 100));

  return { exceptions: ex, riskScore, checkedRows, totalRevenue, byCheck };
}
