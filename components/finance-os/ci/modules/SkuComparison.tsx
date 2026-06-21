"use client";

// SKU Comparison — each Sonny's product vs its closest competitor product:
// similarity, price gap, advantages, disadvantages, recommended commercial action.

import { useMemo } from "react";
import { fmtMoney } from "@/lib/finance/csv";
import { readCatalogs } from "../catalogs";
import { compareSkus } from "@/lib/finance-os/ci/engines/sku-comparison";
import { Card } from "./ui";
import { EngineEmpty } from "./EngineEmpty";

export function SkuComparison() {
  const cat = useMemo(() => readCatalogs(), []);
  const rows = useMemo(() => compareSkus(cat.sonnys, cat.competitors), [cat]);

  if (!cat.sonnysReady) return <EngineEmpty note="Research Sonny's catalog (Research tab) — this engine compares each Sonny's SKU to the closest competitor product." />;

  return (
    <div className="space-y-4">
      <Card title={`Sonny's SKUs vs Competitors · ${rows.length} products`}>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="rounded-lg border border-fos-border bg-fos-bg p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-fos-text">{r.sku.product}</p>
                  <p className="font-mono text-[11px] text-fos-muted">
                    {r.sku.price != null ? fmtMoney(r.sku.price) : "price —"}
                    {r.match ? <> · closest: <span className="text-fos-text">{r.match.product}</span> ({r.matchCompetitor})</> : " · no close match"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  {r.match && <span className="rounded-full bg-fos-surface2 px-2 py-0.5 font-mono text-fos-muted">{r.similarityPct}% match</span>}
                  {r.priceGapPct != null && (
                    <span className={`rounded-full px-2 py-0.5 font-mono ${r.priceGapPct > 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                      {r.priceGapPct > 0 ? `+${r.priceGapPct}% headroom` : `${r.priceGapPct}% over`}
                    </span>
                  )}
                </div>
              </div>

              {(r.advantages.length > 0 || r.disadvantages.length > 0) && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {r.advantages.length > 0 && (
                    <p className="text-[11px] text-emerald-300/90">▲ Advantage: <span className="text-fos-muted">{r.advantages.join(", ")}</span></p>
                  )}
                  {r.disadvantages.length > 0 && (
                    <p className="text-[11px] text-amber-300/90">▼ Gap: <span className="text-fos-muted">{r.disadvantages.join(", ")}</span></p>
                  )}
                </div>
              )}

              <p className="mt-2 border-t border-fos-border pt-2 text-[13px] text-blue-200">→ {r.action}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
