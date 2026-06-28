"use client";

/* Variance Studio — analysis surface. Deterministic numbers from the engine;
   AI tabs only narrate. Tabs: Variance · Drivers (PVM/FX) · Waterfall · Root
   Cause · Summary · Commentary · Export. */

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Table2, Layers, TrendingDown, Search, FileText, MessageSquareText, Download, Sparkles, FileSpreadsheet } from "lucide-react";
import type { VarianceResult } from "@/lib/finance-os/variance/types";
import { fmt, fmtPct } from "@/lib/finance-os/variance/engine";
import { rootCausePrompt, commentaryPrompt, execSummary, runModel } from "@/lib/finance-os/variance/ai";
import { exportExcel, exportCsv } from "@/lib/finance-os/export";
import { Button, Chip, cx } from "@/components/uikit";

type Tab = "variance" | "drivers" | "waterfall" | "rootcause" | "summary" | "commentary" | "export";
const TABS: { key: Tab; label: string; icon: typeof Table2 }[] = [
  { key: "variance", label: "Variance", icon: Table2 },
  { key: "drivers", label: "Drivers", icon: Layers },
  { key: "waterfall", label: "Waterfall", icon: TrendingDown },
  { key: "rootcause", label: "Root Cause", icon: Search },
  { key: "summary", label: "Summary", icon: FileText },
  { key: "commentary", label: "Commentary", icon: MessageSquareText },
  { key: "export", label: "Export", icon: Download },
];

export function VarianceAnalysis({ result }: { result: VarianceResult }) {
  const [tab, setTab] = useState<Tab>("variance");
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center gap-1 overflow-x-auto border-b border-line px-4 py-2">
        {TABS.map((t) => {
          const Icon = t.icon; const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={cx("flex flex-none items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors", on ? "bg-surface-2 text-ink" : "text-muted hover:text-ink")}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {tab === "variance" && <VarianceGrid r={result} />}
        {tab === "drivers" && <Drivers r={result} />}
        {tab === "waterfall" && <Waterfall r={result} />}
        {tab === "rootcause" && <RootCause r={result} />}
        {tab === "summary" && <Summary r={result} />}
        {tab === "commentary" && <Commentary r={result} />}
        {tab === "export" && <Export r={result} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <p className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</p>
      <p className={cx("mt-1 font-display text-2xl font-bold", tone === "down" ? "text-danger" : tone === "up" ? "text-success" : "text-ink")}>{value}</p>
    </div>
  );
}

function VarianceGrid({ r }: { r: VarianceResult }) {
  const fav = r.totalVarAbs >= 0;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Budget" value={fmt(r.totalBudget, r.currency)} />
        <StatCard label="Actual" value={fmt(r.totalActual, r.currency)} />
        <StatCard label="Variance" value={fmt(r.totalVarAbs, r.currency)} tone={fav ? "up" : "down"} />
        <StatCard label="Variance %" value={fmtPct(r.totalVarPct)} tone={fav ? "up" : "down"} />
      </div>

      <div className="mt-4 overflow-auto rounded-2xl border border-line bg-surface shadow-soft">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0">
            <tr className="border-b border-line bg-surface-2/80 backdrop-blur-sm text-[11px] uppercase tracking-wide text-faint">
              <th className="px-4 py-3 text-left font-semibold">Line</th>
              <th className="px-4 py-3 text-right font-semibold">Budget</th>
              {r.totalForecast != null && <th className="px-4 py-3 text-right font-semibold">Forecast</th>}
              <th className="px-4 py-3 text-right font-semibold">Actual</th>
              <th className="px-4 py-3 text-right font-semibold">Var</th>
              <th className="px-4 py-3 text-right font-semibold">Var %</th>
            </tr>
          </thead>
          <tbody>
            {r.lines.map((l) => (
              <tr key={l.line} className={cx("border-b border-line/60 last:border-0 transition-colors hover:bg-accent-tint/40", l.material && "bg-warning/[0.04]")}>
                <td className="px-4 py-3 font-medium text-ink">{l.material && <span className="mr-1.5 text-warning" title="Material">●</span>}{l.line}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">{fmt(l.budget, r.currency)}</td>
                {r.totalForecast != null && <td className="px-4 py-3 text-right tabular-nums text-muted">{l.forecast != null ? fmt(l.forecast, r.currency) : "—"}</td>}
                <td className="px-4 py-3 text-right tabular-nums text-ink">{fmt(l.actual, r.currency)}</td>
                <td className={cx("px-4 py-3 text-right font-semibold tabular-nums", l.varAbs >= 0 ? "text-success" : "text-danger")}>{fmt(l.varAbs, r.currency)}</td>
                <td className={cx("px-4 py-3 text-right font-semibold tabular-nums", l.varAbs >= 0 ? "text-success" : "text-danger")}>{fmtPct(l.varPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Drivers({ r }: { r: VarianceResult }) {
  const d = r.drivers;
  const cards = [
    r.hasQty && { label: "Price", v: d.price }, r.hasQty && { label: "Volume", v: d.volume }, r.hasQty && { label: "Mix", v: d.mix },
    r.hasFx && { label: "FX", v: d.fx }, { label: r.hasQty ? "Other" : "Net variance", v: d.other },
  ].filter(Boolean) as { label: string; v: number }[];
  return (
    <div className="mx-auto max-w-4xl">
      {!r.hasQty && <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5 text-[13px] text-[#b27400]">No quantity column mapped — Price/Volume/Mix can't be decomposed. Showing the net $ variance. Map a quantity in the previous step to enable PVM.</div>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
            <p className="text-[11px] font-medium uppercase tracking-wide text-faint">{c.label}</p>
            <p className={cx("mt-1 font-display text-xl font-bold", c.v >= 0 ? "text-success" : "text-danger")}>{fmt(c.v, r.currency)}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-muted">Price + Volume + Mix{r.hasFx ? " + FX" : ""} + Other = total variance ({fmt(r.totalVarAbs, r.currency)}). Decomposition is exact when quantity is present.</p>

      {r.hasQty && (
        <div className="mt-5 overflow-auto rounded-2xl border border-line bg-surface shadow-soft">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="border-b border-line bg-surface-2/80 text-[11px] uppercase tracking-wide text-faint">
              <th className="px-4 py-3 text-left font-semibold">Line</th><th className="px-4 py-3 text-right font-semibold">Price effect</th><th className="px-4 py-3 text-right font-semibold">Volume effect</th><th className="px-4 py-3 text-right font-semibold">Total var</th>
            </tr></thead>
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.line} className="border-b border-line/60 last:border-0 hover:bg-accent-tint/40">
                  <td className="px-4 py-2.5 font-medium text-ink">{l.line}</td>
                  <td className={cx("px-4 py-2.5 text-right tabular-nums", l.price >= 0 ? "text-success" : "text-danger")}>{fmt(l.price, r.currency)}</td>
                  <td className={cx("px-4 py-2.5 text-right tabular-nums", l.volume >= 0 ? "text-success" : "text-danger")}>{fmt(l.volume, r.currency)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ink">{fmt(l.varAbs, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Waterfall({ r }: { r: VarianceResult }) {
  const data = useMemo(() => {
    let running = 0;
    return r.bridge.map((s) => {
      if (s.kind === "start" || s.kind === "end") { running = s.value; return { label: s.label, base: 0, bar: s.value, fill: "#3b82f6" }; }
      if (s.value >= 0) { const base = running; running += s.value; return { label: s.label, base, bar: s.value, fill: "#16a34a" }; }
      running += s.value; return { label: s.label, base: running, bar: -s.value, fill: "#ef4444" };
    });
  }, [r.bridge]);
  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <p className="mb-1 font-display text-[15px] font-semibold text-ink">Budget → Actual bridge</p>
        <p className="mb-4 text-[12.5px] text-muted">How the variance builds up by driver. Green = favorable, red = unfavorable.</p>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="#ece3d8" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8a7e72" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#8a7e72" }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => fmt(Number(v), r.currency)} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ebe3d8", fontSize: 12 }} formatter={(v) => [fmt(Number(v), r.currency), "Effect"]} />
            <Bar dataKey="base" stackId="a" fill="transparent" />
            <Bar dataKey="bar" stackId="a" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AiPanel({ title, intro, build, deterministic }: { title: string; intro: string; build: () => { system: string; user: string }; deterministic?: string }) {
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); const { system, user } = build(); setOut((await runModel(system, user)) || "Add a model provider in Admin to enable AI narration. The deterministic figures above are always available."); setBusy(false); };
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <p className="mb-1 font-display text-[15px] font-semibold text-ink">{title}</p>
        <p className="mb-3 text-[13px] text-muted">{intro}</p>
        {deterministic && <div className="mb-3 whitespace-pre-wrap rounded-xl border border-line bg-surface-2 px-4 py-3 text-[13px] leading-relaxed text-ink">{deterministic}</div>}
        {out ? <div className="whitespace-pre-wrap rounded-xl border border-info/20 bg-info/5 px-4 py-3 text-[13px] leading-relaxed text-ink"><span className="font-semibold text-info">AI:</span> {out}</div>
             : <Button onClick={go} loading={busy} icon={<Sparkles size={14} />}>Explain with AI</Button>}
      </div>
    </div>
  );
}

function RootCause({ r }: { r: VarianceResult }) {
  const top = r.lines.filter((l) => l.material).slice(0, 5).map((l) => `• ${l.line}: ${fmt(l.varAbs, r.currency)} (${fmtPct(l.varPct)})`).join("\n");
  return <AiPanel title="Root cause analysis" intro="Top material lines ranked by absolute variance. AI attributes each to its driver and likely business cause — it never recomputes the numbers." deterministic={top || "No material lines at the current threshold."} build={() => rootCausePrompt(r)} />;
}
function Summary({ r }: { r: VarianceResult }) {
  return <AiPanel title="Executive summary" intro="A board-ready summary. The headline is generated deterministically; AI can expand it." deterministic={execSummary(r)} build={() => rootCausePrompt(r)} />;
}
function Commentary({ r }: { r: VarianceResult }) {
  return <AiPanel title="Management commentary" intro="Drivers, risks and recommendations for the monthly business review. (Standalone Commentary AI will consume this later.)" build={() => commentaryPrompt(r)} />;
}

function Export({ r }: { r: VarianceResult }) {
  const cols = [
    { header: "Line", key: "line" }, { header: "Budget", key: "budget" },
    ...(r.totalForecast != null ? [{ header: "Forecast", key: "forecast" }] : []),
    { header: "Actual", key: "actual" }, { header: "Variance", key: "var" }, { header: "Variance %", key: "pct" },
    ...(r.hasQty ? [{ header: "Price", key: "price" }, { header: "Volume", key: "volume" }] : []),
  ];
  const rows = r.lines.map((l) => ({
    line: l.line, budget: l.budget, forecast: l.forecast ?? "", actual: l.actual,
    var: l.varAbs, pct: Number(l.varPct.toFixed(1)), price: l.price, volume: l.volume,
  }));
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
        <p className="mb-2 font-display text-[15px] font-semibold text-ink">Export</p>
        <p className="mb-4 text-[13px] text-muted">Variance pack with the line detail and PVM drivers. Generated client-side — your data never leaves the device.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => exportExcel("finance-os-variance", cols, rows, "Variance")} icon={<FileSpreadsheet size={15} />}>Excel pack</Button>
          <Button variant="outline" onClick={() => exportCsv("finance-os-variance", cols, rows)} icon={<Download size={15} />}>CSV</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{["PowerPoint commentary", "Waterfall deck"].map((f) => <Chip key={f} tone="neutral">{f} · later</Chip>)}</div>
      </div>
    </div>
  );
}
