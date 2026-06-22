"use client";

// Maps canonical fields to dataset columns. Auto-maps on first render via header
// synonyms; user can override. Flags unmapped required fields.

import { useEffect } from "react";
import type { Table } from "@/lib/finance/csv";
import { autoMap } from "@/lib/finance-os/mapping";
import type { ColumnMapping, FieldSpec } from "@/lib/finance-os/types";

export function ColumnMapper({
  table,
  fields,
  value,
  onChange,
}: {
  table: Table;
  fields: FieldSpec[];
  value: ColumnMapping | null;
  onChange: (m: ColumnMapping) => void;
}) {
  // Auto-map once when a table arrives and nothing is mapped yet.
  useEffect(() => {
    if (!value && table.columns.length) onChange(autoMap(table, fields));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const map = value ?? {};
  const set = (key: string, idx: number) => onChange({ ...map, [key]: idx });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fields.map((f) => {
        const missing = f.required && (map[f.key] == null || map[f.key] < 0);
        return (
          <label key={f.key} className="block">
            <span className="mb-1 block text-xs font-medium text-fos-text">
              {f.label}
              {f.required && <span className="text-rose-500"> *</span>}
            </span>
            <select
              value={map[f.key] ?? -1}
              onChange={(e) => set(f.key, Number(e.target.value))}
              className={`w-full cursor-pointer rounded-lg border bg-fos-surface2 px-2.5 py-2 text-sm text-fos-text outline-none focus:border-brand-600/40 ${
                missing ? "border-rose-400" : "border-fos-border"
              }`}
            >
              <option value={-1}>— none —</option>
              {table.columns.map((c, i) => (
                <option key={i} value={i}>
                  {c || `Column ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}
