"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Table } from "@/lib/finance/csv";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { UploadMapper } from "@/components/finance-os/UploadMapper";
import { KpiCard, KpiGrid } from "@/components/finance-os/dashboard/KpiCard";
import { RankingTable } from "@/components/finance-os/dashboard/RankingTable";
import { DataGrid } from "@/components/finance-os/dashboard/DataGrid";
import { ExportMenu } from "@/components/finance-os/ExportMenu";
import { fmtMoney } from "@/lib/finance/csv";
import { computeProfitability, type ProfitRow } from "@/lib/finance-os/profitability";
import { sampleCustomerProfit } from "@/lib/finance-os/samples";
import type { ColumnMapping, FieldSpec } from "@/lib/finance-os/types";

const FIELDS: FieldSpec[] = [
  { key: "customer", label: "Customer", synonyms: ["account", "client", "name"], required: true },
  { key: "revenue", label: "Revenue", synonyms: ["sales", "amount"], numeric: true, required: true },
  { key: "directCost", label: "Direct Cost", synonyms: ["cogs", "cost"], numeric: true },
  { key: "supportCost", label: "Support Cost", synonyms: ["service", "success"], numeric: true },
  { key: "accountCost", label: "Account Cost", synonyms: ["overhead", "sga"], numeric: true },
];

export function Profitability() {
  const [table, setTable] = useState<Table | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);

  const result = useMemo(() => {
    if (!table || !mapping || (mapping.customer ?? -1) < 0) return null;
    return computeProfitability(table, mapping);
  }, [table, mapping]);

  const columns: ColumnDef<ProfitRow, unknown>[] = [
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "revenue", header: "Revenue", cell: (c) => fmtMoney(c.getValue<number>()) },
    { accessorKey: "profit", header: "Profit", cell: (c) => fmtMoney(c.getValue<number>()) },
    { accessorKey: "marginPct", header: "Margin", cell: (c) => `${c.getValue<number>().toFixed(1)}%` },
    { accessorKey: "revenueSharePct", header: "Rev %", cell: (c) => `${c.getValue<number>().toFixed(1)}%` },
  ];

  return (
    <ModuleScreen slug="profitability" title="Customer Profitability">
      <UploadMapper
        fields={FIELDS}
        onData={(t, m) => {
          setTable(t);
          setMapping(m);
        }}
        sample={() => [sampleCustomerProfit()]}
        defaultRole="other"
        mapTitle="Map customer & costs"
      />

      {result && (
        <div className="mt-5 space-y-5">
          <KpiGrid>
            <KpiCard label="Revenue" value={fmtMoney(result.totals.revenue)} tone="brand" />
            <KpiCard label="Profit" value={fmtMoney(result.totals.profit)} tone={result.totals.profit >= 0 ? "good" : "bad"} />
            <KpiCard label="Margin" value={`${result.totals.marginPct.toFixed(1)}%`} />
            <KpiCard label="Loss-making" value={String(result.lossMakers.length)} tone={result.lossMakers.length ? "bad" : "good"} delta="customers" />
          </KpiGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankingTable title="Most profitable" items={result.rows.slice(0, 6).map((r) => ({ label: r.customer, value: r.profit, display: fmtMoney(r.profit) }))} />
            <RankingTable title="Loss makers" items={result.lossMakers.map((r) => ({ label: r.customer, value: r.profit, display: fmtMoney(r.profit) }))} />
          </div>

          <div className="flex justify-end">
            <ExportMenu
              filename="customer_profitability"
              columns={[
                { header: "Customer", key: "customer" }, { header: "Revenue", key: "revenue" },
                { header: "Profit", key: "profit" }, { header: "Margin %", key: "margin" },
              ]}
              rows={result.rows.map((r) => ({ customer: r.customer, revenue: round(r.revenue), profit: round(r.profit), margin: r.marginPct.toFixed(1) }))}
              title="Customer Profitability"
            />
          </div>

          <DataGrid columns={columns} data={result.rows} />
        </div>
      )}
    </ModuleScreen>
  );
}

const round = (n: number) => Math.round(n);
