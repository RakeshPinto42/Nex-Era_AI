// Pricing Engine — compute optimal price, margin, EBITDA impact, price waterfall,
// break-even and the required approval level. Pure, browser-only.

import { scenarioByPct, runScenarios, type Scenario } from "./scenario";

export type PricingInput = {
  cost: number; // unit cost
  volume: number;
  listPrice: number;
  discountPct: number;
  marginTargetPct: number;
  opexPct: number; // operating expense as % of revenue
  fixedCost: number; // period fixed cost, for break-even units
};

export type ApprovalLevel = "Auto Approve" | "Manager Approval" | "Finance Approval" | "Executive Approval";

export type PricingResult = {
  netPrice: number;
  revenue: number;
  grossProfitUnit: number;
  grossProfit: number;
  grossMarginPct: number;
  opex: number;
  ebitda: number;
  ebitdaPct: number;
  recommendedPrice: number; // price to hit margin target
  breakEvenUnits: number;
  approval: ApprovalLevel;
  meetsTarget: boolean;
  waterfall: { label: string; value: number }[]; // per-unit
};

export function approvalForDiscount(discountPct: number): ApprovalLevel {
  if (discountPct <= 5) return "Auto Approve";
  if (discountPct <= 15) return "Manager Approval";
  if (discountPct <= 25) return "Finance Approval";
  return "Executive Approval";
}

export function computePricing(i: PricingInput): PricingResult {
  const netPrice = i.listPrice * (1 - i.discountPct / 100);
  const revenue = netPrice * i.volume;
  const grossProfitUnit = netPrice - i.cost;
  const grossProfit = grossProfitUnit * i.volume;
  const grossMarginPct = netPrice ? (grossProfitUnit / netPrice) * 100 : 0;
  const opex = revenue * (i.opexPct / 100);
  const ebitda = grossProfit - opex - i.fixedCost;
  const ebitdaPct = revenue ? (ebitda / revenue) * 100 : 0;
  const recommendedPrice = i.marginTargetPct < 100 ? i.cost / (1 - i.marginTargetPct / 100) : Infinity;
  const contributionPerUnit = grossProfitUnit - netPrice * (i.opexPct / 100);
  const breakEvenUnits = contributionPerUnit > 0 ? i.fixedCost / contributionPerUnit : Infinity;

  return {
    netPrice,
    revenue,
    grossProfitUnit,
    grossProfit,
    grossMarginPct,
    opex,
    ebitda,
    ebitdaPct,
    recommendedPrice,
    breakEvenUnits,
    approval: approvalForDiscount(i.discountPct),
    meetsTarget: grossMarginPct >= i.marginTargetPct,
    waterfall: [
      { label: "List", value: i.listPrice },
      { label: "Discount", value: -(i.listPrice - netPrice) },
      { label: "Cost", value: -i.cost },
      { label: "Opex", value: -netPrice * (i.opexPct / 100) },
    ],
  };
}

/** Best / base / worst by volume ±pct and discount ∓pts. */
export function pricingScenarios(base: PricingInput): Scenario<PricingResult> {
  const vol = scenarioByPct(base.volume, 20, 20);
  return runScenarios(
    {
      base,
      best: { ...base, volume: vol.best, discountPct: Math.max(0, base.discountPct - 5) },
      worst: { ...base, volume: vol.worst, discountPct: base.discountPct + 5 },
    },
    (inp) => computePricing(inp),
  );
}
