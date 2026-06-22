"use client";

import { useMemo, useState } from "react";
import type { Table } from "@/lib/finance/csv";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { UploadMapper } from "@/components/finance-os/UploadMapper";
import { KpiCard, KpiGrid } from "@/components/finance-os/dashboard/KpiCard";
import { ExceptionPanel } from "@/components/finance-os/ExceptionPanel";
import { fmtMoney } from "@/lib/finance/csv";
import { computeRevRec } from "@/lib/finance-os/revrec";
import { sampleRevenueLedger } from "@/lib/finance-os/samples";
import type { ColumnMapping, FieldSpec } from "@/lib/finance-os/types";

const FIELDS: FieldSpec[] = [
  { key: "amount", label: "Amount", synonyms: ["revenue", "value", "total"], numeric: true, required: true },
  { key: "customer", label: "Customer", synonyms: ["account", "client"], required: true },
  { key: "date", label: "Date", synonyms: ["posted", "period", "month"] },
  { key: "doc", label: "Document", synonyms: ["invoice", "doc", "ref", "id"] },
];

export function RevRec() {
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [period, setPeriod] = useState("2026");

  const result = useMemo(() => {
    if (!table || !mapping || (mapping.amount ?? -1) < 0) return null;
    return computeRevRec(table, mapping, period || undefined);
  }, [table, mapping, period]);

  const riskTone = result ? (result.riskScore >= 50 ? "bad" : result.riskScore >= 20 ? "neutral" : "good") : "neutral";

  return (
    <ModuleScreen slug="rev-rec" title="Revenue Recognition Validator">
      <UploadMapper
        fields={FIELDS}
        onData={(t, m) => { setTable(t); setMapping(m); }}
        sample={() => [sampleRevenueLedger()]}
        defaultRole="other"
        mapTitle="Map ledger columns"
      />

      {result && (
        <div className="mt-5 space-y-5">
          <div className="flex items-end gap-4 rounded-xl border border-line bg-white p-4">
            <label className="text-xs text-ink/70">
              Expected period (YYYY or YYYY-MM)
              <input className="mt-1 block w-40 rounded-lg border border-line px-2 py-1.5 text-sm" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </label>
          </div>

          <KpiGrid>
            <KpiCard label="Risk score" value={`${result.riskScore}`} tone={riskTone} delta="0–100" />
            <KpiCard label="Rows checked" value={result.checkedRows.toLocaleString()} />
            <KpiCard label="Exceptions" value={String(result.exceptions.length)} tone={result.exceptions.length ? "bad" : "good"} />
            <KpiCard label="Total revenue" value={fmtMoney(result.totalRevenue)} tone="brand" />
          </KpiGrid>

          <div className="rounded-xl border border-line bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">Checks</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(result.byCheck).map(([check, count]) => (
                <span key={check} className="rounded-full border border-line px-2.5 py-0.5 text-ink/70">
                  {check}: <b>{count}</b>
                </span>
              ))}
              {!Object.keys(result.byCheck).length && <span className="text-muted">All checks passed.</span>}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">Exceptions</h3>
            <ExceptionPanel exceptions={result.exceptions} />
          </div>
        </div>
      )}
    </ModuleScreen>
  );
}
