// Rule-driven data validation. Each rule is a pure function over a Table that
// returns zero or more Exceptions. Reused by every Finance OS module.

import { toNum, type Table } from "@/lib/finance/csv";
import { uid } from "@/lib/utils";

export type Severity = "error" | "warning" | "info";

export type Exception = {
  id: string;
  rule: string;
  severity: Severity;
  message: string;
  row?: number; // 0-based data row (excludes header)
  column?: string;
  value?: string;
};

export type ValidationRule = (table: Table) => Exception[];

const ex = (
  rule: string,
  severity: Severity,
  message: string,
  extra: Partial<Exception> = {},
): Exception => ({ id: uid("ex"), rule, severity, message, ...extra });

const colIndex = (table: Table, name: string) => table.columns.indexOf(name);

/** Flag empty cells in the given columns. */
export function missingValues(columns: string[], severity: Severity = "error"): ValidationRule {
  return (table) => {
    const out: Exception[] = [];
    for (const name of columns) {
      const ci = colIndex(table, name);
      if (ci < 0) continue;
      table.rows.forEach((r, i) => {
        if (!r[ci] || !r[ci].trim()) {
          out.push(ex("missing-value", severity, `Missing ${name}`, { row: i, column: name }));
        }
      });
    }
    return out;
  };
}

/** Flag duplicate rows by a composite key of the given columns. */
export function duplicates(keyColumns: string[], severity: Severity = "warning"): ValidationRule {
  return (table) => {
    const idxs = keyColumns.map((c) => colIndex(table, c)).filter((i) => i >= 0);
    if (!idxs.length) return [];
    const seen = new Map<string, number>();
    const out: Exception[] = [];
    table.rows.forEach((r, i) => {
      const key = idxs.map((ci) => (r[ci] ?? "").trim().toLowerCase()).join("");
      if (seen.has(key)) {
        out.push(
          ex("duplicate", severity, `Duplicate of row ${seen.get(key)! + 1} on ${keyColumns.join(" + ")}`, {
            row: i,
          }),
        );
      } else seen.set(key, i);
    });
    return out;
  };
}

/** Flag rows whose value in `column` is not in the allowed set (e.g. unknown rep). */
export function foreignRef(
  column: string,
  allowed: Set<string>,
  label = "reference",
  severity: Severity = "error",
): ValidationRule {
  return (table) => {
    const ci = colIndex(table, column);
    if (ci < 0) return [];
    const norm = new Set([...allowed].map((v) => v.trim().toLowerCase()));
    const out: Exception[] = [];
    table.rows.forEach((r, i) => {
      const v = (r[ci] ?? "").trim();
      if (v && !norm.has(v.toLowerCase())) {
        out.push(ex("foreign-ref", severity, `Unknown ${label}: "${v}"`, { row: i, column, value: v }));
      }
    });
    return out;
  };
}

/** Flag negative numbers in the given columns. */
export function nonNegative(columns: string[], severity: Severity = "warning"): ValidationRule {
  return (table) => {
    const out: Exception[] = [];
    for (const name of columns) {
      const ci = colIndex(table, name);
      if (ci < 0) continue;
      table.rows.forEach((r, i) => {
        const n = toNum(r[ci]);
        if (Number.isFinite(n) && n < 0) {
          out.push(ex("negative", severity, `Negative ${name}: ${r[ci]}`, { row: i, column: name, value: r[ci] }));
        }
      });
    }
    return out;
  };
}

/** Flag cells in the given columns that should be numeric but don't parse. */
export function numericColumns(columns: string[], severity: Severity = "error"): ValidationRule {
  return (table) => {
    const out: Exception[] = [];
    for (const name of columns) {
      const ci = colIndex(table, name);
      if (ci < 0) continue;
      table.rows.forEach((r, i) => {
        const raw = r[ci];
        if (raw && raw.trim() && !Number.isFinite(toNum(raw))) {
          out.push(ex("not-numeric", severity, `${name} is not a number: "${raw}"`, { row: i, column: name, value: raw }));
        }
      });
    }
    return out;
  };
}

/** Run a set of rules over a table and flatten the results. */
export function runValidation(table: Table, rules: ValidationRule[]): Exception[] {
  return rules.flatMap((r) => r(table));
}

export function countBySeverity(exceptions: Exception[]): Record<Severity, number> {
  const out: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const e of exceptions) out[e.severity]++;
  return out;
}
