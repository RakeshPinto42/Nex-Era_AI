// Executive Action Center — the point of the module. Aggregates the positioning +
// SKU-comparison signals into a ranked Top-10 of "what should Sonny's do next",
// each with expected revenue/margin impact, risk and a confidence score.
//
// Honesty: impacts are expressed as % derived from REAL web-sourced price gaps.
// Absolute $ totals need Sonny's internal volumes/costs and are intentionally not
// fabricated. Confidence reflects how much priced data backs each action.

import type { RiskLevel } from "../types";
import type { PositioningResult } from "./positioning";
import type { SkuComparison } from "./sku-comparison";

export type ExecAction = {
  rank: number;
  action: string;
  revenueImpactPct: number | null; // expected effect on the SKU's price/revenue line
  marginImpactPct: number | null; // est. effect on unit margin (price moves flow to margin)
  risk: RiskLevel;
  confidence: number; // 0-100
  source: string;
};

export type ExecResult = { hasData: boolean; actions: ExecAction[]; dataCoverage: number };

export function buildExecutiveActions(positioning: PositioningResult, comparisons: SkuComparison[]): ExecResult {
  const pricedComparisons = comparisons.filter((c) => c.priceGapPct != null);
  const dataCoverage = comparisons.length ? Math.round((pricedComparisons.length / comparisons.length) * 100) : 0;
  const candidates: Omit<ExecAction, "rank">[] = [];

  // 1) Underpriced SKUs → raise toward the comparable competitor.
  for (const c of pricedComparisons) {
    if ((c.priceGapPct ?? 0) > 5) {
      const conf = clamp(40 + c.similarityPct * 0.5, 40, 95);
      candidates.push({
        action: `Increase ${c.sku.product} price ~${c.priceGapPct}% toward ${c.matchCompetitor}`,
        revenueImpactPct: c.priceGapPct,
        marginImpactPct: c.priceGapPct,
        risk: c.disadvantages.length > c.advantages.length ? "Medium" : "Low",
        confidence: Math.round(conf),
        source: "SKU Comparison",
      });
    }
  }

  // 2) Overpriced + weaker → defend with value/bundle.
  for (const c of pricedComparisons) {
    if ((c.priceGapPct ?? 0) < -5 && c.disadvantages.length >= c.advantages.length) {
      candidates.push({
        action: `Defend ${c.sku.product} vs ${c.matchCompetitor} — bundle or add value (priced ${Math.abs(c.priceGapPct!)}% above)`,
        revenueImpactPct: null,
        marginImpactPct: null,
        risk: "Medium",
        confidence: clamp(Math.round(35 + c.similarityPct * 0.4), 35, 80),
        source: "SKU Comparison",
      });
    }
  }

  // 3) Feature gaps → close before competing on price.
  for (const c of comparisons) {
    if (c.match && c.disadvantages.length >= 2 && c.advantages.length === 0) {
      candidates.push({
        action: `Close feature gap on ${c.sku.product}: ${c.disadvantages.slice(0, 3).join(", ")}`,
        revenueImpactPct: null,
        marginImpactPct: null,
        risk: "Medium",
        confidence: 55,
        source: "SKU Comparison",
      });
    }
  }

  // 4) Market-level moves from positioning.
  for (const r of positioning.recommendations) {
    candidates.push({
      action: r.title,
      revenueImpactPct: null,
      marginImpactPct: null,
      risk: r.risk,
      confidence: r.risk === "Low" ? 70 : 55,
      source: "Positioning",
    });
  }
  if (positioning.pricePositionPct != null && positioning.pricePositionPct < -3) {
    candidates.push({
      action: `Run a portfolio-wide price review — Sonny's sits ${Math.abs(positioning.pricePositionPct)}% below market average`,
      revenueImpactPct: Math.abs(positioning.pricePositionPct),
      marginImpactPct: Math.abs(positioning.pricePositionPct),
      risk: "Medium",
      confidence: clamp(40 + dataCoverage * 0.4, 40, 85),
      source: "Positioning",
    });
  }

  // Rank: impact (or a base) × confidence, de-duplicated by action text.
  const seen = new Set<string>();
  const ranked = candidates
    .filter((c) => (seen.has(c.action) ? false : (seen.add(c.action), true)))
    .map((c) => ({ c, score: (Math.abs(c.revenueImpactPct ?? 6) + 4) * (c.confidence / 100) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((x, i) => ({ rank: i + 1, ...x.c }));

  return { hasData: candidates.length > 0, actions: ranked, dataCoverage };
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
