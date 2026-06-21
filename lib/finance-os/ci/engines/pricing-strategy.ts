// Pricing Strategy Engine. For every Sonny's SKU, recommend a pricing action
// (raise / hold / bundle / promote / defend / aggressive / premium) with the
// expected margin, revenue and win-rate impact, and a risk score. Derived from the
// SKU-comparison signals — % impacts come from real web price gaps, not invented $.

import { type EntityCatalog } from "../sonnys";
import { compareSkus, type SkuComparison } from "./sku-comparison";

export type PricingAction =
  | "Increase Price"
  | "Premium Pricing"
  | "Hold Price"
  | "Bundle Product"
  | "Promote Product"
  | "Defend Position"
  | "Aggressive Pricing";

export type PricingRow = {
  product: string;
  price: number | null;
  competitor: string | null;
  priceGapPct: number | null; // + = we're cheaper than the match
  action: PricingAction;
  marginImpactPct: number | null;
  revenueImpactPct: number | null;
  winRateImpactPct: number | null;
  riskScore: number; // 0-100, higher = riskier
  rationale: string;
};

const EQUIPMENT = /tunnel|dryer|conveyor|wash system|equipment|arch|blower/i;

export function buildPricingStrategy(sonnys: EntityCatalog, competitors: EntityCatalog[]): PricingRow[] {
  return compareSkus(sonnys, competitors).map((c) => decide(c));
}

function decide(c: SkuComparison): PricingRow {
  const base = { product: c.sku.product, price: c.sku.price, competitor: c.matchCompetitor, priceGapPct: c.priceGapPct };
  const gap = c.priceGapPct; // + = we're cheaper
  const adv = c.advantages.length;
  const dis = c.disadvantages.length;

  // No comparable competitor → differentiated; promote rather than price-fight.
  if (!c.match) {
    return { ...base, action: "Promote Product", marginImpactPct: null, revenueImpactPct: null, winRateImpactPct: null, riskScore: 35, rationale: "No close competitor match — differentiate and promote rather than compete on price." };
  }

  if (gap == null) {
    return { ...base, action: dis > adv ? "Defend Position" : "Hold Price", marginImpactPct: null, revenueImpactPct: null, winRateImpactPct: null, riskScore: 40, rationale: `Comparable to ${c.matchCompetitor} but no price found — research pricing to act.` };
  }

  // We're materially cheaper than a comparable/weaker rival → capture margin.
  if (gap > 8 && adv >= dis) {
    return { ...base, action: "Increase Price", marginImpactPct: round(gap), revenueImpactPct: round(gap), winRateImpactPct: round(-gap * 0.35), riskScore: dis > 0 ? 40 : 25, rationale: `Priced ${gap}% under ${c.matchCompetitor} with equal/stronger spec — raise toward parity to capture margin.` };
  }
  // Slightly cheaper, comparable → premium pricing room.
  if (gap > 2 && adv >= dis) {
    return { ...base, action: "Premium Pricing", marginImpactPct: round(gap * 0.5), revenueImpactPct: round(gap * 0.5), winRateImpactPct: round(-gap * 0.2), riskScore: 30, rationale: `Modest headroom vs ${c.matchCompetitor} — nudge toward premium while holding advantage.` };
  }
  // Cheaper but we're behind on features → use price to win share.
  if (gap > 5 && dis > adv) {
    return { ...base, action: "Aggressive Pricing", marginImpactPct: round(-gap * 0.2), revenueImpactPct: round(gap * 0.4), winRateImpactPct: round(gap * 0.5), riskScore: 45, rationale: `Behind ${c.matchCompetitor} on features but cheaper — lead with price to win share while closing the gap.` };
  }
  // We're pricier and weaker → defend / bundle.
  if (gap < -5 && dis >= adv) {
    const equip = EQUIPMENT.test(c.sku.category || "") || EQUIPMENT.test(c.sku.product);
    return { ...base, action: equip ? "Bundle Product" : "Defend Position", marginImpactPct: null, revenueImpactPct: null, winRateImpactPct: round(8), riskScore: 55, rationale: `Priced ${Math.abs(gap)}% above ${c.matchCompetitor} with fewer features — ${equip ? "bundle service/options to justify the premium" : "defend on value, service and warranty"}.` };
  }
  // Pricier but stronger → premium is defensible.
  if (gap < -2 && adv > dis) {
    return { ...base, action: "Premium Pricing", marginImpactPct: null, revenueImpactPct: null, winRateImpactPct: round(-3), riskScore: 30, rationale: `Above ${c.matchCompetitor} but better-specified — hold the premium and sell the advantage.` };
  }

  return { ...base, action: "Hold Price", marginImpactPct: null, revenueImpactPct: null, winRateImpactPct: null, riskScore: 20, rationale: `Closely matched to ${c.matchCompetitor} — hold and monitor.` };
}

const round = (n: number) => Math.round(n * 10) / 10;
