"use client";

import { cn } from "@/lib/utils";

// Compact ranked bar list (Top/Bottom performers, concentration). Reuses the
// look of components/finance/shared BarList but typed for dashboard use.

export function RankingTable({
  title,
  items,
  positiveOnly = false,
}: {
  title: string;
  items: { label: string; value: number; display: string }[];
  positiveOnly?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <div className="rounded-xl border border-fos-border bg-fos-surface p-4">
      <p className="mb-3 text-sm font-semibold text-fos-text">{title}</p>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-xs text-fos-muted">No data.</p>}
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-36 flex-none truncate text-sm text-fos-text" title={it.label}>
              {it.label}
            </span>
            <div className="relative h-5 flex-1 overflow-hidden rounded bg-fos-surface2">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded",
                  positiveOnly || it.value >= 0 ? "bg-brand-600" : "bg-rose-500",
                )}
                style={{ width: `${(Math.abs(it.value) / max) * 100}%` }}
              />
            </div>
            <span className="w-24 flex-none text-right font-mono text-xs tabular-nums text-fos-text">
              {it.display}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
