"use client";

// Executive Action Center — the Top-10 of "what should Sonny's do next", ranked by
// impact × confidence. Impacts are % from real web-sourced price gaps; $ totals need
// Sonny's internal volumes (intentionally not fabricated).

import { useMemo } from "react";
import { Target } from "lucide-react";
import { readCatalogs } from "../catalogs";
import { computePositioning } from "@/lib/finance-os/ci/engines/positioning";
import { compareSkus } from "@/lib/finance-os/ci/engines/sku-comparison";
import { buildExecutiveActions, type ExecAction } from "@/lib/finance-os/ci/engines/executive-action";
import { Card, RiskBadge } from "./ui";
import { EngineEmpty } from "./EngineEmpty";

export function ExecutiveActionCenter() {
  const cat = useMemo(() => readCatalogs(), []);
  const res = useMemo(() => {
    const positioning = computePositioning(cat.sonnys, cat.competitors);
    const comparisons = compareSkus(cat.sonnys, cat.competitors);
    return buildExecutiveActions(positioning, comparisons);
  }, [cat]);

  if (!res.hasData) return <EngineEmpty note="Research Sonny's + competitors first — the action center aggregates every engine into the Top-10 moves." />;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-600/15 to-transparent p-5">
        <div className="flex items-center gap-2 text-blue-300">
          <Target size={16} />
          <p className="font-mono text-[11px] uppercase tracking-widest">What should Sonny's do next</p>
        </div>
        <p className="mt-2 text-sm text-fos-muted">Top {res.actions.length} actions, ranked by expected impact × confidence. Data coverage: {res.dataCoverage}% of SKUs priced.</p>
      </div>

      <div className="space-y-2.5">
        {res.actions.map((a) => <ActionRow key={a.rank} a={a} />)}
      </div>

      <p className="font-mono text-[10px] text-fos-faint">Impacts are % derived from real web-sourced price gaps. Absolute $ revenue/margin needs Sonny's internal volumes &amp; costs — add those (locally) to convert % to $.</p>
    </div>
  );
}

function ActionRow({ a }: { a: ExecAction }) {
  return (
    <Card title="">
      <div className="-m-1 flex items-start gap-3">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">{a.rank}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fos-text">{a.action}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
            {a.revenueImpactPct != null && <span className="text-emerald-400">+{a.revenueImpactPct}% revenue</span>}
            {a.marginImpactPct != null && <span className="text-emerald-400">+{a.marginImpactPct}% margin</span>}
            {a.revenueImpactPct == null && a.marginImpactPct == null && <span className="text-fos-faint">qualitative</span>}
            <span className="text-fos-muted">conf {a.confidence}%</span>
            <span className="text-fos-faint">{a.source}</span>
            <span className="ml-auto"><RiskBadge risk={a.risk} /></span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded bg-fos-surface2">
            <div className="h-full rounded bg-blue-500" style={{ width: `${a.confidence}%` }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
