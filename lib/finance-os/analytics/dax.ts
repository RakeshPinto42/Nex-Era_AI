// Analytics Studio — DAX generation + plain-English explanation. Deterministic
// templates (always correct, instant, offline). The Power BI tutor / AI may
// enrich the explanation, but the measure itself is generated here.

import type { Agg, Kpi } from "./types";

export function daxMeasure(label: string, table: string, column: string, agg: Agg, num?: string, den?: string): string {
  const t = `'${table}'`;
  switch (agg) {
    case "sum":      return `${label} = SUM(${t}[${column}])`;
    case "avg":      return `${label} = AVERAGE(${t}[${column}])`;
    case "count":    return `${label} = COUNTROWS(${t})`;
    case "distinct": return `${label} = DISTINCTCOUNT(${t}[${column}])`;
    case "ratio":    return `${label} = DIVIDE([${num}], [${den}])`;
  }
}

export function explainMeasure(label: string, table: string, column: string, agg: Agg, num?: string, den?: string): string {
  switch (agg) {
    case "sum":      return `“${label}” totals every value in ${table}[${column}]. SUM ignores blanks and respects whatever filters the report is sliced by (date, region, product…), so the same measure works on a card, a trend line and a breakdown without rewriting it.`;
    case "avg":      return `“${label}” is the arithmetic mean of ${table}[${column}] over the rows in the current filter context. Use it for rates and per-unit metrics, not for additive totals.`;
    case "count":    return `“${label}” counts the rows of ${table} in context with COUNTROWS — i.e. the number of records (transactions, deals, payees) currently in view.`;
    case "distinct": return `“${label}” counts the unique values of ${table}[${column}] with DISTINCTCOUNT — e.g. how many distinct customers or products are represented.`;
    case "ratio":    return `“${label}” divides [${num}] by [${den}] with DIVIDE, which safely returns blank instead of an error when the denominator is zero. Because it references other measures, it re-evaluates correctly at every level of the report.`;
  }
}

export function withDax(kpi: Omit<Kpi, "dax" | "explain">): Kpi {
  return {
    ...kpi,
    dax: daxMeasure(kpi.label, kpi.table, kpi.column, kpi.agg, kpi.num, kpi.den),
    explain: explainMeasure(kpi.label, kpi.table, kpi.column, kpi.agg, kpi.num, kpi.den),
  };
}
