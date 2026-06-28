"use client";

/* ============================================================================
   ANALYTICS STUDIO — Excel AI + Power BI AI as ONE workspace. Guided flow:
   upload → AI profiles the workbook → choose the business problem → recommended
   KPIs → generated dashboard (live charts) + DAX + Power BI teaching + review +
   export. Browser-only / Analyze-Only by default. Lives inside the Finance OS
   shell (this is only the workspace slot). No shell modification.
   ========================================================================== */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, UploadCloud, Table2, Target, ListChecks, LayoutDashboard, X, Sparkles, ArrowRight, RotateCcw } from "lucide-react";
import type { Column, DashboardKind, Kpi, Profile, Table } from "@/lib/finance-os/analytics/types";
import { parseWorkbook, profileWorkbook } from "@/lib/finance-os/analytics/profile";
import { DASHBOARD_TYPES, recommendKpis, suggestKind, kpiValue, formatValue } from "@/lib/finance-os/analytics/kpi";
import { runModel, kpiRefinePrompt } from "@/lib/finance-os/analytics/ai";
import { UploadModeBar } from "@/components/finance/UploadModeBar";
import { Dashboard } from "./Dashboard";
import { Button, Chip, cx } from "@/components/uikit";

type Stage = "upload" | "profile" | "problem" | "kpis" | "dashboard";
const STEPS: { key: Stage; label: string; icon: typeof Table2 }[] = [
  { key: "upload", label: "Upload", icon: UploadCloud },
  { key: "profile", label: "Profile", icon: Table2 },
  { key: "problem", label: "Problem", icon: Target },
  { key: "kpis", label: "KPIs", icon: ListChecks },
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function AnalyticsStudio() {
  const [stage, setStage] = useState<Stage>("upload");
  const [fileName, setFileName] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [kind, setKind] = useState<DashboardKind>("executive");
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const reached = useMemo(() => STEPS.findIndex((s) => s.key === stage), [stage]);

  const onProfiled = (p: Profile, name: string) => { setProfile(p); setFileName(name); setKind(suggestKind(p)); setStage("profile"); };
  const reset = () => { setStage("upload"); setProfile(null); setKpis([]); setFileName(""); };

  return (
    <div className="flex h-full flex-col">
      {/* header: stepper + file + reset */}
      <div className="flex flex-none flex-wrap items-center gap-3 border-b border-line bg-surface/60 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#3b82f6]/12 text-[#3b82f6]"><BarChart3 size={15} /></span>
          <span className="font-display text-sm font-semibold text-ink">Analytics Studio</span>
        </div>
        <div className="hidden items-center gap-1 md:flex">
          {STEPS.map((s, i) => {
            const Icon = s.icon; const done = i < reached; const on = i === reached;
            return (
              <button key={s.key} disabled={i > reached} onClick={() => i <= reached && setStage(s.key)}
                className={cx("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                  on ? "bg-[#3b82f6]/12 text-[#3b82f6]" : done ? "text-ink hover:bg-surface-2" : "text-faint")}>
                <Icon size={13} /> <span className="hidden lg:inline">{s.label}</span>
                {i < STEPS.length - 1 && <span className="ml-1 text-faint">›</span>}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {fileName && <Chip tone="neutral">{fileName}</Chip>}
          {profile && <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={reset}>Start over</Button>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {stage === "upload" && <UploadStage onProfiled={onProfiled} />}
        {stage === "profile" && profile && <ProfileStage profile={profile} onContinue={() => setStage("problem")} />}
        {stage === "problem" && profile && <ProblemStage profile={profile} suggested={kind} onPick={(k) => { setKind(k); setKpis(recommendKpis(profile, k)); setStage("kpis"); }} />}
        {stage === "kpis" && profile && <KpiStage profile={profile} kind={kind} kpis={kpis} setKpis={setKpis} onGenerate={() => setStage("dashboard")} />}
        {stage === "dashboard" && profile && <Dashboard profile={profile} kpis={kpis} kind={kind} currency={profile.currency} />}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- upload */
function UploadStage({ onProfiled }: { onProfiled: (p: Profile, name: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const handle = async (file: File) => {
    setBusy(true); setErr("");
    try {
      const tables = await parseWorkbook(file);
      if (!tables.length) throw new Error("No readable sheets found.");
      onProfiled(profileWorkbook(tables), file.name);
    } catch (e) { setErr((e as Error).message || "Could not read the file."); setBusy(false); }
  };
  return (
    <div className="grid h-full place-items-center overflow-y-auto p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg text-center">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] text-white shadow-soft"><BarChart3 size={26} /></span>
        <h2 className="font-display text-2xl font-bold text-ink">Upload an Excel workbook</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Analytics Studio profiles your data, recommends KPIs, builds a dashboard and writes the DAX — one intelligent workspace.</p>

        <label className={cx("mt-6 grid cursor-pointer place-items-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-10 text-center transition-colors hover:border-brand/40 hover:bg-surface-2/50", busy && "pointer-events-none opacity-60")}>
          <UploadCloud size={26} className="mb-2 text-faint" />
          <span className="text-sm font-medium text-ink">{busy ? "Profiling…" : "Drop a file or click to browse"}</span>
          <span className="mt-0.5 text-[12px] text-faint">.xlsx · .xls · .csv — parsed in your browser</span>
          <input type="file" accept=".xlsx,.xls,.csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
        </label>
        {err && <p className="mt-3 text-sm text-danger">{err}</p>}
        <div className="mt-5 text-left"><UploadModeBar /></div>
      </motion.div>
    </div>
  );
}

/* ----------------------------------------------------------- profile */
const TYPE_TONE: Record<Column["type"], string> = { date: "bg-info/10 text-info", currency: "bg-success/10 text-success", percent: "bg-warning/10 text-[#b27400]", number: "bg-brand/10 text-accent-hover", text: "bg-surface-2 text-muted" };

function ProfileStage({ profile, onContinue }: { profile: Profile; onContinue: () => void }) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="font-display text-xl font-bold text-ink">AI profiled your workbook</h2>
        <p className="mt-1 text-sm text-muted">Detected tables, types, dates, measures, dimensions{profile.currency ? `, currency (${profile.currency})` : ""} and business entities.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {profile.currency && <Chip tone="success">Currency {profile.currency}</Chip>}
          <Chip tone="info">{profile.dateColumns.length} date fields</Chip>
          <Chip tone="accent">{profile.measureColumns.length} measures</Chip>
          <Chip tone="neutral">{profile.dimensionColumns.length} dimensions</Chip>
          {profile.entities.map((e) => <Chip key={e} tone="neutral">{e}</Chip>)}
        </div>

        <div className="mt-5 space-y-4">
          {profile.tables.map((t) => <TableProfile key={t.name} t={t} primary={t.name === profile.primaryTable} />)}
        </div>

        <div className="sticky bottom-0 mt-6 flex justify-end bg-gradient-to-t from-canvas to-transparent py-3">
          <Button onClick={onContinue} iconRight={<ArrowRight size={15} />}>Choose a business problem</Button>
        </div>
      </div>
    </div>
  );
}

function TableProfile({ t, primary }: { t: Table; primary: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <Table2 size={15} className="text-muted" />
        <p className="font-display text-[14px] font-semibold text-ink">{t.name}</p>
        {primary && <Chip tone="accent">Primary</Chip>}
        <span className="ml-auto text-[11px] text-faint">{t.rowCount.toLocaleString()} rows · {t.columns.length} cols</span>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {t.columns.map((c) => (
          <div key={c.index} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/50 px-2.5 py-1.5">
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink" title={c.name}>{c.name}</span>
            <span className={cx("rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase", TYPE_TONE[c.type])}>{c.type}</span>
            <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-[9px] uppercase text-faint">{c.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- problem */
function ProblemStage({ profile, suggested, onPick }: { profile: Profile; suggested: DashboardKind; onPick: (k: DashboardKind) => void }) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-1 flex items-center gap-2"><Sparkles size={16} className="text-brand" /><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Analytics Studio asks</p></div>
        <h2 className="font-display text-2xl font-bold text-ink">What business problem are you solving?</h2>
        <p className="mt-1 text-sm text-muted">Pick a focus — the studio tailors KPIs, the dashboard layout and the DAX to it.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {DASHBOARD_TYPES.map((d) => {
            const s = d.kind === suggested;
            return (
              <button key={d.kind} onClick={() => onPick(d.kind)} className={cx("group flex items-start gap-3 rounded-2xl border bg-surface p-4 text-left shadow-soft transition-all hover-lift", s ? "border-brand/40" : "border-line")}>
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-surface-2 text-lg">{d.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="font-display text-[14.5px] font-semibold text-ink">{d.label}</span>{s && <Chip tone="accent">Suggested</Chip>}</span>
                  <span className="mt-0.5 block text-[12.5px] text-muted">{d.desc}</span>
                </span>
                <ArrowRight size={16} className="mt-1 flex-none text-faint transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- kpis */
function KpiStage({ profile, kind, kpis, setKpis, onGenerate }: { profile: Profile; kind: DashboardKind; kpis: Kpi[]; setKpis: (k: Kpi[]) => void; onGenerate: () => void }) {
  const [ai, setAi] = useState("");
  const [busy, setBusy] = useState(false);
  const refine = async () => { setBusy(true); const { system, user } = kpiRefinePrompt(profile, kind, kpis); setAi((await runModel(system, user)) || "Add a model provider in Admin to get AI KPI suggestions. The KPIs below are derived from your measures."); setBusy(false); };
  const remove = (id: string) => setKpis(kpis.filter((k) => k.id !== id));
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-xl font-bold text-ink">Recommended KPIs</h2>
        <p className="mt-1 text-sm text-muted">Derived from your measures for a {kind} dashboard. Remove any you don't need, then generate the dashboard.</p>

        <div className="mt-4 space-y-2">
          {kpis.map((k) => (
            <div key={k.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-soft">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[#3b82f6]/10 text-[#3b82f6]"><ListChecks size={15} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold text-ink">{k.label}</span><span className="block font-mono text-[10.5px] text-muted">{k.agg.toUpperCase()} · {k.format}</span></span>
              <span className="font-display text-[15px] font-bold text-ink">{formatValue(kpiValue(profile, k), k.format, profile.currency)}</span>
              <button onClick={() => remove(k.id)} aria-label="Remove" className="grid h-7 w-7 flex-none place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-danger"><X size={14} /></button>
            </div>
          ))}
          {!kpis.length && <p className="rounded-xl border border-dashed border-line bg-surface-2/50 px-4 py-6 text-center text-sm text-faint">No measures detected — try a workbook with numeric columns.</p>}
        </div>

        {ai && <div className="mt-4 whitespace-pre-wrap rounded-xl border border-info/20 bg-info/5 px-4 py-3 text-[13px] leading-relaxed text-ink"><span className="font-semibold text-info">AI KPI guidance:</span>{"\n"}{ai}</div>}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="outline" loading={busy} onClick={refine} icon={<Sparkles size={14} />}>Refine with AI</Button>
          <Button onClick={onGenerate} disabled={!kpis.length} iconRight={<ArrowRight size={15} />}>Generate dashboard</Button>
        </div>
      </div>
    </div>
  );
}
