"use client";

import { cn } from "@/lib/utils";

export type KpiTone = "neutral" | "good" | "bad" | "brand";

export function KpiCard({
  label,
  value,
  delta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: KpiTone;
}) {
  const valueTone =
    tone === "good"
      ? "text-emerald-600"
      : tone === "bad"
        ? "text-rose-600"
        : tone === "brand"
          ? "text-brand-600"
          : "text-fos-text";
  return (
    <div className="rounded-2xl border border-fos-border bg-fos-surface p-4 shadow-[var(--fos-shadow)] transition-shadow">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", valueTone)}>{value}</p>
      {delta && <p className="mt-0.5 text-xs text-fos-muted">{delta}</p>}
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}
