"use client";

// Always-visible right rail. Aggregates every sub-module's recommendations and
// answers "what should we do next?" — each card carries the action, a rationale,
// the expected margin gain and a risk tag.

import { Sparkles } from "lucide-react";
import { useCi } from "./context";
import type { Recommendation, RiskLevel } from "@/lib/finance-os/ci/types";

const money = (n?: number) =>
  n == null ? null : `${n < 0 ? "-" : "+"}$${Math.abs(Math.round(n)).toLocaleString()}`;

export function RecommendationsPanel() {
  const { allRecs } = useCi();
  const totalGain = allRecs.reduce((s, r) => s + (r.marginGain ?? 0), 0);

  return (
    <aside className="flex w-[300px] flex-none flex-col border-l border-fos-border bg-fos-surface">
      <div className="border-b border-fos-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-blue-400" />
          <p className="text-sm font-semibold text-fos-text">Recommendations</p>
          <span className="ml-auto rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-300">{allRecs.length}</span>
        </div>
        {totalGain > 0 && (
          <p className="mt-1 font-mono text-[11px] text-fos-muted">
            Identified upside <span className="font-semibold text-emerald-400">+${Math.round(totalGain).toLocaleString()}</span>
          </p>
        )}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {allRecs.length === 0 && (
          <p className="px-1 pt-4 text-center text-xs text-fos-muted">Run an analysis — recommendations appear here.</p>
        )}
        {allRecs.map((r) => (
          <RecCard key={r.id} rec={r} />
        ))}
      </div>
    </aside>
  );
}

function RecCard({ rec }: { rec: Recommendation }) {
  const gain = money(rec.marginGain);
  return (
    <div className="rounded-lg border border-fos-border bg-fos-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold leading-snug text-fos-text">{rec.title}</p>
        <RiskTag risk={rec.risk} />
      </div>
      {rec.rationale && <p className="mt-1 text-[11px] leading-snug text-fos-muted">{rec.rationale}</p>}
      {(gain || rec.revenueImpact != null) && (
        <div className="mt-2 flex items-center gap-3 border-t border-fos-border pt-2 font-mono text-[11px]">
          {gain && rec.marginGain !== 0 && (
            <span className={rec.marginGain! >= 0 ? "text-emerald-400" : "text-rose-400"}>{gain} margin</span>
          )}
          {rec.revenueImpact != null && <span className="text-fos-muted">{money(rec.revenueImpact)} rev</span>}
        </div>
      )}
    </div>
  );
}

function RiskTag({ risk }: { risk: RiskLevel }) {
  const map: Record<RiskLevel, string> = {
    Low: "bg-emerald-500/15 text-emerald-300",
    Medium: "bg-amber-500/15 text-amber-300",
    High: "bg-rose-500/15 text-rose-300",
  };
  return <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-medium ${map[risk]}`}>{risk}</span>;
}
