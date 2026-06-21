"use client";

// Executive Strategy Center — the aggregator and the point of the whole module.
// Runs every sub-module engine, ranks the moves by impact, and presents the board
// the leadership team acts on: total identified upside, quick wins vs strategic
// plays, and which module each move came from.

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { fmtMoney } from "@/lib/finance/csv";
import { buildExecutiveStrategy, MODULE_LABELS } from "@/lib/finance-os/ci/executive-strategy";
import type { Recommendation } from "@/lib/finance-os/ci/types";
import { Card, RiskBadge } from "./ui";

export function ExecutiveStrategy() {
  const s = useMemo(() => buildExecutiveStrategy(), []);

  return (
    <div className="space-y-5">
      {/* headline */}
      <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-600/15 to-transparent p-5">
        <div className="flex items-center gap-2 text-blue-300">
          <TrendingUp size={16} />
          <p className="font-mono text-[11px] uppercase tracking-widest">Identified upside this cycle</p>
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-2">
          <div>
            <p className="text-4xl font-semibold tabular-nums text-emerald-400">{fmtMoney(s.totalMarginGain)}</p>
            <p className="text-xs text-fos-muted">expected margin gain</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-fos-text">{fmtMoney(s.totalRevenueImpact)}</p>
            <p className="text-xs text-fos-muted">revenue impact</p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums text-fos-text">{s.recommendations.length}</p>
            <p className="text-xs text-fos-muted">strategic moves</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title={`Quick Wins · low risk (${s.quickWins.length})`}>
          <div className="space-y-2.5">
            {s.quickWins.length === 0 && <p className="text-xs text-fos-muted">None.</p>}
            {s.quickWins.map((r) => <Move key={r.id} r={r} />)}
          </div>
        </Card>
        <Card title={`Strategic Plays · medium / high risk (${s.strategic.length})`}>
          <div className="space-y-2.5">
            {s.strategic.length === 0 && <p className="text-xs text-fos-muted">None.</p>}
            {s.strategic.map((r) => <Move key={r.id} r={r} />)}
          </div>
        </Card>
      </div>

      <Card title="Upside by Module">
        <div className="space-y-2">
          {s.byModule.map((m) => (
            <div key={m.module} className="flex items-center gap-3 text-sm">
              <span className="w-44 truncate text-fos-text">{MODULE_LABELS[m.module] ?? m.module}</span>
              <span className="font-mono text-[11px] text-fos-muted">{m.count} moves</span>
              <span className="ml-auto font-mono tabular-nums text-emerald-400">{m.marginGain ? fmtMoney(m.marginGain) : "—"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Move({ r }: { r: Recommendation }) {
  return (
    <div className="rounded-lg border border-fos-border bg-fos-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold leading-snug text-fos-text">{r.title}</p>
        <RiskBadge risk={r.risk} />
      </div>
      {r.rationale && <p className="mt-1 text-[11px] leading-snug text-fos-muted">{r.rationale}</p>}
      <div className="mt-2 flex items-center gap-3 border-t border-fos-border pt-2 font-mono text-[11px]">
        {r.marginGain ? <span className="text-emerald-400">+{fmtMoney(r.marginGain)} margin</span> : null}
        {r.revenueImpact ? <span className="text-fos-muted">{fmtMoney(r.revenueImpact)} rev</span> : null}
        <span className="ml-auto text-fos-faint">{MODULE_LABELS[r.module] ?? r.module}</span>
      </div>
    </div>
  );
}
