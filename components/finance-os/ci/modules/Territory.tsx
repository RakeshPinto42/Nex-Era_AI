"use client";

// Territory Intelligence — regional revenue, margin, win-rate, coverage and white
// space, with growth-potential tags and where-to-invest recommendations.

import { useEffect, useMemo } from "react";
import { fmtMoney } from "@/lib/finance/csv";
import { useCi } from "../context";
import { computeTerritory } from "@/lib/finance-os/ci/territory";
import { Bar, Card, Kpi, RiskBadge } from "./ui";

export function Territory() {
  const { setModuleRecs } = useCi();
  const res = useMemo(() => computeTerritory(), []);
  useEffect(() => setModuleRecs("territory-intelligence", res.recommendations), [res, setModuleRecs]);

  const topGrowth = [...res.rows].sort((a, b) => b.whiteSpace - a.whiteSpace)[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Territories" value={String(res.rows.length)} />
        <Kpi label="Total White Space" value={fmtMoney(res.totalWhiteSpace)} tone="good" />
        <Kpi label="Top Opportunity" value={topGrowth?.region ?? "—"} tone="brand" />
        <Kpi label="Avg Win Rate" value={`${Math.round(res.rows.reduce((s, r) => s + r.winRate, 0) / res.rows.length)}%`} />
      </div>

      <Card title="Territory Performance">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fos-border text-right font-mono text-[10px] uppercase tracking-wider text-fos-muted">
                <th className="py-2 text-left">Region</th>
                <th className="py-2">Revenue</th>
                <th className="py-2">Margin</th>
                <th className="py-2">Win Rate</th>
                <th className="py-2 text-left">Coverage</th>
                <th className="py-2">White Space</th>
                <th className="py-2 text-right">Growth</th>
              </tr>
            </thead>
            <tbody>
              {res.rows.map((r) => (
                <tr key={r.region} className="border-b border-fos-border/50">
                  <td className="py-2.5 font-medium text-fos-text">{r.region}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-fos-text">{fmtMoney(r.revenue)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-fos-muted">{r.marginPct}%</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-fos-muted">{r.winRate}%</td>
                  <td className="py-2.5">
                    <Bar pct={r.coveragePct} color="#2563eb" width={70} />
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-emerald-400">{fmtMoney(r.whiteSpace)}</td>
                  <td className="py-2.5 text-right">
                    <RiskBadge risk={r.growthPotential} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono text-[10px] text-fos-faint">Growth tag = white-space share of the addressable market (High &gt; 60%).</p>
      </Card>
    </div>
  );
}
