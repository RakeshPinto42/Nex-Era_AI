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
import { computeForecast, type Method } from "@/lib/finance/forecast";
import { Dropzone, ColumnSelect, StatCard, BarList, PrivacyNote, Panel } from "./shared";

const SAMPLE = `Month,Revenue
Jan,420000
Feb,448000
Mar,455000
Apr,489000
May,512000
Jun,534000
Jul,561000
Aug,588000`;

export default function ForecastTool() {
  const [table, setTable] = useState<Table | null>(null);
  const [period, setPeriod] = useState(0);
  const [value, setValue] = useState(1);
  const [periods, setPeriods] = useState(6);
  const [method, setMethod] = useState<Method>("trend");

  const onTable = (t: Table) => {
    const v = firstNumericCol(t, 1);
    setTable(t);
    setPeriod(0);
    setValue(v < 0 ? 1 : v);
  };

  const result = useMemo(
    () => (table ? computeForecast(table, { period, value }, { periods, method }) : null),
    [table, period, value, periods, method],
  );

  const bars = useMemo(() => {
    if (!result) return [];
    return result.points.map((p) => ({
      label: p.label,
      value: p.value,
      display: fmtMoney(p.value),
      color: p.projected ? "#5e9dff" : "#3b82f6",
    }));
  }, [result]);

  const exportCsv = () => {
    if (!result) return;
    download(
      "forecast.csv",
      toCsv(
        ["Period", "Value", "Type"],
        result.points.map((p) => [p.label, Math.round(p.value), p.projected ? "Forecast" : "Actual"]),
      ),
    );
  };

  if (!table) {
    return (
      <div className="space-y-4">
        <PrivacyNote />
        <Dropzone onTable={onTable} hint="Upload a historical series (CSV)" />
        <p className="text-center text-xs text-faint">
          Need a period column (month/quarter) and a value column (revenue, bookings…).{" "}
          <button onClick={() => onTable(parseCsv(SAMPLE))} className="font-medium text-navy hover:underline">
            Load sample data
          </button>
        </p>
      </div>
    );
  }

  const next = result?.points.find((p) => p.projected);

  return (
    <div className="space-y-5">
      <Panel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ColumnSelect table={table} value={period} onChange={setPeriod} label="Period" />
          <ColumnSelect table={table} value={value} onChange={setValue} label="Value" />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Periods ahead</span>
            <input
              type="number"
              min={1}
              max={36}
              value={periods}
              onChange={(e) => setPeriods(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 text-sm outline-none focus:border-navy/40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Method</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
              className="w-full cursor-pointer rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 text-sm outline-none focus:border-navy/40"
            >
              <option value="trend">Linear trend</option>
              <option value="growth">Compound growth</option>
            </select>
          </label>
        </div>
      </Panel>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="CAGR / period" value={fmtPct(result.cagr)} tone={result.cagr >= 0 ? "good" : "bad"} />
            <StatCard label="Avg growth" value={fmtPct(result.avgGrowth)} tone={result.avgGrowth >= 0 ? "good" : "bad"} />
            <StatCard label="Next period" value={next ? fmtMoney(next.value) : "—"} sub={next?.label} />
            <StatCard label="History" value={`${result.history.length}`} sub="periods in" />
          </div>

          <Panel>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
                Actual + forecast
              </p>
              <span className="flex items-center gap-3 text-[11px] text-faint">
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm" style={{ background: "#3b82f6" }} /> actual</span>
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm" style={{ background: "#5e9dff" }} /> forecast</span>
              </span>
            </div>
            <BarList items={bars} />
          </Panel>

          <div className="overflow-hidden rounded-2xl border border-line">
            <div className="flex items-center justify-between border-b border-line bg-surface-2/60 px-4 py-2.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-faint">Projection detail</span>
              <div className="flex gap-2">
                <button onClick={exportCsv} className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink">Export CSV</button>
                <button onClick={() => setTable(null)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink">New file</button>
              </div>
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-2">
                  <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-wider text-faint">
                    <th className="px-4 py-2 font-medium">Period</th>
                    <th className="px-4 py-2 text-right font-medium">Value</th>
                    <th className="px-4 py-2 text-right font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {result.points.map((p, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      <td className="px-4 py-2 text-ink">{p.label}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted">{fmtMoney(p.value)}</td>
                      <td className={`px-4 py-2 text-right font-mono text-[11px] uppercase ${p.projected ? "text-ice" : "text-faint"}`}>
                        {p.projected ? "Forecast" : "Actual"}
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
