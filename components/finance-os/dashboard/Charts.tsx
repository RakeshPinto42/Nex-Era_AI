"use client";

// Recharts-based dashboard primitives: TrendChart, BarChartWidget (with optional
// cross-filter on click), and WaterfallChart. Charts are sized via a measured
// container (no ResponsiveContainer) so they never warn about 0-size on mount.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFilters } from "./FilterContext";

const BRAND = "#2563eb";
const VIOLET = "#7c3aed";
const GRID = "var(--fos-border)";
const H = 250;

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-fos-border bg-fos-surface p-4">
      <p className="mb-3 text-sm font-semibold text-fos-text">{title}</p>
      {children}
    </div>
  );
}

/** Renders children only once the container has a measured width. */
function AutoSize({ children, height = H }: { children: (w: number) => ReactNode; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.floor(entry.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {w > 0 && children(w)}
    </div>
  );
}

// Tick text uses the theme's muted token so labels stay legible on both the dark
// and light Finance OS themes; the axis line uses the border token.
const axisX = { tick: { fontSize: 11, fill: "var(--fos-muted)" }, stroke: "var(--fos-border)" } as const;
const axisY = { tick: { fontSize: 11, fill: "var(--fos-muted)" }, stroke: "var(--fos-border)", width: 48 } as const;
const margin = { top: 6, right: 12, bottom: 4, left: 4 };

export function TrendChart({
  title,
  data,
  xKey,
  yKey,
}: {
  title: string;
  data: Record<string, number | string>[];
  xKey: string;
  yKey: string;
}) {
  return (
    <ChartCard title={title}>
      <AutoSize>
        {(w) => (
          <LineChart width={w} height={H} data={data} margin={margin}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey={xKey} {...axisX} />
            <YAxis {...axisY} />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke={BRAND} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </AutoSize>
    </ChartCard>
  );
}

const SERIES_COLORS = [BRAND, VIOLET, "#10b981", "#f59e0b"];

/** Multiple lines over a shared x-axis. Each series key gets its own color. */
export function MultiLineChart({
  title,
  data,
  xKey,
  series,
}: {
  title: string;
  data: Record<string, number | string | null>[];
  xKey: string;
  series: { key: string; label?: string; dashed?: boolean }[];
}) {
  return (
    <ChartCard title={title}>
      <AutoSize>
        {(w) => (
          <LineChart width={w} height={H} data={data} margin={margin}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey={xKey} {...axisX} />
            <YAxis {...axisY} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label ?? s.key}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        )}
      </AutoSize>
    </ChartCard>
  );
}

/** Bar chart; clicking a bar toggles a cross-filter on `filterDim` when set. */
export function BarChartWidget({
  title,
  data,
  xKey,
  yKey,
  filterDim,
}: {
  title: string;
  data: Record<string, number | string>[];
  xKey: string;
  yKey: string;
  filterDim?: string;
}) {
  const { toggle, isActive } = useFilters();
  return (
    <ChartCard title={title}>
      <AutoSize>
        {(w) => (
          <BarChart width={w} height={H} data={data} margin={margin}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey={xKey} {...axisX} />
            <YAxis {...axisY} />
            <Tooltip cursor={{ fill: "rgba(37,99,235,0.06)" }} />
            <Bar
              dataKey={yKey}
              radius={[4, 4, 0, 0]}
              onClick={(d: { payload?: Record<string, unknown> }) =>
                filterDim && d?.payload && toggle(filterDim, String(d.payload[xKey]))
              }
              cursor={filterDim ? "pointer" : "default"}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={filterDim && isActive(filterDim, String(d[xKey])) ? VIOLET : BRAND} />
              ))}
            </Bar>
          </BarChart>
        )}
      </AutoSize>
    </ChartCard>
  );
}

/** Waterfall: a running total built from signed steps. */
export function WaterfallChart({
  title,
  steps,
}: {
  title: string;
  steps: { label: string; value: number }[];
}) {
  let running = 0;
  const data = steps.map((s) => {
    const start = running;
    running += s.value;
    return { label: s.label, base: Math.min(start, running), delta: Math.abs(s.value), positive: s.value >= 0 };
  });
  return (
    <ChartCard title={title}>
      <AutoSize>
        {(w) => (
          <BarChart width={w} height={H} data={data} margin={margin}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="label" {...axisX} />
            <YAxis {...axisY} />
            <Tooltip />
            <Bar dataKey="base" stackId="a" fill="transparent" />
            <Bar dataKey="delta" stackId="a" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.positive ? "#10b981" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        )}
      </AutoSize>
    </ChartCard>
  );
}
