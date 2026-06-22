"use client";

import { useMemo, useState } from "react";
import { toNum, type Table } from "@/lib/finance/csv";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { UploadMapper } from "@/components/finance-os/UploadMapper";
import { MultiLineChart, TrendChart } from "@/components/finance-os/dashboard/Charts";
import { ExportMenu } from "@/components/finance-os/ExportMenu";
import { fmtMoney } from "@/lib/finance/csv";
import { computeForecast, type Method } from "@/lib/finance/forecast";
import { sampleForecast } from "@/lib/finance-os/samples";
import { cn, uid } from "@/lib/utils";
import type { ColumnMapping, FieldSpec } from "@/lib/finance-os/types";

const ACCENT = "#7c3aed";
const FIELDS: FieldSpec[] = [
  { key: "period", label: "Period", synonyms: ["month", "date", "quarter", "year"], required: true },
  { key: "value", label: "Revenue / Actual", synonyms: ["revenue", "amount", "actual", "sales"], numeric: true, required: true },
  { key: "budget", label: "Budget (optional)", synonyms: ["plan", "target", "budgeted"], numeric: true },
  { key: "cost", label: "Cost (optional)", synonyms: ["cogs", "cost", "expense"], numeric: true },
];
const round1 = (n: number) => Math.round(n * 10) / 10;

type Version = { id: string; name: string; periods: number; method: Method; target: number; projRev: number; projMargin: number | null };

export function ForecastStudio() {
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [periods, setPeriods] = useState(6);
  const [method, setMethod] = useState<Method>("trend");
  const [target, setTarget] = useState(0);
  const [versions, setVersions] = useState<Version[]>([]);

  const model = useMemo(() => {
    if (!table || !mapping || (mapping.period ?? -1) < 0 || (mapping.value ?? -1) < 0) return null;
    const revF = computeForecast(table, { period: mapping.period, value: mapping.value }, { periods, method });
    const hasCost = (mapping.cost ?? -1) >= 0;
    const costF = hasCost ? computeForecast(table, { period: mapping.period, value: mapping.cost }, { periods, method }) : null;
    const hasBudget = (mapping.budget ?? -1) >= 0;
    const budgetByLabel = new Map<string, number>();
    if (hasBudget) for (const r of table.rows) {
      const l = (r[mapping.period] ?? "").trim(); const v = toNum(r[mapping.budget]);
      if (l && Number.isFinite(v)) budgetByLabel.set(l, v);
    }
    const revData = revF.points.map((p) => ({ label: p.label, Revenue: Math.round(p.value), Budget: hasBudget ? (budgetByLabel.get(p.label) ?? null) : null }));
    const marginData = costF ? revF.points.map((p, i) => {
      const c = costF.points[i]?.value ?? 0; const m = p.value ? ((p.value - c) / p.value) * 100 : 0;
      return { label: p.label, value: round1(m) };
    }) : null;
    const projRev = revF.points.filter((p) => p.projected).reduce((s, p) => s + p.value, 0);
    const projCost = costF ? costF.points.filter((p) => p.projected).reduce((s, p) => s + p.value, 0) : 0;
    const projMarginPct = costF && projRev ? ((projRev - projCost) / projRev) * 100 : null;
    let ha = 0, hb = 0;
    if (hasBudget) for (const h of revF.history) { const b = budgetByLabel.get(h.label); if (b != null) { ha += h.value; hb += b; } }
    return { revF, revData, marginData, projRev, projMarginPct, hasBudget, budgetVar: hasBudget ? ha - hb : null };
  }, [table, mapping, periods, method]);

  const gap = model ? target - model.projRev : 0;

  const saveVersion = () => {
    if (!model) return;
    setVersions((vs) => [
      ...vs,
      { id: uid("v"), name: `v${vs.length + 1} · ${method === "trend" ? "Trend" : "Growth"} ${periods}p`, periods, method, target, projRev: model.projRev, projMargin: model.projMarginPct },
    ]);
  };
  const restore = (v: Version) => { setPeriods(v.periods); setMethod(v.method); setTarget(v.target); };

  return (
    <ModuleScreen
      slug="forecast"
      title="Forecast Studio"
      actions={model && <button onClick={saveVersion} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/25 hover:bg-white/25">+ Save version</button>}
    >
      <UploadMapper
        fields={FIELDS}
        onData={(t, m) => { setTable(t); setMapping(m); }}
        sample={() => [sampleForecast()]}
        defaultRole="actuals"
        mapTitle="Map period, revenue (and optional budget / cost)"
      />

      {model && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* ---- planning rail ---- */}
          <aside className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-fos-border bg-fos-surface p-4">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>Assumptions</p>
              <label className="mb-3 block text-xs text-fos-text">Periods ahead
                <input type="number" className="mt-1 w-full rounded-lg border border-fos-border px-2 py-1.5 text-sm" value={periods} onChange={(e) => setPeriods(Number(e.target.value))} />
              </label>
              <label className="mb-3 block text-xs text-fos-text">Method
                <select className="mt-1 w-full rounded-lg border border-fos-border px-2 py-1.5 text-sm" value={method} onChange={(e) => setMethod(e.target.value as Method)}>
                  <option value="trend">Linear trend</option>
                  <option value="growth">Compound growth</option>
                </select>
              </label>
              <label className="block text-xs text-fos-text">Target (window)
                <input type="number" className="mt-1 w-full rounded-lg border border-fos-border px-2 py-1.5 text-sm" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
              </label>
            </div>

            <div className="rounded-2xl border border-fos-border bg-fos-surface p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>Saved versions</p>
              {versions.length === 0 && <p className="text-xs text-fos-muted">No versions yet. Tune assumptions, then “Save version” to compare.</p>}
              <div className="space-y-1.5">
                {versions.map((v) => (
                  <button key={v.id} onClick={() => restore(v)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-fos-border px-2.5 py-1.5 text-left hover:bg-fos-surface2">
                    <span className="truncate text-xs font-medium text-fos-text">{v.name}</span>
                    <span className="font-mono text-[11px] text-fos-muted">{fmtMoney(v.projRev)}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ---- forecast canvas ---- */}
          <div className="space-y-4 lg:col-span-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Last actual" v={fmtMoney(model.revF.history[model.revF.history.length - 1]?.value ?? 0)} />
              <Stat label="Projected rev" v={fmtMoney(model.projRev)} accent />
              <Stat label="CAGR" v={`${model.revF.cagr.toFixed(1)}%`} />
              {model.projMarginPct != null ? <Stat label="Proj. margin" v={`${model.projMarginPct.toFixed(1)}%`} />
                : model.budgetVar != null ? <Stat label="Actual vs Budget" v={fmtMoney(model.budgetVar)} bad={model.budgetVar < 0} />
                : target > 0 ? <Stat label="Gap to target" v={fmtMoney(gap)} bad={gap > 0} /> : <Stat label="Avg growth" v={`${model.revF.avgGrowth.toFixed(1)}%`} />}
            </div>

            {model.hasBudget ? (
              <MultiLineChart title="Revenue forecast vs budget" data={model.revData} xKey="label"
                series={[{ key: "Revenue", label: "Revenue (actual + forecast)" }, { key: "Budget", label: "Budget", dashed: true }]} />
            ) : (
              <TrendChart title="History + forecast" data={model.revData.map((d) => ({ label: d.label, value: d.Revenue }))} xKey="label" yKey="value" />
            )}
            {model.marginData && <TrendChart title="Margin % forecast" data={model.marginData} xKey="label" yKey="value" />}

            {versions.length > 1 && (
              <div className="rounded-xl border border-fos-border bg-fos-surface p-4">
                <p className="mb-2 text-sm font-semibold text-fos-text">Version comparison</p>
                <table className="w-full text-sm">
                  <thead><tr className="text-left font-mono text-[10px] uppercase text-fos-muted"><th className="pb-1">Version</th><th className="pb-1">Proj. revenue</th><th className="pb-1">Proj. margin</th></tr></thead>
                  <tbody>
                    {versions.map((v) => (
                      <tr key={v.id} className="border-t border-line/60"><td className="py-1.5">{v.name}</td><td className="py-1.5 font-mono">{fmtMoney(v.projRev)}</td><td className="py-1.5 font-mono">{v.projMargin != null ? `${v.projMargin.toFixed(1)}%` : "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end">
              <ExportMenu filename="forecast"
                columns={[{ header: "Period", key: "label" }, { header: "Revenue", key: "Revenue" }, ...(model.hasBudget ? [{ header: "Budget", key: "Budget" }] : [])]}
                rows={model.revData.map((d) => ({ label: d.label, Revenue: d.Revenue, Budget: d.Budget ?? "" }))} title="Revenue Forecast" />
            </div>
          </div>
        </div>
      )}
    </ModuleScreen>
  );
}

function Stat({ label, v, accent, bad }: { label: string; v: string; accent?: boolean; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-fos-border bg-fos-surface p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-fos-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums" style={{ color: bad ? "#e11d48" : accent ? ACCENT : "#0f172a" }}>{v}</p>
    </div>
  );
}
