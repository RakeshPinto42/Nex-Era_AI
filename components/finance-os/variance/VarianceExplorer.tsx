"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Table } from "@/lib/finance/csv";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { UploadMapper } from "@/components/finance-os/UploadMapper";
import { KpiCard, KpiGrid } from "@/components/finance-os/dashboard/KpiCard";
import { DataGrid } from "@/components/finance-os/dashboard/DataGrid";
import { RankingTable } from "@/components/finance-os/dashboard/RankingTable";
import { ExportMenu } from "@/components/finance-os/ExportMenu";
import { fmtMoney, fmtPct } from "@/lib/finance/csv";
import { computeVariance, type MetricKind, type VarianceRow } from "@/lib/finance/variance";
import { sampleDataset } from "@/lib/finance-os/samples";
import type { ColumnMapping, FieldSpec } from "@/lib/finance-os/types";

const FIELDS: FieldSpec[] = [
  { key: "label", label: "Line item", synonyms: ["account", "category", "item", "name"], required: true },
  { key: "actual", label: "Actual", synonyms: ["actuals", "result"], numeric: true, required: true },
  { key: "budget", label: "Budget", synonyms: ["plan", "forecast", "target"], numeric: true, required: true },
];

export function VarianceExplorer() {
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [kind, setKind] = useState<MetricKind>("revenue");

  const result = useMemo(() => {
    if (!table || !mapping || mapping.label < 0 || mapping.actual < 0 || mapping.budget < 0) return null;
    return computeVariance(table, { label: mapping.label, actual: mapping.actual, budget: mapping.budget, kind });
  }, [table, mapping, kind]);

  const columns: ColumnDef<VarianceRow, unknown>[] = [
    { accessorKey: "label", header: "Line item" },
    { accessorKey: "actual", header: "Actual", cell: (c) => fmtMoney(c.getValue<number>()) },
    { accessorKey: "budget", header: "Budget", cell: (c) => fmtMoney(c.getValue<number>()) },
    { accessorKey: "variance", header: "Variance", cell: (c) => fmtMoney(c.getValue<number>()) },
    { accessorKey: "pct", header: "%", cell: (c) => fmtPct(c.getValue<number>()) },
    { accessorKey: "favorable", header: "Status", cell: (c) => (c.getValue<boolean>() ? "✓ Fav" : "✕ Unfav") },
  ];

  const drivers = result
    ? [...result.rows].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)).slice(0, 6)
    : [];

  return (
    <ModuleScreen slug="variance" title="Variance Explorer">
      <UploadMapper
        fields={FIELDS}
        onData={(t, m) => { setTable(t); setMapping(m); }}
        sample={() => [sampleDataset("pnl-variance", "actuals")]}
        defaultRole="actuals"
        mapTitle="Map line item, actual & budget"
      />

      {result && (
        <div className="mt-5 space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-fos-border bg-fos-surface p-3 text-sm">
            <span className="text-fos-text">Metric type:</span>
            {(["revenue", "cost"] as const).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={`rounded-lg border px-3 py-1 text-xs capitalize ${kind === k ? "border-brand-600 bg-brand-50 text-brand-600" : "border-fos-border text-fos-text"}`}>
                {k} {k === "revenue" ? "(higher=good)" : "(lower=good)"}
              </button>
            ))}
          </div>

          <KpiGrid>
            <KpiCard label="Actual" value={fmtMoney(result.totals.actual)} tone="brand" />
            <KpiCard label="Budget" value={fmtMoney(result.totals.budget)} />
            <KpiCard label="Variance" value={fmtMoney(result.totals.variance)} tone={result.totals.variance >= 0 ? "good" : "bad"} delta={fmtPct(result.totals.pct)} />
            <KpiCard label="Favorable / Unfav" value={`${result.favorableCount} / ${result.unfavorableCount}`} />
          </KpiGrid>

          <RankingTable title="Largest variance drivers" items={drivers.map((d) => ({ label: d.label, value: d.variance, display: fmtMoney(d.variance) }))} />

          <div className="flex justify-end">
            <ExportMenu
              filename="variance"
              columns={[
                { header: "Line item", key: "label" }, { header: "Actual", key: "actual" },
                { header: "Budget", key: "budget" }, { header: "Variance", key: "variance" }, { header: "%", key: "pct" },
              ]}
              rows={result.rows.map((r) => ({ label: r.label, actual: Math.round(r.actual), budget: Math.round(r.budget), variance: Math.round(r.variance), pct: r.pct.toFixed(1) }))}
              title="Variance Analysis"
            />
          </div>

          <DataGrid columns={columns} data={result.rows} />
        </div>
      )}
    </ModuleScreen>
  );
}
