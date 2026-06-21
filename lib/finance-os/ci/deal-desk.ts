// Deal Desk (Commercial Intelligence) — evaluate a live opportunity against the
// competitor. Produces a deal score, win probability, margin impact, approval
// requirement and a suggested counter-price/discount. Pure, browser-only.

import { uid } from "@/lib/utils";
import { approvalForDiscount, type ApprovalLevel } from "@/lib/finance-os/pricing";
import type { Recommendation, RiskLevel } from "./types";

export type Opportunity = {
  id: string;
  customer: string;
  region: string;
  product: string;
  competitor: string;
  listPrice: number;
  cost: number;
  competitorPrice: number;
  requestedDiscountPct: number;
  volume: number;
  status: "Open" | "Won" | "Lost";
};

export type DealEval = {
  requestedPrice: number;
  marginPct: number;
  marginImpact: number; // gross profit at requested price
  discountPct: number;
  winProbability: number; // %
  dealScore: number; // 0-100
  approval: ApprovalLevel;
  risk: RiskLevel;
  suggestedPrice: number;
  suggestedDiscountPct: number;
  recommendation: string;
};

const FLOOR_MARGIN = 20;

export function evaluateDeal(o: Opportunity): DealEval {
  const requestedPrice = o.listPrice * (1 - o.requestedDiscountPct / 100);
  const marginPct = requestedPrice ? ((requestedPrice - o.cost) / requestedPrice) * 100 : 0;
  const marginImpact = (requestedPrice - o.cost) * o.volume;

  // Win probability: cheaper than the competitor lifts it; logistic on price gap.
  const gapVsComp = o.competitorPrice ? (o.competitorPrice - requestedPrice) / o.competitorPrice : 0;
  const winProbability = clamp(Math.round(100 / (1 + Math.exp(-8 * gapVsComp))), 3, 97);

  // Deal score blends margin health and win likelihood.
  const marginHealth = clamp((marginPct / 40) * 100, 0, 100);
  const dealScore = Math.round(0.5 * marginHealth + 0.5 * winProbability);

  const approval = approvalForDiscount(o.requestedDiscountPct);
  const risk: RiskLevel = marginPct < FLOOR_MARGIN ? "High" : marginPct < 30 ? "Medium" : "Low";

  // Suggested price: undercut competitor slightly but never below the margin floor.
  const floorPrice = o.cost / (1 - FLOOR_MARGIN / 100);
  const suggestedPrice = Math.max(floorPrice, Math.min(requestedPrice, o.competitorPrice * 0.98));
  const suggestedDiscountPct = o.listPrice ? Math.round(((o.listPrice - suggestedPrice) / o.listPrice) * 1000) / 10 : 0;

  const recommendation =
    marginPct < FLOOR_MARGIN
      ? "Reject / requote — below margin floor"
      : dealScore >= 65
        ? "Approve at suggested price"
        : `Escalate — ${approval}`;

  return {
    requestedPrice: Math.round(requestedPrice),
    marginPct: Math.round(marginPct * 10) / 10,
    marginImpact: Math.round(marginImpact),
    discountPct: o.requestedDiscountPct,
    winProbability,
    dealScore,
    approval,
    risk,
    suggestedPrice: Math.round(suggestedPrice),
    suggestedDiscountPct,
    recommendation,
  };
}

export function dealDeskRecommendations(opps: Opportunity[] = OPPORTUNITIES): Recommendation[] {
  return opps
    .filter((o) => o.status === "Open")
    .map((o) => ({ o, e: evaluateDeal(o) }))
    .map(({ o, e }) => ({
      id: uid(),
      module: "deal-desk",
      title:
        e.risk === "High"
          ? `Requote ${o.customer} to $${e.suggestedPrice.toLocaleString()} (${e.suggestedDiscountPct}% disc)`
          : `${e.recommendation.startsWith("Approve") ? "Approve" : "Escalate"} ${o.customer} — ${o.product}`,
      rationale: `Win prob ${e.winProbability}% · margin ${e.marginPct}% vs ${o.competitor} at $${o.competitorPrice.toLocaleString()}.`,
      marginGain: e.risk === "High" ? Math.round((e.suggestedPrice - e.requestedPrice) * o.volume) : undefined,
      revenueImpact: Math.round(e.requestedPrice * o.volume),
      risk: e.risk,
      priority: e.risk === "High" ? 50 : 30,
    }));
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const OPPORTUNITIES: Opportunity[] = [
  { id: "o1", customer: "Sparkle Wash", region: "Texas", product: "Tunnel System T-900", competitor: "CleanCo", listPrice: 100000, cost: 62000, competitorPrice: 95000, requestedDiscountPct: 18, volume: 3, status: "Open" },
  { id: "o2", customer: "EcoWash", region: "Southeast", product: "Water Reclaim R-200", competitor: "HydroMax", listPrice: 20000, cost: 14500, competitorPrice: 17200, requestedDiscountPct: 12, volume: 8, status: "Open" },
  { id: "o3", customer: "JetWash", region: "Texas", product: "Tunnel System T-900", competitor: "AquaJet", listPrice: 100000, cost: 62000, competitorPrice: 79000, requestedDiscountPct: 28, volume: 2, status: "Open" },
  { id: "o4", customer: "FoamKing", region: "Midwest", product: "Chemical Pack CX", competitor: "ChemPro", listPrice: 1200, cost: 880, competitorPrice: 1290, requestedDiscountPct: 8, volume: 600, status: "Open" },
  { id: "o5", customer: "CityWash", region: "Northeast", product: "Service Contract Pro", competitor: "HydroMax", listPrice: 2800, cost: 2100, competitorPrice: 3100, requestedDiscountPct: 5, volume: 120, status: "Open" },
];
