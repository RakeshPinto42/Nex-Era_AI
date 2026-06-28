"use client";

/**
 * Command Center UI kit — composite cards.
 * Higher-level building blocks composed from the core primitives so feature
 * pages (Home, Investments, Agents, …) share identical card anatomy.
 */

import * as React from "react";
import Link from "next/link";
import { Card, Chip, ProgressRing, Button, cx } from "./core";
import { Sparkline, type SeriesColor } from "./charts";

/* --------------------------------------------------------------- ToolCard */
/* Quick-launch tile — icon in a tinted square + label. The Home tile row. */

export function ToolCard({
  label,
  icon,
  href,
  tint = "#f2761c",
}: {
  label: string;
  icon: React.ReactNode;
  href: string;
  tint?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-2.5 rounded-2xl border border-line bg-surface p-4 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-lift"
    >
      <span
        className="grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-105"
        style={{ background: `${tint}1a`, color: tint }}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-ink">{label}</span>
    </Link>
  );
}

/* -------------------------------------------------------------- AgentCard */

export function AgentCard({
  name,
  role,
  icon,
  tint = "#3b82f6",
  status = "Running",
  statusTone = "success",
}: {
  name: string;
  role: string;
  icon: React.ReactNode;
  tint?: string;
  status?: string;
  statusTone?: "success" | "neutral" | "warning";
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className="grid h-9 w-9 flex-none place-items-center rounded-xl text-white"
        style={{ background: `linear-gradient(135deg, ${tint}, ${tint}cc)` }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
        <p className="truncate text-[11px] text-muted">{role}</p>
      </div>
      <Chip tone={statusTone} dot>
        {status}
      </Chip>
    </div>
  );
}

/* ------------------------------------------------------------ LanguageCard */
/* Generic "course progress" widget — title, level, progress ring, CTA. */

export function LanguageCard({
  title,
  subtitle,
  badge,
  level,
  levelNote,
  progress,
  cta,
  ctaHref,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  level: string;
  levelNote?: string;
  progress: number;
  cta?: string;
  ctaHref?: string;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {badge && (
          <span className="rounded-md bg-brand/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-hover">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="-mt-2 mb-4 text-xs text-muted">{subtitle}</p>}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-faint">Your progress</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{level}</p>
          {levelNote && <p className="text-sm text-muted">{levelNote}</p>}
        </div>
        <ProgressRing value={progress} size={92} />
      </div>
      {cta && (
        <Link href={ctaHref ?? "#"} className="mt-5 block">
          <Button className="w-full justify-center">
            {cta} <span aria-hidden>→</span>
          </Button>
        </Link>
      )}
    </Card>
  );
}

/* ----------------------------------------------------------- InvestmentRow */

export function InvestmentRow({
  name,
  value,
  delta,
  down = false,
  data,
  color = "green",
}: {
  name: string;
  value: string;
  delta: string;
  down?: boolean;
  data: Array<Record<string, number>>;
  color?: SeriesColor;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/60 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted">{name}</span>
        <span className={cx("text-xs font-semibold", down ? "text-danger" : "text-success")}>{delta}</span>
      </div>
      <div className="mt-0.5 font-display text-lg font-bold text-ink">{value}</div>
      <div className="mt-1">
        <Sparkline data={data} color={down ? "red" : color} height={40} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Activity */

export type ActivityItem = {
  icon?: React.ReactNode;
  tint?: string;
  text: React.ReactNode;
  time: string;
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3 py-1.5">
          <span
            className="grid h-7 w-7 flex-none place-items-center rounded-lg text-[13px]"
            style={{ background: `${it.tint ?? "#f2761c"}1a`, color: it.tint ?? "#f2761c" }}
          >
            {it.icon ?? "•"}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{it.text}</span>
          <span className="flex-none text-[11px] text-faint">{it.time}</span>
        </li>
      ))}
    </ul>
  );
}

export const Feed = ActivityFeed;

/* ------------------------------------------------------------------ Table */

type Column = {
  key: string;
  label: React.ReactNode;
  align?: "left" | "right" | "center";
  sortDir?: "asc" | "desc" | null;
  onSort?: () => void;
};

export function Table({
  columns,
  rows,
  className,
  stickyHeader = false,
  maxHeight,
}: {
  columns: Column[];
  rows: Array<Record<string, React.ReactNode>>;
  className?: string;
  stickyHeader?: boolean;
  maxHeight?: number | string;
}) {
  const alignCls = (a?: Column["align"]) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";
  return (
    <div
      className={cx("overflow-auto rounded-2xl border border-line bg-surface shadow-soft", className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full border-collapse text-sm">
        <thead className={cx(stickyHeader && "sticky top-0 z-10")}>
          <tr className="border-b border-line bg-surface-2/80 backdrop-blur-sm">
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={c.onSort}
                className={cx(
                  "select-none px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-faint",
                  alignCls(c.align),
                  c.onSort && "cursor-pointer transition-colors hover:text-ink",
                )}
              >
                <span className={cx("inline-flex items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                  {c.label}
                  {c.sortDir != null && (
                    <span className="text-brand" aria-hidden>
                      {c.sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/60 last:border-0 transition-colors hover:bg-accent-tint/50">
              {columns.map((c) => (
                <td key={c.key} className={cx("px-4 py-3.5 text-ink", alignCls(c.align))}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
