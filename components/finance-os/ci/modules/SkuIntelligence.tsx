"use client";

// SKU Intelligence — matches our SKU master against the competitor SKU master.
// Top: portfolio KPIs. Center: the SKU Comparison Matrix (each of our SKUs vs its
// closest competitor — similarity, price gap, margin opportunity). Bottom: a
// side-by-side detail for the selected SKU. Pushes pricing + feature-gap recs.

import { useEffect, useMemo, useState } from "react";
import { fmtMoney } from "@/lib/finance/csv";
import { cn } from "@/lib/utils";
import { useCi } from "../context";
import {
  matchSkus,
  skuRecommendations,
  OUR_SKUS,
  COMPETITOR_SKUS,
  type SkuMatch,
} from "@/lib/finance-os/ci/sku-intelligence";

export function SkuIntelligence() {
  const { setModuleRecs } = useCi();
  const matches = useMemo(() => matchSkus(OUR_SKUS, COMPETITOR_SKUS), []);
  const [selSku, setSelSku] = useState(matches[0]?.our.sku ?? "");
  const sel = matches.find((m) => m.our.sku === selSku) ?? matches[0];

  const recs = useMemo(() => skuRecommendations(matches), [matches]);
  useEffect(() => setModuleRecs("sku-intelligence", recs), [recs, setModuleRecs]);

  const totalOpp = matches.reduce((s, m) => s + m.marginOpportunity, 0);
  const avgSim = matches.length ? Math.round(matches.reduce((s, m) => s + m.similarityPct, 0) / matches.length) : 0;
  const gaps = matches.reduce((s, m) => s + m.featureGap.theyHave.length, 0);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="SKUs Analyzed" value={String(matches.length)} />
        <Kpi label="Avg Similarity" value={`${avgSim}%`} />
        <Kpi label="Margin Opportunity" value={fmtMoney(totalOpp)} tone="good" />
        <Kpi label="Feature Gaps" value={String(gaps)} tone={gaps ? "bad" : "neutral"} />
      </div>

      {/* SKU Comparison Matrix */}
      <div className="overflow-hidden rounded-xl border border-fos-border bg-fos-surface">
        <p className="border-b border-fos-border px-4 py-3 text-sm font-semibold text-fos-text">SKU Comparison Matrix</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-fos-border text-right font-mono text-[10px] uppercase tracking-wider text-fos-muted">
                <th className="px-4 py-2 text-left">Our SKU</th>
                <th className="px-3 py-2 text-left">Closest Competitor</th>
                <th className="px-3 py-2 text-left">Similarity</th>
                <th className="px-3 py-2">Our Price</th>
                <th className="px-3 py-2">Comp Price</th>
                <th className="px-3 py-2">Price Gap</th>
                <th className="px-4 py-2">Margin Opp.</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr
                  key={m.our.sku}
                  onClick={() => setSelSku(m.our.sku)}
                  className={cn(
                    "cursor-pointer border-b border-fos-border/50 transition-colors hover:bg-fos-surface2",
                    selSku === m.our.sku && "bg-blue-500/10",
                  )}
                >
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-fos-text">{m.our.product}</p>
                    <p className="font-mono text-[10px] text-fos-muted">{m.our.category}</p>
                  </td>
                  <td className="px-3 py-2.5 text-fos-text">
                    {m.match ? (
                      <>
                        <p>{m.match.product}</p>
                        <p className="font-mono text-[10px] text-fos-muted">{m.match.vendor}</p>
                      </>
                    ) : (
                      <span className="text-fos-faint">No match</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <SimilarityBar pct={m.similarityPct} />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fos-text">{fmtMoney(m.our.price)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fos-muted">{m.match ? fmtMoney(m.match.price) : "—"}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", m.priceGap > 0 ? "text-emerald-400" : m.priceGap < 0 ? "text-rose-400" : "text-fos-muted")}>
                    {m.priceGap > 0 ? "+" : ""}{m.priceGapPct.toFixed(0)}%
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-fos-text">{m.marginOpportunity ? fmtMoney(m.marginOpportunity) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-side detail */}
      {sel && sel.match && <Detail m={sel} />}
    </div>
  );
}

function Detail({ m }: { m: SkuMatch }) {
  const comp = m.match!;
  return (
    <div className="rounded-xl border border-fos-border bg-fos-surface p-4">
      <p className="mb-3 text-sm font-semibold text-fos-text">Head-to-head · {m.our.product}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkuCard title="Ours" accent="blue" name={m.our.product} sub={`${m.our.category} · ${m.currentMarginPct.toFixed(0)}% margin`} price={m.our.price} capacity={m.our.capacity} warranty={m.our.warrantyMonths} features={m.our.features} highlight={m.featureGap.weHave} />
        <SkuCard title={comp.vendor} accent="slate" name={comp.product} sub={comp.category} price={comp.price} capacity={comp.capacity} warranty={comp.warrantyMonths} features={comp.features} highlight={m.featureGap.theyHave} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Similarity" value={`${m.similarityPct}%`} />
        <Stat label="Price Gap" value={`${m.priceGap > 0 ? "+" : ""}${fmtMoney(m.priceGap)}`} tone={m.priceGap > 0 ? "good" : m.priceGap < 0 ? "bad" : "neutral"} />
        <Stat label="Features They Have" value={m.featureGap.theyHave.length ? m.featureGap.theyHave.join(", ") : "None"} tone={m.featureGap.theyHave.length ? "bad" : "good"} />
        <Stat label="Margin Opportunity" value={m.marginOpportunity ? fmtMoney(m.marginOpportunity) : "—"} tone={m.marginOpportunity ? "good" : "neutral"} />
      </div>
    </div>
  );
}

function SkuCard({
  title, accent, name, sub, price, capacity, warranty, features, highlight,
}: {
  title: string; accent: "blue" | "slate"; name: string; sub: string; price: number; capacity: number; warranty: number; features: string[]; highlight: string[];
}) {
  const hi = new Set(highlight.map((s) => s.toLowerCase()));
  return (
    <div className={cn("rounded-lg border bg-fos-bg p-4", accent === "blue" ? "border-blue-500/40" : "border-fos-border")}>
      <p className={cn("font-mono text-[10px] uppercase tracking-wider", accent === "blue" ? "text-blue-300" : "text-fos-muted")}>{title}</p>
      <p className="mt-0.5 font-semibold text-fos-text">{name}</p>
      <p className="text-xs text-fos-muted">{sub}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-fos-text">{fmtMoney(price)}</p>
      <div className="mt-2 flex gap-4 font-mono text-[11px] text-fos-muted">
        {capacity > 0 && <span>cap {capacity}</span>}
        <span>warranty {warranty}mo</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {features.map((f) => (
          <span key={f} className={cn("rounded-full px-2 py-0.5 text-[11px]", hi.has(f.toLowerCase()) ? "bg-amber-500/15 text-amber-300" : "bg-fos-surface2 text-fos-muted")}>{f}</span>
        ))}
      </div>
    </div>
  );
}

function SimilarityBar({ pct }: { pct: number }) {
  const color = pct >= 85 ? "#10b981" : pct >= 70 ? "#3b82f6" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded bg-fos-surface2">
        <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-9 font-mono text-xs tabular-nums text-fos-text">{pct}%</span>
    </div>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" }) {
  const txt = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : "text-fos-text";
  return (
    <div className="rounded-xl border border-fos-border bg-fos-surface p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", txt)}>{value}</p>
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" }) {
  const txt = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-amber-300" : "text-fos-text";
  return (
    <div className="rounded-lg border border-fos-border bg-fos-bg p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold", txt)}>{value}</p>
    </div>
  );
}
