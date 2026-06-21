// Margin Optimizer — recommend optimal pricing for a SKU given cost, the current
// price, the competitor's price, volume and a target margin. Pure, browser-only.
// Produces price tiers, a margin curve, a build-up waterfall, a price-sensitivity
// table and — critically — Recommendations with expected margin gain + risk.

import { uid } from "@/lib/utils";
import type { Recommendation, RiskLevel } from "./types";

export type MarginOptimizerInput = {
  product: string;
  cost: number;
  currentPrice: number;
  competitorPrice: number;
  volume: number;
  region: string;
  targetMarginPct: number;
  floorMarginPct: number; // minimum acceptable margin
};

export type PricePoint = { price: number; marginPct: number; profit: number };

export type MarginOptimizerResult = {
  minPrice: number; // price at the margin floor
  targetPrice: number; // price at the target margin
  premiumPrice: number; // anchored just under the competitor
  stretchPrice: number; // priced above the competitor
  currentMarginPct: number;
  currentProfit: number;
  targetProfit: number;
  profitImpact: number; // moving current -> target over volume
  competitorGapPct: number; // (competitor - current) / current
  curve: PricePoint[];
  waterfall: { label: string; value: number }[];
  sensitivity: { label: string; price: number; profit: number; marginPct: number }[];
  recommendations: Recommendation[];
};

const marginAt = (price: number, cost: number) => (price ? ((price - cost) / price) * 100 : 0);
const priceForMargin = (cost: number, marginPct: number) =>
  marginPct < 100 ? cost / (1 - marginPct / 100) : Infinity;

export function computeMarginOptimizer(i: MarginOptimizerInput): MarginOptimizerResult {
  const minPrice = priceForMargin(i.cost, i.floorMarginPct);
  const targetPrice = priceForMargin(i.cost, i.targetMarginPct);
  const premiumPrice = Math.max(targetPrice, i.competitorPrice * 0.97);
  const stretchPrice = Math.max(premiumPrice, i.competitorPrice) * 1.05;

  const currentMarginPct = marginAt(i.currentPrice, i.cost);
  const currentProfit = (i.currentPrice - i.cost) * i.volume;
  const targetProfit = (targetPrice - i.cost) * i.volume;
  const profitImpact = (targetPrice - i.currentPrice) * i.volume;
  const competitorGapPct = i.currentPrice ? ((i.competitorPrice - i.currentPrice) / i.currentPrice) * 100 : 0;

  // Margin curve: sweep price from the floor up past the competitor.
  const lo = Math.min(minPrice, i.currentPrice) * 0.95;
  const hi = Math.max(stretchPrice, i.competitorPrice * 1.15);
  const STEPS = 24;
  const curve: PricePoint[] = [];
  for (let s = 0; s <= STEPS; s++) {
    const price = lo + ((hi - lo) * s) / STEPS;
    curve.push({ price: round2(price), marginPct: round1(marginAt(price, i.cost)), profit: Math.round((price - i.cost) * i.volume) });
  }

  // Per-unit build-up from cost to the recommended target price.
  const waterfall = [
    { label: "Cost", value: round2(i.cost) },
    { label: "Current margin", value: round2(i.currentPrice - i.cost) },
    { label: "Uplift", value: round2(Math.max(0, targetPrice - i.currentPrice)) },
  ];

  const sensitivity = [-10, -5, 0, 5, 10].map((d) => {
    const price = i.currentPrice * (1 + d / 100);
    return {
      label: `${d > 0 ? "+" : ""}${d}%`,
      price: round2(price),
      profit: Math.round((price - i.cost) * i.volume),
      marginPct: round1(marginAt(price, i.cost)),
    };
  });

  return {
    minPrice: round2(minPrice),
    targetPrice: round2(targetPrice),
    premiumPrice: round2(premiumPrice),
    stretchPrice: round2(stretchPrice),
    currentMarginPct: round1(currentMarginPct),
    currentProfit: Math.round(currentProfit),
    targetProfit: Math.round(targetProfit),
    profitImpact: Math.round(profitImpact),
    competitorGapPct: round1(competitorGapPct),
    curve,
    waterfall,
    sensitivity,
    recommendations: buildRecommendations(i, { minPrice, targetPrice, currentMarginPct, profitImpact, competitorGapPct }),
  };
}

function buildRecommendations(
  i: MarginOptimizerInput,
  d: { minPrice: number; targetPrice: number; currentMarginPct: number; profitImpact: number; competitorGapPct: number },
): Recommendation[] {
  const recs: Recommendation[] = [];

  // 1. Below the margin floor — reprice immediately.
  if (d.currentMarginPct < i.floorMarginPct) {
    recs.push({
      id: uid(),
      module: "margin-optimizer",
      title: `Reprice ${i.product} to $${fmt(d.minPrice)} — below ${i.floorMarginPct}% floor`,
      rationale: `Current margin is ${d.currentMarginPct.toFixed(1)}% in ${i.region}. Lifting to the floor restores acceptable profitability.`,
      marginGain: Math.round((d.minPrice - i.currentPrice) * i.volume),
      risk: "High",
    });
  }

  // 2. Underpriced vs target — raise to hit the target margin.
  if (d.targetPrice > i.currentPrice * 1.001) {
    const risk: RiskLevel = d.targetPrice <= i.competitorPrice ? "Low" : d.targetPrice <= i.competitorPrice * 1.05 ? "Medium" : "High";
    recs.push({
      id: uid(),
      module: "margin-optimizer",
      title: `Raise ${i.product} to $${fmt(d.targetPrice)} to reach ${i.targetMarginPct}% margin`,
      rationale: `Target price is ${d.targetPrice <= i.competitorPrice ? "still below" : "above"} the competitor's $${fmt(i.competitorPrice)}.`,
      marginGain: d.profitImpact,
      risk,
    });
  }

  // 3. Priced under the competitor — headroom to capture premium.
  if (d.competitorGapPct > 2) {
    recs.push({
      id: uid(),
      module: "margin-optimizer",
      title: `Capture competitor premium on ${i.product} (+${d.competitorGapPct.toFixed(0)}% headroom)`,
      rationale: `Competitor prices ${d.competitorGapPct.toFixed(1)}% higher. Closing half the gap is low-risk margin.`,
      marginGain: Math.round((i.competitorPrice - i.currentPrice) * 0.5 * i.volume),
      risk: "Low",
    });
  }

  if (!recs.length) {
    recs.push({
      id: uid(),
      module: "margin-optimizer",
      title: `Hold ${i.product} — priced at optimum`,
      rationale: `Margin ${d.currentMarginPct.toFixed(1)}% meets target and is competitive.`,
      marginGain: 0,
      risk: "Low",
    });
  }

  return recs;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—");

/** Recommendations across every sample SKU — used by the Executive Strategy Center. */
export function marginOptimizerRecommendations(samples: MarginOptimizerInput[] = MARGIN_OPTIMIZER_SAMPLES): Recommendation[] {
  return samples.flatMap((s) => computeMarginOptimizer(s).recommendations).filter((r) => (r.marginGain ?? 0) !== 0);
}

// Sample SKUs so the module is useful on first load (no upload required).
export const MARGIN_OPTIMIZER_SAMPLES: MarginOptimizerInput[] = [
  { product: "Tunnel System T-900", cost: 62000, currentPrice: 84000, competitorPrice: 95000, volume: 18, region: "Texas", targetMarginPct: 32, floorMarginPct: 20 },
  { product: "Water Reclaim R-200", cost: 14500, currentPrice: 17800, competitorPrice: 17200, volume: 64, region: "Southeast", targetMarginPct: 28, floorMarginPct: 18 },
  { product: "Chemical Pack CX", cost: 880, currentPrice: 1020, competitorPrice: 1340, volume: 1200, region: "West", targetMarginPct: 35, floorMarginPct: 22 },
  { product: "Service Contract Pro", cost: 2100, currentPrice: 2380, competitorPrice: 3100, volume: 340, region: "Midwest", targetMarginPct: 45, floorMarginPct: 30 },
];
