"use client";

// Deal Desk (inside Commercial Intelligence) — evaluate live opportunities against
// the competitor: deal score, win probability, margin impact, approval and a
// suggested counter-price. Adjust the requested discount and watch it recompute.

import { useEffect, useMemo, useState } from "react";
import { fmtMoney } from "@/lib/finance/csv";
import { cn } from "@/lib/utils";
import { useCi } from "../context";
import { evaluateDeal, dealDeskRecommendations, OPPORTUNITIES, type Opportunity } from "@/lib/finance-os/ci/deal-desk";
import { Card, RiskBadge } from "./ui";

export function DealDesk() {
  const { setModuleRecs } = useCi();
  const [opps, setOpps] = useState<Opportunity[]>(OPPORTUNITIES);
  const [selId, setSelId] = useState(OPPORTUNITIES[0].id);
  const sel = opps.find((o) => o.id === selId) ?? opps[0];
  const e = useMemo(() => evaluateDeal(sel), [sel]);

  const recs = useMemo(() => dealDeskRecommendations(opps), [opps]);
  useEffect(() => setModuleRecs("deal-desk", recs), [recs, setModuleRecs]);

  const setDiscount = (v: number) => setOpps((os) => os.map((o) => (o.id === selId ? { ...o, requestedDiscountPct: v } : o)));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* queue */}
      <div className="lg:col-span-5">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-fos-muted">Open opportunities</p>
        <div className="space-y-2">
          {opps.map((o) => {
            const oe = evaluateDeal(o);
            const active = o.id === selId;
            return (
              <button
                key={o.id}
                onClick={() => setSelId(o.id)}
                className={cn("w-full rounded-xl border bg-fos-surface p-3 text-left transition-colors", active ? "border-blue-500" : "border-fos-border hover:bg-fos-surface2")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-fos-text">{o.customer}</span>
                  <ScorePill score={oe.dealScore} />
                </div>
                <p className="text-xs text-fos-muted">{o.product} · vs {o.competitor}</p>
                <div className="mt-1.5 flex items-center gap-3 font-mono text-[11px] text-fos-muted">
                  <span>win {oe.winProbability}%</span>
                  <span>margin {oe.marginPct}%</span>
                  <RiskBadge risk={oe.risk} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* detail */}
      <div className="lg:col-span-7">
        <Card title={`${sel.customer} · ${sel.product}`} action={<RiskBadge risk={e.risk} />}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Deal Score" value={String(e.dealScore)} tone="brand" />
            <Metric label="Win Probability" value={`${e.winProbability}%`} tone={e.winProbability >= 50 ? "good" : "bad"} />
            <Metric label="Margin" value={`${e.marginPct}%`} tone={e.marginPct < 20 ? "bad" : "neutral"} />
            <Metric label="Margin Impact" value={fmtMoney(e.marginImpact)} tone={e.marginImpact >= 0 ? "good" : "bad"} />
          </div>

          {/* discount control */}
          <div className="mt-4 rounded-lg border border-fos-border bg-fos-bg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fos-muted">Requested discount</span>
              <span className="font-mono font-semibold text-fos-text">{sel.requestedDiscountPct}%</span>
            </div>
            <input type="range" min={0} max={40} value={sel.requestedDiscountPct} onChange={(ev) => setDiscount(Number(ev.target.value))} className="mt-2 w-full accent-blue-500" />
            <p className="mt-1 font-mono text-[11px] text-fos-muted">requested price {fmtMoney(e.requestedPrice)} · competitor {fmtMoney(sel.competitorPrice)}</p>
          </div>

          {/* suggestion */}
          <div className="mt-4 rounded-lg p-3" style={{ background: "rgba(37,99,235,0.1)" }}>
            <p className="text-sm font-semibold text-fos-text">
              Suggested: <span className="text-blue-300">{fmtMoney(e.suggestedPrice)}</span> at {e.suggestedDiscountPct}% discount
            </p>
            <p className="mt-0.5 text-[13px] text-fos-muted">{e.recommendation} · approval: {e.approval}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const tone = score >= 65 ? "bg-emerald-500/15 text-emerald-300" : score >= 45 ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300";
  return <span className={cn("rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold", tone)}>{score}</span>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" | "brand" }) {
  const txt = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : tone === "brand" ? "text-blue-300" : "text-fos-text";
  return (
    <div className="rounded-lg border border-fos-border bg-fos-bg p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", txt)}>{value}</p>
    </div>
  );
}
