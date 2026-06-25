"use client";

import { useMemo, useState } from "react";
import {
  parseCsv,
  firstNumericCol,
  fmtMoney,
  toCsv,
  download,
  type Table,
} from "@/lib/finance/csv";
import { computeMargin } from "@/lib/finance/margin";
import { Dropzone, ColumnSelect, StatCard, BarList, PrivacyNote, Panel } from "./shared";

const SAMPLE = `Product,Revenue,Cost
Platform,1500000,720000
Analytics,980000,540000
Premium Support,620000,410000
Integrations,340000,150000
Professional Services,410000,360000`;

export default function MarginTool() {
  const [table, setTable] = useState<Table | null>(null);
  const [segment, setSegment] = useState(0);
  const [revenue, setRevenue] = useState(1);
  const [cost, setCost] = useState(2);

  const onTable = (t: Table) => {
    const a = firstNumericCol(t, 1);
    const b = firstNumericCol(t, (a < 0 ? 1 : a) + 1);
    setTable(t);
    setSegment(0);
    setRevenue(a < 0 ? 1 : a);
    setCost(b < 0 ? (a < 0 ? 2 : a + 1) : b);
  };

  const result = useMemo(
    () => (table ? computeMargin(table, { segment, revenue, cost }) : null),
    [table, segment, revenue, cost],
  );

  const bars = useMemo(() => {
    if (!result) return [];
    return result.rows.map((r) => ({
      label: r.segment,
      value: r.margin,
      display: `${r.margin.toFixed(1)}%`,
      color: r.margin >= 50 ? "#059669" : r.margin >= 25 ? "#3b82f6" : "#e11d48",
    }));
  }, [result]);

  const exportCsv = () => {
    if (!result) return;
    download(
      "margin-analysis.csv",
      toCsv(
        ["Segment", "Revenue", "Cost", "Gross Profit", "Margin %"],
        result.rows.map((r) => [r.segment, r.revenue, r.cost, r.profit, r.margin.toFixed(1)]),
      ),
    );
  };

  if (!table) {
    return (
      <div className="space-y-4">
        <PrivacyNote />
        <Dropzone onTable={onTable} hint="Upload revenue + cost by segment (CSV)" />
        <p className="text-center text-xs text-white/45">
          Need a segment/product column, a revenue column, and a cost column.{" "}
          <button onClick={() => onTable(parseCsv(SAMPLE))} className="font-medium text-navy hover:underline">
            Load sample data
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ColumnSelect table={table} value={segment} onChange={setSegment} label="Segment / product" />
          <ColumnSelect table={table} value={revenue} onChange={setRevenue} label="Revenue" />
          <ColumnSelect table={table} value={cost} onChange={setCost} label="Cost" />
        </div>
      </Panel>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Revenue" value={fmtMoney(result.totals.revenue)} />
            <StatCard label="Total Cost" value={fmtMoney(result.totals.cost)} />
            <StatCard label="Gross Profit" value={fmtMoney(result.totals.profit)} tone={result.totals.profit >= 0 ? "good" : "bad"} />
            <StatCard label="Blended Margin" value={`${result.totals.margin.toFixed(1)}%`} />
          </div>

          <Panel>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-white/40">
              Gross margin % by segment
            </p>
            <BarList items={bars} />
          </Panel>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-2.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-white/45">Segment detail</span>
              <div className="flex gap-2">
                <button onClick={exportCsv} className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-xs text-white/60 hover:bg-white/[0.06] hover:text-white">Export CSV</button>
                <button onClick={() => setTable(null)} className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-xs text-white/60 hover:bg-white/[0.06] hover:text-white">New file</button>
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white/[0.04]">
                  <tr className="border-b border-white/[0.08] text-left font-mono text-[10px] uppercase tracking-wider text-white/40">
                    <th className="px-4 py-2 font-medium">Segment</th>
                    <th className="px-4 py-2 text-right font-medium">Revenue</th>
                    <th className="px-4 py-2 text-right font-medium">Cost</th>
                    <th className="px-4 py-2 text-right font-medium">Gross Profit</th>
                    <th className="px-4 py-2 text-right font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className="border-b border-white/[0.06] last:border-0">
                      <td className="px-4 py-2 text-white">{r.segment}</td>
                      <td className="px-4 py-2 text-right font-mono text-white/70">{fmtMoney(r.revenue)}</td>
                      <td className="px-4 py-2 text-right font-mono text-white/70">{fmtMoney(r.cost)}</td>
                      <td className="px-4 py-2 text-right font-mono text-white">{fmtMoney(r.profit)}</td>
                      <td className={`px-4 py-2 text-right font-mono ${r.margin >= 25 ? "text-emerald-600" : "text-rose-600"}`}>
                        {r.margin.toFixed(1)}%
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
