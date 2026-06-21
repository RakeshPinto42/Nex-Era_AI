// Executive Strategy Center — the aggregator. Runs every sub-module's recommendation
// engine over the shared samples and ranks the resulting strategic moves by impact.
// Independent of navigation (computes directly, doesn't wait for a tab to mount).

import { rankRecommendations, type Recommendation } from "./types";
import { marginOptimizerRecommendations } from "./margin-optimizer";
import { matchSkus, skuRecommendations, OUR_SKUS, COMPETITOR_SKUS } from "./sku-intelligence";
import { computeMarketPosition } from "./market-position";
import { computeCompetitorIntel } from "./competitor-intelligence";
import { dealDeskRecommendations } from "./deal-desk";
import { computeWinLoss } from "./win-loss";
import { computeTerritory } from "./territory";
import { growthRecommendations } from "./growth";

export type StrategySummary = {
  recommendations: Recommendation[];
  totalMarginGain: number;
  totalRevenueImpact: number;
  quickWins: Recommendation[]; // Low risk
  strategic: Recommendation[]; // Medium / High risk
  byModule: { module: string; count: number; marginGain: number }[];
};

export function buildExecutiveStrategy(): StrategySummary {
  const all: Recommendation[] = [
    ...marginOptimizerRecommendations(),
    ...skuRecommendations(matchSkus(OUR_SKUS, COMPETITOR_SKUS)),
    ...computeMarketPosition().recommendations,
    ...computeCompetitorIntel().recommendations,
    ...dealDeskRecommendations(),
    ...computeWinLoss().recommendations,
    ...computeTerritory().recommendations,
    ...growthRecommendations(),
  ];

  const recommendations = rankRecommendations(all);
  const totalMarginGain = all.reduce((s, r) => s + (r.marginGain ?? 0), 0);
  const totalRevenueImpact = all.reduce((s, r) => s + (r.revenueImpact ?? 0), 0);

  const byModuleMap = new Map<string, { count: number; marginGain: number }>();
  for (const r of all) {
    const cur = byModuleMap.get(r.module) ?? { count: 0, marginGain: 0 };
    byModuleMap.set(r.module, { count: cur.count + 1, marginGain: cur.marginGain + (r.marginGain ?? 0) });
  }
  const byModule = [...byModuleMap.entries()]
    .map(([module, v]) => ({ module, ...v }))
    .sort((a, b) => b.marginGain - a.marginGain);

  return {
    recommendations,
    totalMarginGain,
    totalRevenueImpact,
    quickWins: recommendations.filter((r) => r.risk === "Low"),
    strategic: recommendations.filter((r) => r.risk !== "Low"),
    byModule,
  };
}

export const MODULE_LABELS: Record<string, string> = {
  "margin-optimizer": "Margin Optimizer",
  "sku-intelligence": "SKU Intelligence",
  "market-position": "Market Position",
  "competitor-intelligence": "Competitor Intelligence",
  "deal-desk": "Deal Desk",
  "win-loss": "Win/Loss Analytics",
  "territory-intelligence": "Territory Intelligence",
  "growth-opportunities": "Growth Opportunities",
};
