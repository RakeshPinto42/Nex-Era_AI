"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { nexChartSeries } from "./tokens";

/**
 * Chart primitives — recharts wrapped in the Nex-Era theme: neon gradient
 * fills, glass tooltip, hairline grid, no chart-junk. Cover the common OS
 * cases: trend area, comparison bars, multi-line, donut.
 *
 * Each takes `data` (array of objects) + the key names. Series colors come
 * from nexChartSeries (the neon triad spread).
 */

const axisProps = {
  stroke: "var(--nex-text-faint)",
  tick: { fill: "var(--nex-text-faint)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
};

function NexTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--nex-radius-md)] border border-[var(--nex-border-strong)] bg-[var(--nex-glass-strong)] px-3 py-2 backdrop-blur-[var(--nex-blur-lg)] shadow-[var(--nex-shadow-md)]">
      {label != null && <div className="mb-1 text-[var(--nex-text-xs)] text-[var(--nex-text-faint)]">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[var(--nex-text-sm)]">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
          <span className="text-[var(--nex-text-muted)]">{p.name}</span>
          <span className="ml-auto font-medium text-[var(--nex-text)] tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChartFrame({ height = 260, children }: { height?: number; children: React.ReactElement }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  );
}

/** Trend area chart with neon gradient fill. */
export function NexAreaChart({ data, xKey, series, height, className }: { data: any[]; xKey: string; series: string[]; height?: number; className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <ChartFrame height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s} id={`nex-area-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={nexChartSeries[i % nexChartSeries.length]} stopOpacity={0.5} />
                <stop offset="100%" stopColor={nexChartSeries[i % nexChartSeries.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="var(--nex-border)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<NexTooltip />} cursor={{ stroke: "var(--nex-border-strong)" }} />
          {series.map((s, i) => (
            <Area
              key={s}
              type="monotone"
              dataKey={s}
              stroke={nexChartSeries[i % nexChartSeries.length]}
              strokeWidth={2}
              fill={`url(#nex-area-${i})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ChartFrame>
    </div>
  );
}

export function NexLineChart({ data, xKey, series, height, className }: { data: any[]; xKey: string; series: string[]; height?: number; className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <ChartFrame height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--nex-border)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<NexTooltip />} cursor={{ stroke: "var(--nex-border-strong)" }} />
          {series.map((s, i) => (
            <Line key={s} type="monotone" dataKey={s} stroke={nexChartSeries[i % nexChartSeries.length]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ChartFrame>
    </div>
  );
}

export function NexBarChart({ data, xKey, series, height, className }: { data: any[]; xKey: string; series: string[]; height?: number; className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <ChartFrame height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--nex-border)" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip content={<NexTooltip />} cursor={{ fill: "var(--nex-glass-faint)" }} />
          {series.map((s, i) => (
            <Bar key={s} dataKey={s} radius={[6, 6, 0, 0]} fill={nexChartSeries[i % nexChartSeries.length]} maxBarSize={42} />
          ))}
        </BarChart>
      </ChartFrame>
    </div>
  );
}

/** Donut — share / distribution. */
export function NexDonut({ data, nameKey, valueKey, height = 260, className }: { data: any[]; nameKey: string; valueKey: string; height?: number; className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <ChartFrame height={height}>
        <PieChart>
          <Tooltip content={<NexTooltip />} />
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="58%" outerRadius="85%" paddingAngle={3} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={nexChartSeries[i % nexChartSeries.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartFrame>
    </div>
  );
}
