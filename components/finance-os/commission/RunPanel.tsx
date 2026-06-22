"use client";

import { useMemo, useState } from "react";
import { FileDrop } from "@/components/finance-os/FileDrop";
import { ColumnMapper } from "@/components/finance-os/ColumnMapper";
import { ExceptionPanel } from "@/components/finance-os/ExceptionPanel";
import { PrivacyNote } from "@/components/finance/shared";
import { fmtMoney } from "@/lib/finance/csv";
import {
  duplicates,
  foreignRef,
  missingValues,
  nonNegative,
  numericColumns,
  runValidation,
  type Exception,
} from "@/lib/finance-os/validate";
import { createAudit, type AuditRecord } from "@/lib/finance-os/audit";
import { buildRepFacts, computeCommission } from "@/lib/finance-os/commission/engine";
import type { CommissionPlan, CommissionRunResult, RepFacts } from "@/lib/finance-os/commission/types";
import type { ColumnMapping, Dataset } from "@/lib/finance-os/types";
import { uid } from "@/lib/utils";
import type { HubState } from "./CommissionHub";
import { SALES_FIELDS, TARGET_FIELDS } from "./fields";
import { buildSampleDatasets, carWashPlan } from "./sample";

const card = "rounded-2xl border border-fos-border bg-fos-surface p-5";

export function RunPanel({
  state,
  plan,
  onState,
  onMapping,
  onResults,
}: {
  state: HubState;
  plan: CommissionPlan;
  onState: (p: Partial<HubState>) => void;
  onMapping: (role: string, m: ColumnMapping) => void;
  onResults: (results: CommissionRunResult, audit: AuditRecord) => void;
}) {
  const [exceptions, setExceptions] = useState<Exception[] | null>(null);

  const sales = state.datasets.find((d) => d.role === "sales");
  const targets = state.datasets.find((d) => d.role === "target");
  const employee = state.datasets.find((d) => d.role === "employee");

  const salesMap = state.mappings.sales ?? null;
  const targetMap = state.mappings.target ?? null;

  const colName = (ds: Dataset | undefined, m: ColumnMapping | null, key: string) =>
    ds && m && m[key] != null && m[key] >= 0 ? ds.table.columns[m[key]] : null;

  const facts: RepFacts[] | null = useMemo(() => {
    if (!sales || !salesMap) return null;
    return buildRepFacts(sales.table, { sales: salesMap, targets: targetMap ?? undefined }, targets?.table);
  }, [sales, salesMap, targets, targetMap]);

  const validate = (): Exception[] => {
    if (!sales || !salesMap) return [];
    const rep = colName(sales, salesMap, "rep");
    const revenue = colName(sales, salesMap, "revenue");
    const numCols = ["revenue", "cost", "units", "collections"]
      .map((k) => colName(sales, salesMap, k))
      .filter((c): c is string => !!c);

    const rules = [
      rep ? missingValues([rep]) : null,
      revenue ? numericColumns([revenue]) : null,
      numCols.length ? nonNegative(numCols) : null,
      rep && revenue ? duplicates([rep, revenue, colName(sales, salesMap, "product") ?? rep]) : null,
      rep && employee
        ? foreignRef(
            rep,
            new Set(employeeNames(employee)),
            "rep (not in employee master)",
          )
        : null,
    ].filter(Boolean) as ReturnType<typeof missingValues>[];

    const ex = runValidation(sales.table, rules);

    // Missing targets: reps with sales but no quota.
    if (targets && facts) {
      for (const f of facts) {
        if (f.quota == null) ex.push({ id: uid("ex"), rule: "missing-target", severity: "warning", message: `Missing target for ${f.rep}` });
      }
    }
    return ex;
  };

  const run = () => {
    if (!facts || !sales) return;
    const ex = validate();
    setExceptions(ex);
    const results = computeCommission(facts, plan);
    const audit = createAudit({
      module: "Commission Hub",
      filesProcessed: state.datasets.map((d) => ({ name: d.name, role: d.role, rows: d.table.rows.length })),
      exceptions: ex,
      totals: {
        revenue: results.totals.revenue,
        commission: results.totals.totalCommission,
        reps: results.statements.length,
      },
      userActions: [{ at: Date.now(), action: "run-commission", detail: `${plan.name} v${plan.version}` }],
    });
    onResults(results, audit);
  };

  const loadSample = () => {
    // Load the car-wash dataset together with a matching car-wash commission plan
    // so "Compute" shows membership/retail commissions out of the box.
    const plan = carWashPlan();
    onState({ datasets: buildSampleDatasets(), mappings: {}, plans: [plan], activePlanId: plan.id });
    setExceptions(null);
  };

  return (
    <div className="space-y-5">
      <PrivacyNote />

      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fos-text">1 · Data</h3>
          <button onClick={loadSample} className="rounded-lg border border-fos-border px-3 py-1.5 text-xs text-fos-text hover:bg-fos-surface2">
            Load car-wash sample
          </button>
        </div>
        <FileDrop datasets={state.datasets} onChange={(datasets) => onState({ datasets })} defaultRole="sales" />
        <p className="mt-2 text-xs text-fos-muted">
          Tag one file as <b>Sales</b>, optionally <b>Targets</b> and <b>Employee Master</b>.
        </p>
      </div>

      {sales && (
        <div className={card}>
          <h3 className="mb-3 text-sm font-semibold text-fos-text">2 · Map sales columns</h3>
          <ColumnMapper
            table={sales.table}
            fields={SALES_FIELDS}
            value={salesMap}
            onChange={(m) => onMapping("sales", m)}
          />
        </div>
      )}

      {targets && (
        <div className={card}>
          <h3 className="mb-3 text-sm font-semibold text-fos-text">3 · Map target columns</h3>
          <ColumnMapper
            table={targets.table}
            fields={TARGET_FIELDS}
            value={targetMap}
            onChange={(m) => onMapping("target", m)}
          />
        </div>
      )}

      {exceptions && (
        <div className={card}>
          <h3 className="mb-3 text-sm font-semibold text-fos-text">Validation</h3>
          <ExceptionPanel exceptions={exceptions} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={run}
          disabled={!facts}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-40"
        >
          Validate &amp; Compute →
        </button>
        {facts && (
          <span className="text-sm text-fos-muted">
            {facts.length} reps · {fmtMoney(facts.reduce((s, f) => s + f.revenue, 0))} revenue · plan <b>{plan.name}</b>
          </span>
        )}
      </div>
    </div>
  );
}

function employeeNames(employee: Dataset): string[] {
  // Use the first non-numeric column as the name column.
  const nameCol = employee.table.columns.findIndex((c) => /name|rep|employee|owner/i.test(c));
  const idx = nameCol >= 0 ? nameCol : 0;
  return employee.table.rows.map((r) => r[idx]).filter(Boolean);
}
