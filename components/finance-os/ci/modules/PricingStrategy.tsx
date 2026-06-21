"use client";

// Pricing Strategy Engine — per Sonny's SKU: recommended action + margin / revenue /
// win-rate impact + risk. Computed from the SKU-comparison signals.

import { useEffect, useMemo } from "react";
import { fmtMoney } from "@/lib/finance/csv";
import { useCi } from "../context";
import { readCatalogs } from "../catalogs";
import { buildPricingStrategy, type PricingAction, type PricingRow } from "@/lib/finance-os/ci/engines/pricing-strategy";
import { Card } from "./ui";
import { EngineEmpty } from "./EngineEmpty";

const ACTION_TONE: Record<PricingAction, string> = {
  "Increase Price": "bg-emerald-500/15 text-emerald-300",
  "Premium Pricing": "bg-blue-500/15 text-blue-300",
  "Aggressive Pricing": "bg-amber-500/15 text-amber-300",
  "Bundle Product": "bg-violet-500/15 text-violet-300",
  "Defend Position": "bg-rose-500/15 text-rose-300",
  "Promote Product": "bg-cyan-500/15 text-cyan-300",
  "Hold Price": "bg-fos-surface2 text-fos-muted",
};

export function PricingStrategy() {
  const { setModuleRecs } = useCi();
  const cat = useMemo(() => readCatalogs(), []);
  const rows = useMemo(() => buildPricingStrategy(cat.sonnys, cat.competitors), [cat]);

  useEffect(() => {
    setModuleRecs(
      "pricing-strategy",
      rows
        .filter((r) => r.action === "Increase Price" || r.action === "Premium Pricing")
        .slice(0, 5)
        .map((r) => ({
          id: `ps-${r.product}`,
          module: "pricing-strategy",
          title: `${r.action}: ${r.product}${r.marginImpactPct ? ` (+${r.marginImpactPct}% margin)` : ""}`,
          rationale: r.rationale,
          marginGain: undefined,
          risk: r.riskScore > 45 ? "Medium" : "Low",
          priority: 40,
        })),
    );
  }, [rows, setModuleRecs]);

  if (!cat.sonnysReady) return <EngineEmpty note="Research Sonny's catalog (Research tab) — pricing strategy is computed per Sonny's SKU vs competitors." />;

  return (
    <Card title={`Pricing Strategy · ${rows.length} SKUs`}>
      <div className="space-y-2.5">
        {rows.map((r, i) => <Row key={i} r={r} />)}
      </div>
      <p className="mt-3 font-mono text-[10px] text-fos-faint">Impacts are % from web-sourced price gaps. $ totals need Sonny's volumes. Win-rate impact is directional (price ↑ lowers win-rate).</p>
    </Card>
  );
}

function Row({ r }: { r: PricingRow }) {
  return (
    <div className="rounded-lg border border-fos-border bg-fos-bg p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fos-text">{r.product}</p>
          <p className="font-mono text-[11px] text-fos-muted">{r.price != null ? fmtMoney(r.price) : "price —"}{r.competitor ? ` · vs ${r.competitor}` : ""}{r.priceGapPct != null ? ` (${r.priceGapPct > 0 ? "+" : ""}${r.priceGapPct}%)` : ""}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ACTION_TONE[r.action]}`}>{r.action}</span>
      </div>
      <p className="mt-1.5 text-[13px] text-fos-muted">{r.rationale}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-fos-border pt-2 font-mono text-[11px]">
        <Impact label="margin" v={r.marginImpactPct} />
        <Impact label="revenue" v={r.revenueImpactPct} />
        <Impact label="win-rate" v={r.winRateImpactPct} />
        <span className="ml-auto text-fos-muted">risk {r.riskScore}</span>
      </div>
    </div>
  );
}

function Impact({ label, v }: { label: string; v: number | null }) {
  if (v == null) return <span className="text-fos-faint">{label} —</span>;
  const tone = v > 0 ? "text-emerald-400" : v < 0 ? "text-rose-400" : "text-fos-muted";
  return <span className={tone}>{v > 0 ? "+" : ""}{v}% {label}</span>;
}
