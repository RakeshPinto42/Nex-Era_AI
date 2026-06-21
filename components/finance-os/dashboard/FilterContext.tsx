"use client";

// Cross-filtering + drill-through state shared by all dashboard widgets. A widget
// toggles a dimension value (e.g. click a region bar) and every other widget
// re-filters. Selections are plain {dimension: values[]} so they serialize into
// a saved workspace.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type FilterState = Record<string, string[]>;

type Ctx = {
  filters: FilterState;
  toggle: (dim: string, value: string) => void;
  clear: (dim?: string) => void;
  setAll: (f: FilterState) => void;
  isActive: (dim: string, value: string) => boolean;
  /** Keep rows whose dimension values match every active selection. */
  apply: <T extends Record<string, unknown>>(rows: T[]) => T[];
};

const FilterCtx = createContext<Ctx | null>(null);

export function FilterProvider({
  children,
  value,
  onChange,
}: {
  children: ReactNode;
  value?: FilterState;
  onChange?: (f: FilterState) => void;
}) {
  const [internal, setInternal] = useState<FilterState>(value ?? {});
  const filters = value ?? internal;

  const commit = useCallback(
    (next: FilterState) => {
      setInternal(next);
      onChange?.(next);
    },
    [onChange],
  );

  const toggle = useCallback(
    (dim: string, val: string) => {
      const cur = filters[dim] ?? [];
      const next = cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
      const out = { ...filters, [dim]: next };
      if (!next.length) delete out[dim];
      commit(out);
    },
    [filters, commit],
  );

  const clear = useCallback(
    (dim?: string) => {
      if (!dim) return commit({});
      const out = { ...filters };
      delete out[dim];
      commit(out);
    },
    [filters, commit],
  );

  const isActive = useCallback(
    (dim: string, val: string) => (filters[dim] ?? []).includes(val),
    [filters],
  );

  const apply = useCallback(
    <T extends Record<string, unknown>>(rows: T[]): T[] => {
      const dims = Object.keys(filters).filter((d) => filters[d]?.length);
      if (!dims.length) return rows;
      return rows.filter((r) => dims.every((d) => filters[d].includes(String(r[d] ?? ""))));
    },
    [filters],
  );

  const ctx = useMemo<Ctx>(
    () => ({ filters, toggle, clear, setAll: commit, isActive, apply }),
    [filters, toggle, clear, commit, isActive, apply],
  );

  return <FilterCtx.Provider value={ctx}>{children}</FilterCtx.Provider>;
}

export function useFilters(): Ctx {
  const ctx = useContext(FilterCtx);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
