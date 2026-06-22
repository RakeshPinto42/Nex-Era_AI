"use client";

import { KpiCard, KpiGrid } from "@/components/finance-os/dashboard/KpiCard";
import { RankingTable } from "@/components/finance-os/dashboard/RankingTable";
import { BarChartWidget } from "@/components/finance-os/dashboard/Charts";
import { HeatMap } from "@/components/finance-os/dashboard/HeatMap";
import { Filters, slicersFromRows } from "@/components/finance-os/dashboard/Filters";
import { useFilters } from "@/components/finance-os/dashboard/FilterContext";
import { fmtMoney } from "@/lib/finance/csv";
import type { CommissionRunResult, CommissionStatement } from "@/lib/finance-os/commission/types";

export function Dashboards({ results }: { results: CommissionRunResult | null }) {
  const { apply } = useFilters();
  if (!results) {
    return <p className="text-sm text-fos-muted">No results yet. Run a calculation first.</p>;
  }

  const rows = apply(results.statements as unknown as Record<string, unknown>[]) as unknown as CommissionStatement[];

  const revenue = sum(rows, (r) => r.revenue);
  const quota = sum(rows, (r) => r.quota ?? 0);
  const commission = sum(rows, (r) => r.totalCommission);
  const atts = rows.map((r) => r.attainmentPct).filter((a): a is number => a != null);
  const avgAtt = atts.length ? atts.reduce((a, b) => a + b, 0) / atts.length : 0;
  const commPct = revenue ? (commission / revenue) * 100 : 0;

  const byRegion = groupSum(rows, (r) => r.region || "—", (r) => r.totalCommission);
  const byProduct = groupSum(rows, (r) => r.product || "—", (r) => r.totalCommission);

  const sortedByComm = [...rows].sort((a, b) => b.totalCommission - a.totalCommission);
  const top = sortedByComm.slice(0, 5);
  const bottom = sortedByComm.slice(-5).reverse();

  const accel = rows
    .map((r) => ({ rep: r.rep, amt: r.modifiers.filter((m) => m.kind === "accelerator").reduce((s, m) => s + m.amount, 0) }))
    .filter((x) => x.amt > 0)
    .sort((a, b) => b.amt - a.amt);

  const slicers = slicersFromRows(rows as unknown as Record<string, unknown>[], [
    { dim: "region", label: "Region" },
    { dim: "product", label: "Product" },
  ]);

  return (
    <div className="space-y-5">
      <Filters slicers={slicers} />

      <KpiGrid>
        <KpiCard label="Revenue" value={fmtMoney(revenue)} tone="brand" />
        <KpiCard label="Target" value={quota ? fmtMoney(quota) : "—"} />
        <KpiCard label="Attainment %" value={`${avgAtt.toFixed(0)}%`} tone={avgAtt >= 100 ? "good" : "neutral"} />
        <KpiCard label="Commission Expense" value={fmtMoney(commission)} />
        <KpiCard label="Commission % of Rev" value={`${commPct.toFixed(1)}%`} />
        <KpiCard label="Reps" value={String(rows.length)} />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChartWidget title="Region Performance (click to filter)" data={byRegion} xKey="key" yKey="value" filterDim="region" />
        <BarChartWidget title="Product Performance (click to filter)" data={byProduct} xKey="key" yKey="value" filterDim="product" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankingTable title="Top Performers" items={top.map((r) => ({ label: r.rep, value: r.totalCommission, display: fmtMoney(r.totalCommission) }))} positiveOnly />
        <RankingTable title="Bottom Performers" items={bottom.map((r) => ({ label: r.rep, value: r.totalCommission, display: fmtMoney(r.totalCommission) }))} />
      </div>

      <HeatMap title="Attainment Distribution" values={atts} />

      <RankingTable
        title="Accelerator Tracking"
        items={accel.length ? accel.map((a) => ({ label: a.rep, value: a.amt, display: fmtMoney(a.amt) })) : []}
        positiveOnly
      />
    </div>
  );
}

const sum = <T,>(arr: T[], f: (t: T) => number) => arr.reduce((s, t) => s + f(t), 0);

function groupSum<T>(arr: T[], key: (t: T) => string, val: (t: T) => number) {
  const m = new Map<string, number>();
  for (const t of arr) m.set(key(t), (m.get(key(t)) ?? 0) + val(t));
  return [...m.entries()].map(([key, value]) => ({ key, value: Math.round(value) })).sort((a, b) => b.value - a.value);
}
