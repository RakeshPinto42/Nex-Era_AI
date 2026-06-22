"use client";

// Deal Desk pipeline analytics: cross-filterable view over the approval queue.
// Click a customer/risk bar to slice every widget. Mirrors the Commission Hub
// Dashboards pattern so the dashboard kit stays consistent across modules.

import { KpiCard, KpiGrid } from "@/components/finance-os/dashboard/KpiCard";
import { RankingTable } from "@/components/finance-os/dashboard/RankingTable";
import { BarChartWidget } from "@/components/finance-os/dashboard/Charts";
import { HeatMap } from "@/components/finance-os/dashboard/HeatMap";
import { Filters, slicersFromRows } from "@/components/finance-os/dashboard/Filters";
import { useFilters } from "@/components/finance-os/dashboard/FilterContext";
import { fmtMoney } from "@/lib/finance/csv";
import { computeDeal, type DealInput, type RiskLevel } from "@/lib/finance-os/dealdesk";

type Status = "Pending" | "Approved" | "Rejected";
type Deal = DealInput & { id: string; name: string; customer: string; status: Status };

// Flat record so FilterContext.apply() can slice on string dimensions.
type DealRow = {
  id: string;
  name: string;
  customer: string;
  status: Status;
  risk: RiskLevel;
  revenue: number;
  grossProfit: number;
  discountPct: number;
  marginPct: number;
};

export function Dashboards({ deals }: { deals: Deal[] }) {
  const { apply } = useFilters();

  const allRows: DealRow[] = deals.map((d) => {
    const r = computeDeal(d);
    return {
      id: d.id,
      name: d.name,
      customer: d.customer,
      status: d.status,
      risk: r.risk,
      revenue: r.revenue,
      grossProfit: r.grossProfit,
      discountPct: r.discountPct,
      marginPct: r.marginPct,
    };
  });

  const rows = apply(allRows as unknown as Record<string, unknown>[]) as unknown as DealRow[];

  if (!rows.length) {
    return <p className="text-sm text-fos-muted">No deals match the current filters.</p>;
  }

  const revenue = sum(rows, (r) => r.revenue);
  const grossProfit = sum(rows, (r) => r.grossProfit);
  const blendedMargin = revenue ? (grossProfit / revenue) * 100 : 0;
  const avgDiscount = rows.reduce((s, r) => s + r.discountPct, 0) / rows.length;
  const pending = rows.filter((r) => r.status === "Pending").length;
  const approved = rows.filter((r) => r.status === "Approved").length;

  const byCustomer = groupSum(rows, (r) => r.customer || "—", (r) => r.revenue);
  const byRisk = groupSum(rows, (r) => r.risk, (r) => r.grossProfit);

  const sortedByRev = [...rows].sort((a, b) => b.revenue - a.revenue);
  const topDeals = sortedByRev.slice(0, 5);
  const deepestDiscounts = [...rows].sort((a, b) => b.discountPct - a.discountPct).slice(0, 5);

  const margins = rows.map((r) => r.marginPct);

  const slicers = slicersFromRows(rows as unknown as Record<string, unknown>[], [
    { dim: "customer", label: "Customer" },
    { dim: "status", label: "Status" },
    { dim: "risk", label: "Risk" },
  ]);

  return (
    <div className="space-y-5">
      <Filters slicers={slicers} />

      <KpiGrid>
        <KpiCard label="Pipeline Value" value={fmtMoney(revenue)} tone="brand" />
        <KpiCard label="Gross Profit" value={fmtMoney(grossProfit)} tone={grossProfit >= 0 ? "good" : "bad"} />
        <KpiCard label="Blended Margin" value={`${blendedMargin.toFixed(1)}%`} tone={blendedMargin >= 20 ? "good" : "bad"} />
        <KpiCard label="Avg Discount" value={`${avgDiscount.toFixed(1)}%`} tone={avgDiscount > 25 ? "bad" : "neutral"} />
        <KpiCard label="Deals" value={String(rows.length)} />
        <KpiCard label="Pending" value={String(pending)} delta={`${approved} approved`} tone={approved > 0 ? "good" : "neutral"} />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChartWidget title="Pipeline by Customer (click to filter)" data={byCustomer} xKey="key" yKey="value" filterDim="customer" />
        <BarChartWidget title="Gross Profit by Risk (click to filter)" data={byRisk} xKey="key" yKey="value" filterDim="risk" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankingTable title="Largest Deals" items={topDeals.map((r) => ({ label: r.name, value: r.revenue, display: fmtMoney(r.revenue) }))} positiveOnly />
        <RankingTable title="Deepest Discounts" items={deepestDiscounts.map((r) => ({ label: r.name, value: r.discountPct, display: `${r.discountPct.toFixed(0)}%` }))} positiveOnly />
      </div>

      <HeatMap title="Margin Distribution" values={margins} bands={[15, 25, 35, 45]} unit="%" />
    </div>
  );
}

const sum = <T,>(arr: T[], f: (t: T) => number) => arr.reduce((s, t) => s + f(t), 0);

function groupSum<T>(arr: T[], key: (t: T) => string, val: (t: T) => number) {
  const m = new Map<string, number>();
  for (const t of arr) m.set(key(t), (m.get(key(t)) ?? 0) + val(t));
  return [...m.entries()].map(([key, value]) => ({ key, value: Math.round(value) })).sort((a, b) => b.value - a.value);
}
