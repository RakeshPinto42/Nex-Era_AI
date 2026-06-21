"use client";

import { useMemo, useState } from "react";
import type { Table } from "@/lib/finance/csv";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { UploadMapper } from "@/components/finance-os/UploadMapper";
import { KpiCard, KpiGrid } from "@/components/finance-os/dashboard/KpiCard";
import { RankingTable } from "@/components/finance-os/dashboard/RankingTable";
import { fmtMoney, fmtPct } from "@/lib/finance/csv";
import { computeVariance } from "@/lib/finance/variance";
import { exportExcel, exportPdfTable } from "@/lib/finance-os/export";
import { sampleDataset } from "@/lib/finance-os/samples";
import type { ColumnMapping, FieldSpec } from "@/lib/finance-os/types";

const FIELDS: FieldSpec[] = [
  { key: "label", label: "Line item", synonyms: ["account", "category", "item"], required: true },
  { key: "actual", label: "Actual", synonyms: ["actuals", "result"], numeric: true, required: true },
  { key: "budget", label: "Budget", synonyms: ["plan", "target", "forecast"], numeric: true, required: true },
];

export function ExecutivePack() {
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);

  const result = useMemo(() => {
    if (!table || !mapping || mapping.label < 0 || mapping.actual < 0 || mapping.budget < 0) return null;
    return computeVariance(table, { label: mapping.label, actual: mapping.actual, budget: mapping.budget, kind: "revenue" });
  }, [table, mapping]);

  const risks = result ? result.rows.filter((r) => r.variance < 0).sort((a, b) => a.variance - b.variance).slice(0, 5) : [];
  const opps = result ? result.rows.filter((r) => r.variance > 0).sort((a, b) => b.variance - a.variance).slice(0, 5) : [];

  const summaryLines = result
    ? [
        `Actual: ${fmtMoney(result.totals.actual)}   Budget: ${fmtMoney(result.totals.budget)}`,
        `Variance: ${fmtMoney(result.totals.variance)} (${fmtPct(result.totals.pct)})   Favorable lines: ${result.favorableCount}/${result.rows.length}`,
      ]
    : [];

  const exportColumns = [
    { header: "Line item", key: "label" }, { header: "Actual", key: "actual" },
    { header: "Budget", key: "budget" }, { header: "Variance", key: "variance" }, { header: "%", key: "pct" },
  ];
  const exportRows = result
    ? result.rows.map((r) => ({ label: r.label, actual: Math.round(r.actual), budget: Math.round(r.budget), variance: Math.round(r.variance), pct: r.pct.toFixed(1) }))
    : [];

  return (
    <ModuleScreen slug="exec-pack" title="Executive Pack Generator">
      <UploadMapper
        fields={FIELDS}
        onData={(t, m) => { setTable(t); setMapping(m); }}
        sample={() => [sampleDataset("pnl-variance", "actuals")]}
        defaultRole="actuals"
        mapTitle="Map line item, actual & budget"
      />

      {result && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => exportPdfTable("executive_pack", exportColumns, exportRows, { title: "Executive Pack", subtitle: summaryLines })}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:scale-[1.02]"
            >
              Generate PDF pack
            </button>
            <button onClick={() => exportExcel("executive_pack", exportColumns, exportRows)} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas">
              Export Excel
            </button>
          </div>

          <KpiGrid>
            <KpiCard label="Actual" value={fmtMoney(result.totals.actual)} tone="brand" />
            <KpiCard label="Budget" value={fmtMoney(result.totals.budget)} />
            <KpiCard label="Variance" value={fmtMoney(result.totals.variance)} tone={result.totals.variance >= 0 ? "good" : "bad"} delta={fmtPct(result.totals.pct)} />
            <KpiCard label="Favorable lines" value={`${result.favorableCount}/${result.rows.length}`} />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankingTable title="Top risks (unfavorable)" items={risks.map((r) => ({ label: r.label, value: r.variance, display: fmtMoney(r.variance) }))} />
            <RankingTable title="Top opportunities (favorable)" items={opps.map((r) => ({ label: r.label, value: r.variance, display: fmtMoney(r.variance) }))} positiveOnly />
          </div>
        </div>
      )}
    </ModuleScreen>
  );
}
