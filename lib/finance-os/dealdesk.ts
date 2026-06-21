// Deal Desk — evaluate a customer pricing request: revenue/margin impact,
// contract profitability, approval recommendation, risk. Pure, browser-only.

import { approvalForDiscount, type ApprovalLevel } from "./pricing";

export type DealInput = {
  listPrice: number;
  requestedPrice: number;
  cost: number;
  volume: number;
  termMonths: number;
};

export type RiskLevel = "Low" | "Medium" | "High";

export type DealResult = {
  discountPct: number;
  revenue: number; // over the full term (requestedPrice * volume)
  annualizedRevenue: number;
  grossProfit: number;
  marginPct: number;
  marginVsListPct: number; // margin if sold at list
  approval: ApprovalLevel;
  risk: RiskLevel;
  recommendation: string;
  reasons: string[];
};

export function computeDeal(i: DealInput): DealResult {
  const discountPct = i.listPrice ? ((i.listPrice - i.requestedPrice) / i.listPrice) * 100 : 0;
  const revenue = i.requestedPrice * i.volume;
  const grossProfit = (i.requestedPrice - i.cost) * i.volume;
  const marginPct = i.requestedPrice ? ((i.requestedPrice - i.cost) / i.requestedPrice) * 100 : 0;
  const marginVsListPct = i.listPrice ? ((i.listPrice - i.cost) / i.listPrice) * 100 : 0;
  const annualizedRevenue = i.termMonths ? revenue * (12 / i.termMonths) : revenue;

  const approval = approvalForDiscount(discountPct);
  const risk: RiskLevel = marginPct >= 40 ? "Low" : marginPct >= 20 ? "Medium" : "High";

  const reasons: string[] = [];
  if (discountPct > 25) reasons.push(`Deep discount (${discountPct.toFixed(0)}%) — exec sign-off required.`);
  if (marginPct < 20) reasons.push(`Margin ${marginPct.toFixed(0)}% is below the 20% floor.`);
  if (marginPct < 0) reasons.push("Deal is loss-making at the requested price.");
  if (i.termMonths >= 24) reasons.push("Long term locks in pricing — review escalators.");
  if (!reasons.length) reasons.push("Within standard pricing and margin guardrails.");

  const recommendation =
    marginPct < 0
      ? "Reject — below cost"
      : approval === "Auto Approve" && risk === "Low"
        ? "Approve"
        : `Escalate — ${approval}`;

  return {
    discountPct,
    revenue,
    annualizedRevenue,
    grossProfit,
    marginPct,
    marginVsListPct,
    approval,
    risk,
    recommendation,
    reasons,
  };
}
