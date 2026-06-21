"use client";

// Sonny's Positioning Engine — where Sonny's stands vs the competitor field.

import { useEffect, useMemo } from "react";
import { fmtMoney } from "@/lib/finance/csv";
import { useCi } from "../context";
import { readCatalogs } from "../catalogs";
import { computePositioning } from "@/lib/finance-os/ci/engines/positioning";
import { Card, Kpi, RiskBadge } from "./ui";
import { EngineEmpty } from "./EngineEmpty";

export function PositioningEngine() {
  const { setModuleRecs } = useCi();
  const cat = useMemo(() => readCatalogs(), []);
  const res = useMemo(() => computePositioning(cat.sonnys, cat.competitors), [cat]);
  useEffect(() => setModuleRecs("positioning", res.recommendations), [res, setModuleRecs]);

  if (!res.hasData) return <EngineEmpty />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Price Position" value={res.pricePositionPct == null ? "—" : `${res.pricePositionPct > 0 ? "+" : ""}${res.pricePositionPct}%`} tone={res.pricePositionPct != null && res.pricePositionPct < 0 ? "bad" : "good"} />
        <Kpi label="Premium Rank" value={res.premiumRank ? `#${res.premiumRank} of ${res.entities}` : "—"} tone="brand" />
        <Kpi label="Product Coverage" value={`${res.productCoverage}/${res.marketCategories} cats`} />
        <Kpi label="Market Coverage" value={`${res.competitorsWithData}/${res.competitorsTotal} rivals`} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Kpi label="Sonny's Avg List Price" value={res.sonnysAvg == null ? "—" : fmtMoney(Math.round(res.sonnysAvg))} tone="brand" />
        <Kpi label="Market Avg List Price" value={res.marketAvg == null ? "—" : fmtMoney(Math.round(res.marketAvg))} />
      </div>

      <Card title="Competitive Threat Level">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fos-border text-right font-mono text-[10px] uppercase tracking-wider text-fos-muted">
                <th className="py-2 text-left">Competitor</th>
                <th className="py-2">Products</th>
                <th className="py-2">Avg Price</th>
                <th className="py-2">vs Sonny's</th>
                <th className="py-2 text-right">Threat</th>
              </tr>
            </thead>
            <tbody>
              {res.threats.map((t) => (
                <tr key={t.competitor} className="border-b border-fos-border/50">
                  <td className="py-2.5 font-medium text-fos-text">{t.competitor}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-fos-muted">{t.products}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-fos-text">{t.avgPrice == null ? "—" : fmtMoney(Math.round(t.avgPrice))}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums">
                    {t.pricePosPct == null ? <span className="text-fos-faint">—</span> : <span className={t.pricePosPct < 0 ? "text-rose-400" : "text-emerald-400"}>{t.pricePosPct < 0 ? `${t.pricePosPct}%` : `+${t.pricePosPct}%`}</span>}
                  </td>
                  <td className="py-2.5 text-right"><RiskBadge risk={t.threat} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono text-[10px] text-fos-faint">"vs Sonny's" = competitor avg price relative to ours (negative = they undercut). Threat blends undercut + range.</p>
      </Card>

      <Card title="Category Position">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {res.byCategory.map((c) => (
            <div key={c.category} className="flex items-center justify-between rounded-lg border border-fos-border bg-fos-bg px-3 py-2">
              <span className="text-sm text-fos-text">{c.category}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.position === "Premium" ? "bg-blue-500/15 text-blue-300" : c.position === "Value" ? "bg-emerald-500/15 text-emerald-300" : c.position === "Parity" ? "bg-fos-surface2 text-fos-muted" : "bg-fos-surface2 text-fos-faint"}`}>{c.position}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
