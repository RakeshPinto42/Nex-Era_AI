"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Progress primitives — NexProgress (linear), NexRing (circular), NexSteps.
 * All use the neon gradient fill with a soft glow to read as "energy", not a
 * dull loading bar.
 */

export function NexProgress({
  value,
  max = 100,
  label,
  showValue,
  indeterminate,
  className,
}: {
  value?: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  indeterminate?: boolean;
  className?: string;
}) {
  const pct = indeterminate ? 40 : Math.max(0, Math.min(100, ((value ?? 0) / max) * 100));
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-2 flex items-center justify-between text-[var(--nex-text-sm)]">
          {label && <span className="text-[var(--nex-text-muted)]">{label}</span>}
          {showValue && !indeterminate && <span className="text-[var(--nex-text)] tabular-nums">{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--nex-glass-faint)] border border-[var(--nex-border)]"
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#f2761c,#f2761c,#fb8c6a)] shadow-[0_0_16px_rgba(242,118,28,0.6)] transition-[width] duration-[var(--nex-dur-slow)] ease-[cubic-bezier(0.22,1,0.36,1)]",
            indeterminate && "animate-[nex-shimmer_1.4s_linear_infinite] [background-size:200%_100%]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Circular progress ring with neon gradient stroke. */
export function NexRing({
  value = 0,
  size = 96,
  stroke = 8,
  label,
  className,
}: {
  value?: number;
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  const id = React.useId();
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f2761c" />
            <stop offset="50%" stopColor="#f2761c" />
            <stop offset="100%" stopColor="#fb8c6a" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--nex-border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset var(--nex-dur-slow) var(--nex-ease)", filter: "drop-shadow(0 0 6px rgba(242,118,28,0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {label ?? <span className="nex-display text-[var(--nex-text-xl)] tabular-nums">{Math.round(pct)}%</span>}
      </div>
    </div>
  );
}

/** Step / progress tracker. */
export function NexSteps({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <ol className={cn("flex items-center gap-2", className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-[var(--nex-text-xs)] font-semibold border transition-all duration-[var(--nex-dur-base)]",
                  done && "bg-[linear-gradient(120deg,#f2761c,#fb8c6a)] text-white border-transparent",
                  active && "border-[var(--nex-border-glow)] text-[var(--nex-text)] shadow-[var(--nex-glow-purple)]",
                  !done && !active && "border-[var(--nex-border)] text-[var(--nex-text-faint)]",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={cn("text-[var(--nex-text-sm)]", active ? "text-[var(--nex-text)]" : "text-[var(--nex-text-faint)]")}>{s}</span>
            </div>
            {i < steps.length - 1 && <span className={cn("h-px w-8", done ? "bg-[var(--nex-accent-3)]" : "bg-[var(--nex-border)]")} />}
          </li>
        );
      })}
    </ol>
  );
}
