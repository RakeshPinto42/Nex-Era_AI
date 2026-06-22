"use client";

import { useMemo, useState } from "react";
import { toNum, type Table } from "@/lib/finance/csv";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { UploadMapper } from "@/components/finance-os/UploadMapper";
import { KpiCard, KpiGrid } from "@/components/finance-os/dashboard/KpiCard";
import { fmtMoney } from "@/lib/finance/csv";
import { exportStatementsPdf, exportExcel } from "@/lib/finance-os/export";
import { sampleCommissionResults } from "@/lib/finance-os/samples";
import type { ColumnMapping, FieldSpec } from "@/lib/finance-os/types";

const FIELDS: FieldSpec[] = [
  { key: "employee", label: "Employee", synonyms: ["rep", "name", "salesperson", "owner"], required: true },
  { key: "amount", label: "Payout", synonyms: ["commission", "payout", "amount", "total"], numeric: true, required: true },
  { key: "revenue", label: "Revenue", synonyms: ["sales", "bookings"], numeric: true },
  { key: "region", label: "Region", synonyms: ["territory", "geo"] },
];

type Stmt = { employee: string; amount: number; revenue: number; region: string };

export function StatementFactory() {
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);

  const stmts = useMemo<Stmt[]>(() => {
    if (!table || !mapping || (mapping.employee ?? -1) < 0 || (mapping.amount ?? -1) < 0) return [];
    const byEmp = new Map<string, Stmt>();
    for (const r of table.rows) {
      const employee = (r[mapping.employee] ?? "").trim();
      if (!employee) continue;
      const cur = byEmp.get(employee) ?? { employee, amount: 0, revenue: 0, region: "" };
      cur.amount += toNum(r[mapping.amount]) || 0;
      if ((mapping.revenue ?? -1) >= 0) cur.revenue += toNum(r[mapping.revenue]) || 0;
      if ((mapping.region ?? -1) >= 0 && !cur.region) cur.region = (r[mapping.region] ?? "").trim();
      byEmp.set(employee, cur);
    }
    return [...byEmp.values()].sort((a, b) => b.amount - a.amount);
  }, [table, mapping]);

  const total = stmts.reduce((s, x) => s + x.amount, 0);

  const batchPdf = () =>
    exportStatementsPdf(
      "sales_statements",
      stmts.map((s) => ({
        title: `Statement — ${s.employee}`,
        lines: [s.region ? `Region: ${s.region}` : "", `Generated ${new Date().toLocaleDateString()}`].filter(Boolean),
        columns: [{ header: "Line", key: "line" }, { header: "Amount", key: "amount" }],
        rows: [
          ...(s.revenue ? [{ line: "Revenue", amount: fmtMoney(s.revenue) }] : []),
          { line: "Total payout", amount: fmtMoney(s.amount) },
        ],
      })),
    );

  const batchExcel = () =>
    exportExcel(
      "sales_statements",
      [{ header: "Employee", key: "employee" }, { header: "Region", key: "region" }, { header: "Revenue", key: "revenue" }, { header: "Payout", key: "amount" }],
      stmts.map((s) => ({ employee: s.employee, region: s.region, revenue: Math.round(s.revenue), amount: Math.round(s.amount) })),
    );

  return (
    <ModuleScreen slug="statements" title="Sales Statement Factory">
      <UploadMapper
        fields={FIELDS}
        onData={(t, m) => { setTable(t); setMapping(m); }}
        sample={() => [sampleCommissionResults()]}
        defaultRole="other"
        mapTitle="Map employee & payout"
      />

      {stmts.length > 0 && (
        <div className="mt-5 space-y-5">
          <KpiGrid>
            <KpiCard label="Employees" value={String(stmts.length)} tone="brand" />
            <KpiCard label="Total payout" value={fmtMoney(total)} />
            <KpiCard label="Avg payout" value={fmtMoney(total / stmts.length)} />
          </KpiGrid>

          <div className="flex gap-2">
            <button onClick={batchPdf} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:scale-[1.02]">
              Generate {stmts.length} PDF statements
            </button>
            <button onClick={batchExcel} className="rounded-lg border border-fos-border px-4 py-2 text-sm font-medium text-fos-text hover:bg-fos-surface2">
              Export Excel summary
            </button>
          </div>

          <div className="overflow-auto rounded-xl border border-fos-border bg-fos-surface">
            <table className="w-full text-sm">
              <thead className="bg-fos-surface2">
                <tr className="text-left text-fos-muted">
                  <th className="px-3 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Region</th>
                  <th className="px-3 py-2 font-medium text-right">Revenue</th>
                  <th className="px-3 py-2 font-medium text-right">Payout</th>
                </tr>
              </thead>
              <tbody>
                {stmts.map((s) => (
                  <tr key={s.employee} className="border-t border-line/60">
                    <td className="px-3 py-1.5 text-fos-text">{s.employee}</td>
                    <td className="px-3 py-1.5 text-fos-text">{s.region || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{s.revenue ? fmtMoney(s.revenue) : "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtMoney(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ModuleScreen>
  );
}
