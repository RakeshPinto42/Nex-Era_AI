"use client";

// Slicer bar: one dropdown-style chip group per dimension. Drives cross-filtering
// through FilterContext. Dimensions/values are derived from the data by the host.

import { cn } from "@/lib/utils";
import { useFilters } from "./FilterContext";

export type Slicer = { dim: string; label: string; values: string[] };

export function Filters({ slicers }: { slicers: Slicer[] }) {
  const { isActive, toggle, clear, filters } = useFilters();
  const anyActive = Object.values(filters).some((v) => v.length);

  return (
    <div className="flex flex-wrap items-start gap-4 rounded-xl border border-fos-border bg-fos-surface p-3">
      {slicers
        .filter((s) => s.values.length > 1)
        .map((s) => (
          <div key={s.dim} className="min-w-0">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-fos-muted">{s.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {s.values.map((v) => (
                <button
                  key={v}
                  onClick={() => toggle(s.dim, v)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    isActive(s.dim, v)
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-fos-border text-fos-muted hover:bg-fos-surface2 hover:text-fos-text",
                  )}
                >
                  {v || "—"}
                </button>
              ))}
            </div>
          </div>
        ))}
      {anyActive && (
        <button
          onClick={() => clear()}
          className="ml-auto self-end rounded-lg border border-fos-border px-2.5 py-1 text-xs text-fos-muted hover:text-fos-text"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/** Build slicers from rows by reading distinct values of given dimensions. */
export function slicersFromRows<T extends Record<string, unknown>>(
  rows: T[],
  dims: { dim: keyof T & string; label: string }[],
): Slicer[] {
  return dims.map(({ dim, label }) => ({
    dim,
    label,
    values: [...new Set(rows.map((r) => String(r[dim] ?? "")).filter(Boolean))].sort(),
  }));
}
