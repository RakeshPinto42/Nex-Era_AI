"use client";

/**
 * Command Center UI kit — chart wrappers.
 * Thin wrappers over recharts (already a dependency). Per the design decision,
 * data-viz keeps a multi-hue palette (blue/violet/green/amber) for legibility;
 * the warm accent is used only where a series represents the "primary" metric.
 */

import * as React from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const SERIES = {
  accent: "#f2761c",
  coral: "#fb8c6a",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  green: "#16a34a",
  red: "#ef4444",
  amber: "#f59e0b",
} as const;

export type SeriesColor = keyof typeof SERIES;

/** Loading placeholder for a chart slot — warm shimmer with a faint baseline. */
export function ChartSkeleton({ height = 56 }: { height?: number }) {
  return (
    <div className="skeleton w-full" style={{ height, borderRadius: 12 }} aria-hidden>
      <svg className="absolute inset-0 h-full w-full opacity-40" preserveAspectRatio="none" viewBox="0 0 100 40">
        <polyline points="0,30 18,22 34,26 52,12 70,18 86,8 100,14" fill="none" stroke="#e4d8c9" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

/** Compact legend — colored dots + labels, consistent with the chart palette. */
export function Legend({
  items,
  className,
}: {
  items: Array<{ label: React.ReactNode; color: SeriesColor | string }>;
  className?: string;
}) {
  return (
    <div className={["flex flex-wrap items-center gap-x-4 gap-y-1.5", className].filter(Boolean).join(" ")}>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-xs text-muted">
          <span
            className="h-2 w-2 flex-none rounded-full"
            style={{ background: (SERIES as Record<string, string>)[it.color as string] ?? (it.color as string) }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/** A compact filled sparkline — used inside widgets and stat tiles. */
export function Sparkline({
  data,
  dataKey = "v",
  color = "accent",
  height = 56,
  showAxis = false,
}: {
  data: Array<Record<string, number | string>>;
  dataKey?: string;
  color?: SeriesColor;
  height?: number;
  showAxis?: boolean;
}) {
  const hex = SERIES[color];
  const id = React.useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <defs>
          <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hex} stopOpacity={0.28} />
            <stop offset="100%" stopColor={hex} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxis && (
          <>
            <XAxis dataKey="t" hide />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              cursor={{ stroke: "#ebe3d8" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #ebe3d8",
                boxShadow: "0 12px 32px -16px rgba(60,40,20,0.18)",
                fontSize: 12,
              }}
            />
          </>
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={hex}
          strokeWidth={2}
          fill={`url(#spark-${id})`}
          dot={false}
          isAnimationActive
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
