"use client";

import { useMemo, useState } from "react";
import {
  parseCsv,
  firstNumericCol,
  fmtMoney,
  fmtPct,
  toCsv,
  download,
  type Table,
} from "@/lib/finance/csv";
import { computeVariance, type MetricKind } from "@/lib/finance/variance";
import { Dropzone, ColumnSelect, StatCard, BarList, PrivacyNote, Panel } from "./shared";

const SAMPLE = `Line Item,Actual,Budget
Net Revenue,4820000,4500000
COGS,1910000,1850000
Sales & Marketing,720000,680000
R&D,540000,560000
G&A,410000,400000
Customer Success,265000,240000
Professional Services,180000,210000`;

export default function VarianceTool() {
  const [table, setTable] = useState<Table | null>(null);
  const [label, setLabel] = useState(0);
  const [actual, setActual] = useState(1);
  const [budget, setBudget] = useState(2);
  const [kind, setKind] = useState<MetricKind>("revenue");

  const onTable = (t: Table) => {
    const a = firstNumericCol(t, 1);
    const b = firstNumericCol(t, (a < 0 ? 1 : a) + 1);
    setTable(t);
    setLabel(0);
    setActual(a < 0 ? 1 : a);
    setBudget(b < 0 ? (a < 0 ? 2 : a + 1) : b);
    setKind("revenue");
  };

  const result = useMemo(
    () => (table ? computeVariance(table, { label, actual, budget, kind }) : null),
    [table, label, actual, budget, kind],
  );

  const top = useMemo(() => {
    if (!result) return [];
    return [...result.rows]
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
      .slice(0, 8)
      .map((r) => ({
        label: r.label,
        value: r.variance,
        display: fmtMoney(r.variance),
        color: r.favorable ? "#059669" : "#e11d48",
      }));
  }, [result]);

  const exportCsv = () => {
    if (!result) return;
    download(
      "variance-analysis.csv",
      toCsv(
        ["Line Item", "Actual", "Budget", "Variance", "Variance %", "Status"],
        result.rows.map((r) => [
          r.label,
          r.actual,
          r.budget,
          r.variance,
          `${r.pct.toFixed(1)}%`,
          r.favorable ? "Favorable" : "Unfavorable",
        ]),
      ),
    );
  };

  if (!table) {
    return (
      <div className="space-y-4">
        <PrivacyNote />
        <Dropzone onTable={onTable} hint="Upload Actuals vs Budget (CSV)" />
        <p className="text-center text-xs text-white/45">
          Need columns for a line-item label, an actual amount, and a budget/plan amount.{" "}
          <button onClick={() => onTable(parseCsv(SAMPLE))} className="font-medium text-navy hover:underline">
            Load sample data
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* mapping */}
      <Panel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <ColumnSelect table={table} value={label} onChange={setLabel} label="Line item" />
          <ColumnSelect table={table} value={actual} onChange={setActual} label="Actual" />
          <ColumnSelect table={table} value={budget} onChange={setBudget} label="Budget / Plan" />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-white/55">These are</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as MetricKind)}
              className="w-full cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-2 text-sm text-white outline-none focus:border-navy/40"
            >
              <option value="revenue">Revenue (higher = good)</option>
              <option value="cost">Cost / Expense (lower = good)</option>
            </select>
          </label>
        </div>
      </Panel>

      {result && (
        <>
          {/* summary */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Actual" value={fmtMoney(result.totals.actual)} />
            <StatCard label="Total Budget" value={fmtMoney(result.totals.budget)} />
            <StatCard
              label="Variance"
              value={fmtMoney(result.totals.variance)}
              sub={fmtPct(result.totals.pct)}
              tone={
                (kind === "revenue") === result.totals.variance >= 0 ? "good" : "bad"
              }
            />
            <StatCard
              label="Lines F / U"
              value={`${result.favorableCount} / ${result.unfavorableCount}`}
              sub="favorable / unfavorable"
            />
          </div>

          {/* bridge */}
          <Panel>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-white/40">
              Largest variances
            </p>
            <BarList items={top} />
          </Panel>

          {/* table */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-white/45">
                Line-item detail
              </span>
              <div className="flex gap-2">
                <button onClick={exportCsv} className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-xs text-white/60 hover:bg-white/[0.06] hover:text-white">
                  Export CSV
                </button>
                <button onClick={() => setTable(null)} className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-xs text-white/60 hover:bg-white/[0.06] hover:text-white">
                  New file
                </button>
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white/[0.04]">
                  <tr className="border-b border-white/[0.08] text-left font-mono text-[10px] uppercase tracking-wider text-white/40">
                    <th className="px-4 py-2 font-medium">Line item</th>
                    <th className="px-4 py-2 text-right font-medium">Actual</th>
                    <th className="px-4 py-2 text-right font-medium">Budget</th>
                    <th className="px-4 py-2 text-right font-medium">Variance</th>
                    <th className="px-4 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className="border-b border-white/[0.06] last:border-0">
                      <td className="px-4 py-2 text-white">{r.label}</td>
                      <td className="px-4 py-2 text-right font-mono text-white/70">{fmtMoney(r.actual)}</td>
                      <td className="px-4 py-2 text-right font-mono text-white/70">{fmtMoney(r.budget)}</td>
                      <td className={`px-4 py-2 text-right font-mono ${r.favorable ? "text-emerald-600" : "text-rose-600"}`}>
                        {fmtMoney(r.variance)}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono ${r.favorable ? "text-emerald-600" : "text-rose-600"}`}>
                        {fmtPct(r.pct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
