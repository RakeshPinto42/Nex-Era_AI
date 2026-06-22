"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataGrid } from "@/components/finance-os/dashboard/DataGrid";
import { ExportMenu } from "@/components/finance-os/ExportMenu";
import { fmtMoney } from "@/lib/finance/csv";
import { exportStatementsPdf, type Column, type Row } from "@/lib/finance-os/export";
import type { AuditRecord } from "@/lib/finance-os/audit";
import type { CommissionPlan, CommissionRunResult, CommissionStatement } from "@/lib/finance-os/commission/types";

const pct = (n: number | null) => (n == null ? "—" : `${n.toFixed(0)}%`);

export function Statements({
  results,
  plan,
  audit,
}: {
  results: CommissionRunResult | null;
  plan: CommissionPlan;
  audit: AuditRecord[];
}) {
  if (!results) {
    return <p className="text-sm text-muted">No results yet. Go to the <b>Run</b> tab and compute.</p>;
  }

  const columns: ColumnDef<CommissionStatement, unknown>[] = [
    { accessorKey: "rep", header: "Rep" },
    { accessorKey: "region", header: "Region" },
    { accessorKey: "metric", header: () => "Metric", cell: (c) => fmtMoney(c.getValue<number>()) },
    { accessorKey: "quota", header: "Quota", cell: (c) => (c.getValue<number | null>() == null ? "—" : fmtMoney(c.getValue<number>())) },
    { accessorKey: "attainmentPct", header: "Attain", cell: (c) => pct(c.getValue<number | null>()) },
    { accessorKey: "baseCommission", header: "Base", cell: (c) => fmtMoney(c.getValue<number>()) },
    { accessorKey: "totalCommission", header: "Total", cell: (c) => fmtMoney(c.getValue<number>()) },
    { accessorKey: "effRate", header: "Eff %", cell: (c) => `${c.getValue<number>().toFixed(1)}%` },
  ];

  const exportColumns: Column[] = [
    { header: "Rep", key: "rep" },
    { header: "Region", key: "region" },
    { header: "Product", key: "product" },
    { header: "Metric", key: "metric" },
    { header: "Quota", key: "quota" },
    { header: "Attainment %", key: "attainmentPct" },
    { header: "Base", key: "baseCommission" },
    { header: "Total Commission", key: "totalCommission" },
  ];
  const exportRows: Row[] = results.statements.map((s) => ({
    rep: s.rep,
    region: s.region,
    product: s.product,
    metric: Math.round(s.metric),
    quota: s.quota ?? "",
    attainmentPct: s.attainmentPct == null ? "" : Math.round(s.attainmentPct),
    baseCommission: Math.round(s.baseCommission),
    totalCommission: Math.round(s.totalCommission),
  }));

  const statementsPdf = () =>
    exportStatementsPdf(
      "commission_statements",
      results.statements.map((s) => ({
        title: `Commission Statement — ${s.rep}`,
        lines: [
          `Plan: ${plan.name} (v${plan.version})`,
          `${s.metricLabel}: ${fmtMoney(s.metric)}   Quota: ${s.quota == null ? "—" : fmtMoney(s.quota)}   Attainment: ${pct(s.attainmentPct)}`,
        ],
        columns: [
          { header: "Line", key: "line" },
          { header: "Amount", key: "amount" },
        ],
        rows: [
          { line: "Base commission", amount: fmtMoney(s.baseCommission) },
          ...s.modifiers.map((m) => ({ line: m.label, amount: fmtMoney(m.amount) })),
          { line: "TOTAL", amount: fmtMoney(s.totalCommission) },
        ],
      })),
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {results.statements.length} statements · total payout{" "}
          <b className="text-ink">{fmtMoney(results.totals.totalCommission)}</b>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            filename="commission_results"
            columns={exportColumns}
            rows={exportRows}
            title="Commission Results"
            subtitle={[`Plan: ${plan.name} v${plan.version}`]}
          />
          <button
            onClick={statementsPdf}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:scale-[1.02]"
          >
            Batch PDF statements
          </button>
        </div>
      </div>

      <DataGrid
        columns={columns}
        data={results.statements}
        renderDetail={(s) => (
          <div className="text-sm">
            <p className="mb-2 font-semibold text-ink">{s.rep} — payout breakdown</p>
            <table className="w-72">
              <tbody>
                <tr>
                  <td className="py-0.5 text-ink/70">Base commission</td>
                  <td className="py-0.5 text-right font-mono">{fmtMoney(s.baseCommission)}</td>
                </tr>
                {s.modifiers.map((m, i) => (
                  <tr key={i}>
                    <td className="py-0.5 text-ink/70">{m.label}</td>
                    <td className={`py-0.5 text-right font-mono ${m.amount < 0 ? "text-rose-600" : ""}`}>{fmtMoney(m.amount)}</td>
                  </tr>
                ))}
                <tr className="border-t border-line">
                  <td className="py-0.5 font-semibold">Total</td>
                  <td className="py-0.5 text-right font-mono font-semibold">{fmtMoney(s.totalCommission)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      />

      <AuditTrail audit={audit} />
    </div>
  );
}

function AuditTrail({ audit }: { audit: AuditRecord[] }) {
  if (!audit.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-ink">Audit trail</h3>
      <div className="space-y-2">
        {audit.map((a) => (
          <div key={a.runId} className="rounded-lg border border-line bg-canvas px-3 py-2 text-xs">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-mono text-muted">{a.runId}</span>
              <span className="text-muted">{new Date(a.timestamp).toLocaleString()}</span>
            </div>
            <div className="mt-1 text-ink/80">
              {a.filesProcessed.length} files · {a.validationExceptions} exceptions (
              {a.exceptionsBySeverity.error}E/{a.exceptionsBySeverity.warning}W) · payout{" "}
              {fmtMoney(a.totals.commission ?? 0)} · {a.totals.reps ?? 0} reps
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
