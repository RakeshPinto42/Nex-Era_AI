// SKU Comparison Engine. For each Sonny's product, find the closest competitor
// product: similarity, feature comparison, price gap, advantages/disadvantages and
// a recommended commercial action. Pure — web-sourced catalogs only.

import type { CompetitorProduct } from "../agent/types";
import { type EntityCatalog, similarity } from "../sonnys";

export type SkuComparison = {
  sku: CompetitorProduct; // a Sonny's product
  matchCompetitor: string | null;
  match: CompetitorProduct | null;
  similarityPct: number;
  priceGapPct: number | null; // (competitor − sonny's)/sonny's; + means we're cheaper
  advantages: string[]; // features Sonny's has, the match lacks
  disadvantages: string[]; // features the match has, Sonny's lacks
  action: string;
};

export function compareSkus(sonnys: EntityCatalog, competitors: EntityCatalog[]): SkuComparison[] {
  const pool = competitors.flatMap((c) => c.products.map((p) => ({ name: c.name, p })));
  return sonnys.products.map((sku) => {
    let best: { name: string; p: CompetitorProduct; sim: number } | null = null;
    for (const cand of pool) {
      const sim = similarity(sku, cand.p);
      if (!best || sim > best.sim) best = { name: cand.name, p: cand.p, sim };
    }
    const bestSim = best ? best.sim : 0;
    if (!best || bestSim < 20) {
      return { sku, matchCompetitor: null, match: null, similarityPct: bestSim, priceGapPct: null, advantages: [], disadvantages: [], action: "No close competitor match — likely a differentiated or niche SKU." };
    }

    const sFeat = new Set(sku.features.map((f) => f.toLowerCase()));
    const mFeat = new Set(best.p.features.map((f) => f.toLowerCase()));
    const advantages = sku.features.filter((f) => !mFeat.has(f.toLowerCase()));
    const disadvantages = best.p.features.filter((f) => !sFeat.has(f.toLowerCase()));
    const priceGapPct = sku.price != null && best.p.price != null && sku.price ? Math.round(((best.p.price - sku.price) / sku.price) * 1000) / 10 : null;

    return { sku, matchCompetitor: best.name, match: best.p, similarityPct: best.sim, priceGapPct, advantages, disadvantages, action: recommendAction(priceGapPct, advantages.length, disadvantages.length, best.name) };
  });
}

function recommendAction(priceGapPct: number | null, adv: number, dis: number, competitor: string): string {
  if (priceGapPct != null && priceGapPct > 5 && adv >= dis) return `Raise price toward ${competitor} (+${priceGapPct}% headroom) — comparable or stronger spec.`;
  if (priceGapPct != null && priceGapPct < -5 && dis > adv) return `Defend with value/bundle — priced above ${competitor} with fewer features.`;
  if (dis > adv) return `Close feature gap vs ${competitor} before pressing on price.`;
  if (adv > dis) return `Lead with feature advantage over ${competitor} to justify premium.`;
  return `Hold — closely matched to ${competitor}.`;
}
