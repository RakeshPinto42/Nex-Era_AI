"use client";

// Win/Loss Analytics — win/loss rates, loss drivers, competitor head-to-head and
// the price-premium sensitivity curve (max sustainable premium before win-rate dies).

import { useEffect, useMemo } from "react";
import { useCi } from "../context";
import { computeWinLoss } from "@/lib/finance-os/ci/win-loss";
import { Bar, Card, Kpi, RiskBadge } from "./ui";

export function WinLoss() {
  const { setModuleRecs } = useCi();
  const res = useMemo(() => computeWinLoss(), []);
  useEffect(() => setModuleRecs("win-loss", res.recommendations), [res, setModuleRecs]);

  const maxDriver = Math.max(1, ...res.lossDrivers.map((d) => d.count));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Win Rate" value={`${res.winRate}%`} tone="good" />
        <Kpi label="Loss Rate" value={`${res.lossRate}%`} tone="bad" />
        <Kpi label="Deals Closed" value={String(res.total)} />
        <Kpi label="Max Sustainable Premium" value={res.maxSustainablePremiumPct ? `${res.maxSustainablePremiumPct}%` : "—"} tone="brand" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Loss Drivers">
          <div className="space-y-2.5">
            {res.lossDrivers.map((d) => (
              <div key={d.reason} className="flex items-center gap-3">
                <span className="w-32 truncate text-sm text-fos-text">{d.reason}</span>
                <div className="relative h-4 flex-1 overflow-hidden rounded bg-fos-surface2">
                  <div className="absolute inset-y-0 left-0 rounded bg-rose-500" style={{ width: `${(d.count / maxDriver) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-mono text-xs tabular-nums text-fos-text">{d.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Competitor Head-to-Head">
          <div className="space-y-2.5">
            {res.competitors.map((c) => (
              <div key={c.competitor} className="flex items-center gap-3">
                <span className="w-28 truncate text-sm text-fos-text">{c.competitor}</span>
                <Bar pct={c.winRate} color={c.winRate >= 50 ? "#10b981" : "#ef4444"} width={90} />
                <span className="ml-auto font-mono text-[11px] text-fos-muted">{c.total} deals</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Price-Premium Sensitivity · win rate by premium band vs competitor">
        <div className="flex items-end gap-2">
          {res.premiumBands.map((b) => (
            <div key={b.label} className="flex-1 text-center">
              <div className="flex h-32 items-end justify-center">
                <div
                  className="w-full rounded-t"
                  style={{ height: `${b.total ? Math.max(6, b.winRate) : 2}%`, minHeight: 2, background: b.winRate > 50 ? "#10b981" : b.total ? "#ef4444" : "#334155" }}
                  title={`${b.label}: ${b.winRate}% win (${b.won}/${b.total})`}
                />
              </div>
              <p className="mt-1 font-mono text-[10px] text-fos-text">{b.total ? `${b.winRate}%` : "—"}</p>
              <p className="font-mono text-[9px] text-fos-muted">{b.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
