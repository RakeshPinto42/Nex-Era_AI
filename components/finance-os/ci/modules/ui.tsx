"use client";

// Small shared presentational pieces for CI sub-modules (dark command-center theme).

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/finance-os/ci/types";

export function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" | "brand" }) {
  const txt =
    tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : tone === "brand" ? "text-blue-300" : "text-fos-text";
  return (
    <div className="rounded-2xl border border-fos-border bg-fos-surface shadow-[var(--fos-shadow)] p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", txt)}>{value}</p>
    </div>
  );
}

export function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-fos-border bg-fos-surface shadow-[var(--fos-shadow)]">
      <div className="flex items-center justify-between border-b border-fos-border px-4 py-3">
        <p className="text-sm font-semibold text-fos-text">{title}</p>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const map: Record<RiskLevel, string> = {
    Low: "bg-emerald-500/15 text-emerald-300",
    Medium: "bg-amber-500/15 text-amber-300",
    High: "bg-rose-500/15 text-rose-300",
  };
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", map[risk])}>{risk}</span>;
}

export function Bar({ pct, color = "#3b82f6", width = 80 }: { pct: number; color?: string; width?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 overflow-hidden rounded bg-fos-surface2" style={{ width }}>
        <div className="h-full rounded" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
      </div>
      <span className="w-9 font-mono text-xs tabular-nums text-fos-text">{Math.round(pct)}%</span>
    </div>
  );
}
