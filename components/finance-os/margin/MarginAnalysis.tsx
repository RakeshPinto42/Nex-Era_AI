"use client";

import { useMemo, useState } from "react";
import type { Table } from "@/lib/finance/csv";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { UploadMapper } from "@/components/finance-os/UploadMapper";
import { WaterfallChart } from "@/components/finance-os/dashboard/Charts";
import { ExportMenu } from "@/components/finance-os/ExportMenu";
import { fmtMoney } from "@/lib/finance/csv";
import { computeMargin } from "@/lib/finance/margin";
import { sampleDataset } from "@/lib/finance-os/samples";
import type { ColumnMapping, FieldSpec } from "@/lib/finance-os/types";

const ACCENT = "#e11d48";
const FIELDS: FieldSpec[] = [
  { key: "segment", label: "Segment / Product", synonyms: ["product", "category", "line", "sku"], required: true },
  { key: "revenue", label: "Revenue", synonyms: ["sales", "amount"], numeric: true, required: true },
  { key: "cost", label: "Cost", synonyms: ["cogs", "cost of goods"], numeric: true, required: true },
];

export function MarginAnalysis() {
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);

  const result = useMemo(() => {
    if (!table || !mapping || mapping.segment < 0 || mapping.revenue < 0 || mapping.cost < 0) return null;
    return computeMargin(table, { segment: mapping.segment, revenue: mapping.revenue, cost: mapping.cost });
  }, [table, mapping]);

  return (
    <ModuleScreen slug="margin" title="Margin Analysis">
      <UploadMapper
        fields={FIELDS}
        onData={(t, m) => { setTable(t); setMapping(m); }}
        sample={() => [sampleDataset("product-margin", "other")]}
        defaultRole="other"
        mapTitle="Map segment, revenue & cost"
      />

      {result && (
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* ---- P&L statement sheet ---- */}
          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="flex items-center justify-between border-b-2 px-5 py-3" style={{ borderColor: ACCENT }}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Profit &amp; Loss — by segment</h3>
                <ExportMenu
                  filename="margin_analysis"
                  columns={[{ header: "Segment", key: "segment" }, { header: "Revenue", key: "revenue" }, { header: "Cost", key: "cost" }, { header: "Gross Profit", key: "profit" }, { header: "Margin %", key: "margin" }]}
                  rows={result.rows.map((r) => ({ segment: r.segment, revenue: Math.round(r.revenue), cost: Math.round(r.cost), profit: Math.round(r.profit), margin: r.margin.toFixed(1) }))}
                  title="Margin Analysis"
                />
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-right font-mono text-[10px] uppercase tracking-wider text-muted">
                    <th className="px-5 py-2 text-left">Segment</th>
                    <th className="px-3 py-2">Revenue</th>
                    <th className="px-3 py-2">Cost</th>
                    <th className="px-3 py-2">Gross Profit</th>
                    <th className="px-5 py-2 text-left">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.segment} className="border-b border-line/50">
                      <td className="px-5 py-2 text-ink">{r.segment}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">{fmtMoney(r.revenue)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">({fmtMoney(r.cost)})</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums font-medium text-slate-900">{fmtMoney(r.profit)}</td>
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded bg-black/5">
                            <div className="h-full rounded" style={{ width: `${Math.max(0, Math.min(100, r.margin))}%`, background: ACCENT }} />
                          </div>
                          <span className="w-12 text-right font-mono text-xs tabular-nums text-ink">{r.margin.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold" style={{ borderColor: ACCENT }}>
                    <td className="px-5 py-3 text-slate-900">Total</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-900">{fmtMoney(result.totals.revenue)}</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">({fmtMoney(result.totals.cost)})</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums" style={{ color: ACCENT }}>{fmtMoney(result.totals.profit)}</td>
                    <td className="px-5 py-3 font-mono text-slate-900">{result.totals.margin.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ---- summary + build-up ---- */}
          <div className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Blended gross margin</p>
              <p className="text-4xl font-semibold tabular-nums" style={{ color: ACCENT }}>{result.totals.margin.toFixed(1)}%</p>
              <p className="mt-1 text-sm text-muted">{fmtMoney(result.totals.profit)} gross profit on {fmtMoney(result.totals.revenue)} revenue</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-canvas p-2">
                  <p className="text-[10px] uppercase text-muted">Best margin</p>
                  <p className="font-medium text-slate-900">{[...result.rows].sort((a, b) => b.margin - a.margin)[0]?.segment} · {[...result.rows].sort((a, b) => b.margin - a.margin)[0]?.margin.toFixed(0)}%</p>
                </div>
                <div className="rounded-lg bg-canvas p-2">
                  <p className="text-[10px] uppercase text-muted">Worst margin</p>
                  <p className="font-medium text-slate-900">{[...result.rows].sort((a, b) => a.margin - b.margin)[0]?.segment} · {[...result.rows].sort((a, b) => a.margin - b.margin)[0]?.margin.toFixed(0)}%</p>
                </div>
              </div>
            </div>
            <WaterfallChart title="Gross profit build-up" steps={result.rows.map((r) => ({ label: r.segment, value: r.profit }))} />
          </div>
        </div>
      )}
    </ModuleScreen>
  );
}
