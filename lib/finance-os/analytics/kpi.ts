// Analytics Studio — dashboard problem framing, deterministic KPI recommendation,
// and live value computation from the parsed rows.

import type { DashboardKind, Kpi, Profile, Table } from "./types";
import { withDax } from "./dax";
import { columnValues, parseNumber } from "./profile";

export const DASHBOARD_TYPES: { kind: DashboardKind; label: string; desc: string; emoji: string; hints: RegExp }[] = [
  { kind: "executive",  label: "Executive Dashboard",  desc: "Top-line KPIs, trend and headline drivers for leadership.", emoji: "📊", hints: /revenue|ebitda|margin|growth/i },
  { kind: "sales",      label: "Sales Dashboard",      desc: "Pipeline, bookings, units and rep/region performance.",     emoji: "📈", hints: /sales|bookings|units|deal|pipeline|rep/i },
  { kind: "finance",    label: "Finance Dashboard",    desc: "Revenue, cost, margin and budget vs actual.",               emoji: "💰", hints: /revenue|cost|margin|budget|actual|opex/i },
  { kind: "pricing",    label: "Pricing Dashboard",    desc: "Price, discount, pocket margin and leakage.",               emoji: "🏷️", hints: /price|discount|margin|list|net/i },
  { kind: "commission", label: "Commission Dashboard", desc: "Payouts, attainment and quota by payee.",                   emoji: "🧾", hints: /commission|payout|attainment|quota|payee/i },
  { kind: "operations", label: "Operations Dashboard", desc: "Volume, throughput, SLA and counts.",                       emoji: "⚙️", hints: /count|volume|orders|tickets|sla|throughput/i },
  { kind: "custom",     label: "Custom",               desc: "Tell the AI what you want to measure.",                     emoji: "✨", hints: /.^/ },
];

// Suggest the most likely dashboard kind from the profile's measure names.
export function suggestKind(profile: Profile): DashboardKind {
  const names = profile.measureColumns.concat(profile.dimensionColumns).join(" ");
  for (const t of DASHBOARD_TYPES) {
    if (t.kind !== "custom" && t.hints.test(names)) return t.kind;
  }
  return "executive";
}

function measureName(ref: string): { table: string; column: string } {
  const i = ref.indexOf(".");
  return { table: ref.slice(0, i), column: ref.slice(i + 1) };
}

function fmtFor(profile: Profile, table: string, column: string): "currency" | "number" | "percent" {
  const col = profile.tables.find((t) => t.name === table)?.columns.find((c) => c.name === column);
  if (!col) return "number";
  return col.type === "currency" ? "currency" : col.type === "percent" ? "percent" : "number";
}

// Deterministic KPI recommendation: the dominant measures aggregated sensibly,
// a record count, and a margin/rate ratio when two compatible measures exist.
export function recommendKpis(profile: Profile, kind: DashboardKind): Kpi[] {
  const out: Kpi[] = [];
  const seen = new Set<string>();
  const measures = orderMeasures(profile, kind);

  for (const ref of measures.slice(0, 4)) {
    const { table, column } = measureName(ref);
    const fmt = fmtFor(profile, table, column);
    const agg = fmt === "percent" ? "avg" : "sum";
    const id = `m_${out.length}`;
    out.push(withDax({ id, label: titleize(column), table, column, agg, format: fmt }));
    seen.add(column.toLowerCase());
  }

  // Record count from the primary table.
  if (profile.primaryTable) {
    out.push(withDax({ id: `m_${out.length}`, label: "Records", table: profile.primaryTable, column: "*", agg: "count", format: "number" }));
  }

  // Margin / rate ratio when a profit-ish and a revenue-ish measure coexist.
  const rev = measures.find((r) => /revenue|sales|gmv|amount|net/i.test(r));
  const prof = measures.find((r) => /margin|profit|gross/i.test(r));
  if (rev && prof && rev !== prof) {
    const num = titleize(measureName(prof).column);
    const den = titleize(measureName(rev).column);
    out.push(withDax({ id: `m_${out.length}`, label: "Margin %", table: profile.primaryTable, column: "*", agg: "ratio", format: "percent", num, den }));
  }

  return out.slice(0, 6);
}

function orderMeasures(profile: Profile, kind: DashboardKind): string[] {
  const def = DASHBOARD_TYPES.find((d) => d.kind === kind);
  const hint = def?.hints ?? /.^/;
  return [...profile.measureColumns].sort((a, b) => Number(hint.test(b)) - Number(hint.test(a)));
}

const titleize = (s: string) => s.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).trim();

// ---- live values from parsed rows ----
function table(profile: Profile, name: string): Table | undefined {
  return profile.tables.find((t) => t.name === name);
}

export function kpiValue(profile: Profile, kpi: Kpi): number {
  const t = table(profile, kpi.table);
  if (!t) return 0;
  if (kpi.agg === "count") return t.rowCount;
  if (kpi.agg === "ratio") {
    const n = sumByLabel(profile, kpi.num);
    const d = sumByLabel(profile, kpi.den);
    return d ? (n / d) * 100 : 0;
  }
  const vals = columnValues(t, kpi.column);
  if (!vals.length) return 0;
  if (kpi.agg === "avg") return vals.reduce((a, b) => a + b, 0) / vals.length;
  if (kpi.agg === "distinct") return new Set(t.rows.map((r) => r[t.columns.find((c) => c.name === kpi.column)?.index ?? -1])).size;
  return vals.reduce((a, b) => a + b, 0); // sum
}

function sumByLabel(profile: Profile, label?: string): number {
  if (!label) return 0;
  for (const t of profile.tables) {
    const col = t.columns.find((c) => titleize(c.name) === label);
    if (col) return columnValues(t, col.name).reduce((a, b) => a + b, 0);
  }
  return 0;
}

export function formatValue(v: number, format: "currency" | "number" | "percent", currency: string | null): string {
  if (format === "percent") return `${v.toFixed(1)}%`;
  const abs = Math.abs(v);
  const compact = abs >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return format === "currency" ? `${currency ?? "$"}${compact}` : compact;
}

// Trend: group a measure by its date column (month bucket).
export function trendData(profile: Profile, dateRef: string, kpi: Kpi): { t: string; v: number }[] {
  const { table: tn, column: dc } = measureName(dateRef);
  const t = table(profile, tn);
  const tk = table(profile, kpi.table);
  if (!t || !tk) return [];
  const dIdx = t.columns.find((c) => c.name === dc)?.index ?? -1;
  const mIdx = tk.columns.find((c) => c.name === kpi.column)?.index ?? -1;
  if (dIdx < 0 || mIdx < 0 || t !== tk) return [];
  const buckets = new Map<string, number>();
  for (const r of t.rows) {
    const key = monthKey(r[dIdx] ?? "");
    if (!key) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + (parseNumber(r[mIdx] ?? "") ?? 0));
  }
  return [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12).map(([t2, v]) => ({ t: t2, v }));
}

// Breakdown: group a measure by a dimension, top N.
export function breakdownData(profile: Profile, dimRef: string, kpi: Kpi): { name: string; v: number }[] {
  const { table: tn, column: dc } = measureName(dimRef);
  const t = table(profile, tn);
  if (!t || tn !== kpi.table) return [];
  const dIdx = t.columns.find((c) => c.name === dc)?.index ?? -1;
  const mIdx = t.columns.find((c) => c.name === kpi.column)?.index ?? -1;
  if (dIdx < 0 || mIdx < 0) return [];
  const buckets = new Map<string, number>();
  for (const r of t.rows) {
    const key = (r[dIdx] ?? "").trim() || "—";
    buckets.set(key, (buckets.get(key) ?? 0) + (parseNumber(r[mIdx] ?? "") ?? 0));
  }
  return [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, v]) => ({ name, v }));
}

function monthKey(v: string): string | null {
  const t = v.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[1].padStart(2, "0")}`;
  const d = new Date(t); if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return null;
}
