// Column auto-mapping by header synonyms, with manual override. The resulting
// ColumnMapping can be saved as a reusable template (lib/finance-os/db.ts).

import { isNumericColumn, type Table } from "@/lib/finance/csv";
import type { ColumnMapping, FieldSpec } from "./types";

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Guess a column index for each field from header synonyms. Numeric fields
 * prefer columns that actually parse as numbers. Returns -1 for no match.
 */
export function autoMap(table: Table, fields: FieldSpec[]): ColumnMapping {
  const heads = table.columns.map(normalize);
  const used = new Set<number>();
  const map: ColumnMapping = {};

  for (const f of fields) {
    const wants = [f.key, f.label, ...f.synonyms].map(normalize);
    let best = -1;

    // exact header match first, then substring, skipping already-claimed cols
    for (const pass of ["exact", "partial"] as const) {
      for (let i = 0; i < heads.length; i++) {
        if (used.has(i)) continue;
        const h = heads[i];
        const hit =
          pass === "exact"
            ? wants.includes(h)
            : wants.some((w) => w.length >= 3 && (h.includes(w) || w.includes(h)));
        if (hit && (!f.numeric || isNumericColumn(table, i))) {
          best = i;
          break;
        }
      }
      if (best >= 0) break;
    }

    map[f.key] = best;
    if (best >= 0) used.add(best);
  }
  return map;
}

/** Fields that are required but left unmapped. */
export function unmappedRequired(fields: FieldSpec[], map: ColumnMapping): FieldSpec[] {
  return fields.filter((f) => f.required && (map[f.key] == null || map[f.key] < 0));
}
