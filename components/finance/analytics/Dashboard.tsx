"use client";

/* Analytics Studio — the generated dashboard + DAX / Teach / Review / Export
   tabs. KPI values and charts are computed live from the parsed rows (browser
   only). DAX is deterministic; AI enriches explanations/teaching on demand. */

import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Copy, Download, FileSpreadsheet, GraduationCap, Sparkles, ListChecks } from "lucide-react";
import type { DashboardKind, Kpi, Profile } from "@/lib/finance-os/analytics/types";
import { kpiValue, formatValue, trendData, breakdownData } from "@/lib/finance-os/analytics/kpi";
import { runModel, daxExplainPrompt, teachPrompt, reviewPrompt } from "@/lib/finance-os/analytics/ai";
import { exportExcel, exportCsv } from "@/lib/finance-os/export";
import { Button, Chip, cx } from "@/components/uikit";

type Tab = "dashboard" | "dax" | "teach" | "review" | "export";
const TABS: { key: Tab; label: string; icon: typeof Copy }[] = [
  { key: "dashboard", label: "Dashboard", icon: ListChecks },
  { key: "dax", label: "DAX", icon: Copy },
  { key: "teach", label: "Teach Power BI", icon: GraduationCap },
  { key: "review", label: "Review", icon: Sparkles },
  { key: "export", label: "Export", icon: Download },
];

export function Dashboard({ profile, kpis, kind, currency }: { profile: Profile; kpis: Kpi[]; kind: DashboardKind; currency: string | null }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const primary = useMemo(() => kpis.find((k) => k.agg === "sum") ?? kpis[0], [kpis]);
  const dateRef = profile.dateColumns.find((d) => d.startsWith(primary?.table + "."));
  const dimRef = profile.dimensionColumns.find((d) => d.startsWith(primary?.table + "."));
  const trend = useMemo(() => (dateRef && primary ? trendData(profile, dateRef, primary) : []), [profile, dateRef, primary]);
  const breakdown = useMemo(() => (dimRef && primary ? breakdownData(profile, dimRef, primary) : []), [profile, dimRef, primary]);

  return (
    <div className="flex h-full flex-col">
      {/* tabs */}
      <div className="flex flex-none items-center gap-1 border-b border-line px-4 py-2">
        {TABS.map((t) => {
          const Icon = t.icon; const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={cx("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors", on ? "bg-surface-2 text-ink" : "text-muted hover:text-ink")}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {tab === "dashboard" && (
          <div className="mx-auto max-w-5xl">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.id} className="rounded-2xl border border-line bg-surface p-4 shadow-soft hover-lift">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide text-faint">{k.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-ink">{formatValue(kpiValue(profile, k), k.format, currency)}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted">{k.agg.toUpperCase()}</p>
                </div>
              ))}
            </div>

            {/* charts */}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ChartCard title={`${primary?.label ?? "Measure"} over time`}>
                {trend.length > 1 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <defs><linearGradient id="ana-trend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid stroke="#ece3d8" vertical={false} />
                      <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#8a7e72" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#8a7e72" }} tickLine={false} axisLine={false} width={44} />
                      <Tooltip contentStyle={tooltip} />
                      <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} fill="url(#ana-trend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <ChartEmpty hint="No date column detected for a trend." />}
              </ChartCard>

              <ChartCard title={`${primary?.label ?? "Measure"} by ${dimRef ? dimRef.split(".")[1] : "dimension"}`}>
                {breakdown.length ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={breakdown} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#ece3d8" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8a7e72" }} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={44} />
                      <YAxis tick={{ fontSize: 10, fill: "#8a7e72" }} tickLine={false} axisLine={false} width={44} />
                      <Tooltip contentStyle={tooltip} cursor={{ fill: "#f6f1ea" }} />
                      <Bar dataKey="v" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <ChartEmpty hint="No dimension column detected for a breakdown." />}
              </ChartCard>
            </div>
          </div>
        )}

        {tab === "dax" && <DaxPanel profile={profile} kpis={kpis} />}
        {tab === "teach" && <TeachPanel profile={profile} kind={kind} />}
        {tab === "review" && <ReviewPanel />}
        {tab === "export" && <ExportPanel profile={profile} kpis={kpis} currency={currency} kind={kind} />}
      </div>
    </div>
  );
}

const tooltip = { borderRadius: 12, border: "1px solid #ebe3d8", boxShadow: "0 12px 32px -16px rgba(60,40,20,0.18)", fontSize: 12 } as const;

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <p className="mb-2 font-display text-[14px] font-semibold text-ink">{title}</p>
      {children}
    </div>
  );
}
function ChartEmpty({ hint }: { hint: string }) {
  return <div className="grid h-[200px] place-items-center rounded-xl border border-dashed border-line bg-surface-2/50 text-center text-[12px] text-faint">{hint}</div>;
}

/* ---- DAX panel: deterministic measures + on-demand AI explanation ---- */
function DaxPanel({ profile, kpis }: { profile: Profile; kpis: Kpi[] }) {
  const [ai, setAi] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const explain = async (k: Kpi) => {
    setBusy(k.id);
    const { system, user } = daxExplainPrompt(profile, k);
    const text = await runModel(system, user);
    setAi((m) => ({ ...m, [k.id]: text || "AI explanation unavailable — add a model provider in Admin to enable it." }));
    setBusy(null);
  };
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {kpis.map((k) => (
        <div key={k.id} className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-display text-[14px] font-semibold text-ink">{k.label}</p>
            <button onClick={() => navigator.clipboard?.writeText(k.dax)} className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-muted hover:text-ink"><Copy size={12} /> Copy</button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-line bg-surface-2 px-3 py-2.5 font-mono text-[12.5px] text-ink">{k.dax}</pre>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{k.explain}</p>
          {ai[k.id] && <p className="mt-2 rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-[12.5px] leading-relaxed text-ink"><span className="font-semibold text-info">AI:</span> {ai[k.id]}</p>}
          <Button size="sm" variant="ghost" loading={busy === k.id} onClick={() => explain(k)} className="mt-2" icon={<Sparkles size={13} />}>Explain with AI</Button>
        </div>
      ))}
    </div>
  );
}

function TeachPanel({ profile, kind }: { profile: Profile; kind: DashboardKind }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); const { system, user } = teachPrompt(profile, kind); setText((await runModel(system, user)) || "Add a model provider in Admin to enable the Power BI tutor. Meanwhile: model your tables into a star schema, write the measures from the DAX tab, then place KPI cards + a trend line + a breakdown bar on the canvas."); setBusy(false); };
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <p className="mb-2 flex items-center gap-2 font-display text-[15px] font-semibold text-ink"><GraduationCap size={16} className="text-brand" /> Build this in Power BI</p>
        <p className="mb-4 text-[13px] text-muted">A step-by-step walkthrough tailored to your workbook and the {kind} dashboard.</p>
        {text ? <div className="whitespace-pre-wrap rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink">{text}</div> : <Button onClick={go} loading={busy} icon={<Sparkles size={14} />}>Teach me</Button>}
      </div>
    </div>
  );
}

function ReviewPanel() {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); const { system, user } = reviewPrompt(input); setOut((await runModel(system, user)) || "Add a model provider in Admin to enable dashboard review."); setBusy(false); };
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <p className="mb-2 font-display text-[15px] font-semibold text-ink">Review an existing dashboard</p>
        <p className="mb-3 text-[13px] text-muted">Paste a description of an existing Power BI / Excel dashboard (visuals, KPIs, layout) for a structured critique.</p>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5} placeholder="e.g. Sales dashboard: 4 KPI cards (revenue, units, AOV, margin), a monthly line chart, a pie of revenue by region…" className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition-all focus:border-brand/50 focus:bg-surface" />
        <Button onClick={go} loading={busy} disabled={!input.trim()} className="mt-3" icon={<Sparkles size={14} />}>Review</Button>
        {out && <div className="mt-4 whitespace-pre-wrap rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink">{out}</div>}
      </div>
    </div>
  );
}

function ExportPanel({ profile, kpis, currency, kind }: { profile: Profile; kpis: Kpi[]; currency: string | null; kind: DashboardKind }) {
  const summaryCols = [{ header: "KPI", key: "kpi" }, { header: "Value", key: "value" }, { header: "Aggregation", key: "agg" }, { header: "DAX", key: "dax" }];
  const summaryRows = kpis.map((k) => ({ kpi: k.label, value: formatValue(kpiValue(profile, k), k.format, currency), agg: k.agg, dax: k.dax }));
  const file = `finance-os-${kind}-dashboard`;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <p className="mb-2 font-display text-[15px] font-semibold text-ink">Export</p>
        <p className="mb-4 text-[13px] text-muted">Download the dashboard summary (KPIs, values and DAX). Generated client-side — your data never leaves the device.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportExcel(file, summaryCols, summaryRows, "Dashboard")} icon={<FileSpreadsheet size={15} />}>Excel dashboard</Button>
          <Button variant="outline" onClick={() => exportCsv(file, summaryCols, summaryRows)} icon={<Download size={15} />}>CSV</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {["PDF", "PowerPoint", "Power BI assets"].map((f) => <Chip key={f} tone="neutral">{f} · Phase 2.1</Chip>)}
        </div>
      </div>
    </div>
  );
}
