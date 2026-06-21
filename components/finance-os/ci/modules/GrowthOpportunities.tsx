"use client";

// Growth Opportunities — cross-sell / white-space revenue from the customer
// ownership matrix, plus the Price Increase Scanner (SKUs that can absorb a raise).

import { useEffect, useMemo } from "react";
import { fmtMoney } from "@/lib/finance/csv";
import { useCi } from "../context";
import { findGrowthOpps, scanPriceIncreases, growthRecommendations } from "@/lib/finance-os/ci/growth";
import { Card, Kpi, RiskBadge } from "./ui";

export function GrowthOpportunities() {
  const { setModuleRecs } = useCi();
  const opps = useMemo(() => findGrowthOpps(), []);
  const scans = useMemo(() => scanPriceIncreases(), []);
  const recs = useMemo(() => growthRecommendations(opps, scans), [opps, scans]);
  useEffect(() => setModuleRecs("growth-opportunities", recs), [recs, setModuleRecs]);

  const oppMargin = opps.reduce((s, o) => s + o.potentialMargin, 0);
  const scanGain = scans.reduce((s, r) => s + r.expectedMarginGain, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Opportunities" value={String(opps.length)} />
        <Kpi label="Cross-Sell Margin" value={fmtMoney(oppMargin)} tone="good" />
        <Kpi label="Price-Raise Margin" value={fmtMoney(scanGain)} tone="good" />
        <Kpi label="Total Upside" value={fmtMoney(oppMargin + scanGain)} tone="brand" />
      </div>

      <Card title="Cross-Sell & White-Space Opportunities">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fos-border text-right font-mono text-[10px] uppercase tracking-wider text-fos-muted">
                <th className="py-2 text-left">Customer</th>
                <th className="py-2 text-left">Type</th>
                <th className="py-2 text-left">Product</th>
                <th className="py-2">Potential Rev</th>
                <th className="py-2">Potential Margin</th>
                <th className="py-2 text-right">Priority</th>
              </tr>
            </thead>
            <tbody>
              {opps.map((o, i) => (
                <tr key={i} className="border-b border-fos-border/50">
                  <td className="py-2.5 font-medium text-fos-text">{o.customer}</td>
                  <td className="py-2.5"><span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] text-blue-300">{o.type}</span></td>
                  <td className="py-2.5 text-fos-muted">{o.product}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-fos-text">{fmtMoney(o.potentialRevenue)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-emerald-400">{fmtMoney(o.potentialMargin)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-fos-muted">{o.priorityScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Price Increase Scanner">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fos-border text-right font-mono text-[10px] uppercase tracking-wider text-fos-muted">
                <th className="py-2 text-left">SKU</th>
                <th className="py-2">Current</th>
                <th className="py-2">Recommended</th>
                <th className="py-2">Increase</th>
                <th className="py-2">Margin Gain</th>
                <th className="py-2 text-right">Risk</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.sku} className="border-b border-fos-border/50">
                  <td className="py-2.5 font-medium text-fos-text">{s.product}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-fos-muted">{fmtMoney(s.currentPrice)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-fos-text">{fmtMoney(s.recommendedPrice)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-blue-300">+{s.increasePct}%</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-emerald-400">{fmtMoney(s.expectedMarginGain)}</td>
                  <td className="py-2.5 text-right"><RiskBadge risk={s.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
