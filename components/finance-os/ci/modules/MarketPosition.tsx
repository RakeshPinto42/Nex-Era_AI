"use client";

// Market Position — market/revenue ranking, a share×growth position matrix, the
// competitor ranking and our share trend vs the leader.

import { useEffect, useMemo } from "react";
import { MultiLineChart } from "@/components/finance-os/dashboard/Charts";
import { fmtMoney } from "@/lib/finance/csv";
import { useCi } from "../context";
import { computeMarketPosition, SHARE_TREND } from "@/lib/finance-os/ci/market-position";
import { Card, Kpi } from "./ui";

export function MarketPosition() {
  const { setModuleRecs } = useCi();
  const res = useMemo(() => computeMarketPosition(), []);
  useEffect(() => setModuleRecs("market-position", res.recommendations), [res, setModuleRecs]);

  const maxGrowth = Math.max(...res.players.map((p) => p.growthPct));
  const maxShare = Math.max(...res.players.map((p) => p.sharePct));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Market Rank" value={`#${res.ourRank}`} tone="brand" />
        <Kpi label="Market Share" value={`${res.ourShare.toFixed(1)}%`} />
        <Kpi label="Opportunity Share" value={`${res.opportunityShare}%`} tone="good" />
        <Kpi label="Leader Gap" value={`${(res.leader.sharePct - res.ourShare).toFixed(1)} pts`} tone="bad" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* position matrix */}
        <Card title="Market Position Matrix · share × growth">
          <div className="relative h-64 rounded-lg border border-fos-border bg-fos-bg">
            <span className="absolute left-2 top-2 font-mono text-[9px] uppercase text-fos-faint">↑ growth</span>
            <span className="absolute bottom-2 right-2 font-mono text-[9px] uppercase text-fos-faint">share →</span>
            {res.players.map((p) => {
              const x = (p.sharePct / (maxShare * 1.15)) * 100;
              const y = (p.growthPct / (maxGrowth * 1.15)) * 100;
              const size = 18 + (p.revenue / res.leader.revenue) * 30;
              return (
                <div
                  key={p.name}
                  className="absolute -translate-x-1/2 translate-y-1/2"
                  style={{ left: `${x}%`, bottom: `${y}%` }}
                  title={`${p.name}: ${p.sharePct.toFixed(1)}% share, ${p.growthPct}% growth`}
                >
                  <div
                    className="grid place-items-center rounded-full text-[9px] font-bold text-white"
                    style={{ width: size, height: size, background: p.us ? "#2563eb" : "rgba(148,163,184,0.5)" }}
                  >
                    {p.us ? "US" : p.name[0]}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* competitor ranking */}
        <Card title="Competitor Ranking · revenue">
          <div className="space-y-2.5">
            {res.players.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-5 font-mono text-xs text-fos-muted">#{p.rank}</span>
                <span className={`w-32 truncate text-sm ${p.us ? "font-semibold text-blue-300" : "text-fos-text"}`}>{p.name}</span>
                <div className="relative h-4 flex-1 overflow-hidden rounded bg-fos-surface2">
                  <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${(p.revenue / res.leader.revenue) * 100}%`, background: p.us ? "#2563eb" : "#64748b" }} />
                </div>
                <span className="w-20 text-right font-mono text-xs tabular-nums text-fos-text">{fmtMoney(p.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <MultiLineChart
        title="Market share trend · us vs leader"
        data={SHARE_TREND as unknown as Record<string, number | string>[]}
        xKey="month"
        series={[{ key: "us", label: "NEXERA" }, { key: "leader", label: "Leader", dashed: true }]}
      />
    </div>
  );
}
