// Growth Opportunities + Price Increase Scanner. Finds cross-sell / upsell /
// white-space revenue from the customer ownership matrix, and scans SKUs that can
// absorb a price increase (high win rate + headroom vs competitor). Browser-only.

import { uid } from "@/lib/utils";
import type { Recommendation, RiskLevel } from "./types";

export type Customer = {
  name: string;
  region: string;
  annualSpend: number;
  owns: { equipment: boolean; service: boolean; chemical: boolean; reclaim: boolean };
};

export type GrowthOpp = {
  customer: string;
  region: string;
  type: "Cross-Sell" | "Upsell" | "Renewal" | "White-Space";
  product: string;
  potentialRevenue: number;
  potentialMargin: number;
  priorityScore: number;
};

// Attach economics for the products we cross-sell into an equipment base.
const ATTACH = {
  service: { product: "Service Contract", revenue: 2380, marginPct: 12, likelihood: 0.55 },
  chemical: { product: "Chemical Pack (annual)", revenue: 12000, marginPct: 14, likelihood: 0.45 },
  reclaim: { product: "Water Reclaim", revenue: 17800, marginPct: 18, likelihood: 0.35 },
} as const;

export function findGrowthOpps(customers: Customer[] = CUSTOMERS): GrowthOpp[] {
  const opps: GrowthOpp[] = [];
  for (const c of customers) {
    if (!c.owns.equipment) continue; // base must own equipment
    (["service", "chemical", "reclaim"] as const).forEach((key) => {
      if (c.owns[key]) return;
      const a = ATTACH[key];
      const potentialRevenue = Math.round(a.revenue * a.likelihood);
      opps.push({
        customer: c.name,
        region: c.region,
        type: "Cross-Sell",
        product: a.product,
        potentialRevenue,
        potentialMargin: Math.round(a.revenue * a.likelihood * (a.marginPct / 100)),
        priorityScore: Math.round(a.likelihood * 100),
      });
    });
  }
  return opps.sort((a, b) => b.potentialMargin - a.potentialMargin);
}

export type PriceScanRow = {
  sku: string;
  product: string;
  currentPrice: number;
  recommendedPrice: number;
  increasePct: number;
  expectedMarginGain: number;
  risk: RiskLevel;
};

type ScanSku = { sku: string; product: string; cost: number; currentPrice: number; competitorPrice: number; winRate: number; annualUnits: number };

export function scanPriceIncreases(skus: ScanSku[] = SCAN_SKUS): PriceScanRow[] {
  return skus
    .map((s) => {
      const headroomCap = s.competitorPrice * 0.98; // stay under competitor
      // A strong win rate supports a larger increase.
      const maxByWin = s.currentPrice * (1 + (s.winRate >= 60 ? 0.08 : s.winRate >= 45 ? 0.05 : 0.02));
      const recommendedPrice = Math.round(Math.max(s.currentPrice, Math.min(headroomCap, maxByWin)));
      const increasePct = s.currentPrice ? Math.round(((recommendedPrice - s.currentPrice) / s.currentPrice) * 1000) / 10 : 0;
      const expectedMarginGain = Math.round((recommendedPrice - s.currentPrice) * s.annualUnits);
      const risk: RiskLevel = s.winRate >= 60 ? "Low" : s.winRate >= 45 ? "Medium" : "High";
      return { sku: s.sku, product: s.product, currentPrice: s.currentPrice, recommendedPrice, increasePct, expectedMarginGain, risk };
    })
    .filter((r) => r.increasePct > 0)
    .sort((a, b) => b.expectedMarginGain - a.expectedMarginGain);
}

export function growthRecommendations(
  opps: GrowthOpp[] = findGrowthOpps(),
  scans: PriceScanRow[] = scanPriceIncreases(),
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Bundle the biggest cross-sell theme.
  const byProduct = new Map<string, { revenue: number; margin: number; n: number }>();
  for (const o of opps) {
    const cur = byProduct.get(o.product) ?? { revenue: 0, margin: 0, n: 0 };
    byProduct.set(o.product, { revenue: cur.revenue + o.potentialRevenue, margin: cur.margin + o.potentialMargin, n: cur.n + 1 });
  }
  for (const [product, v] of [...byProduct.entries()].sort((a, b) => b[1].margin - a[1].margin).slice(0, 2)) {
    recs.push({
      id: uid(),
      module: "growth-opportunities",
      title: `Bundle ${product} into ${v.n} equipment accounts`,
      rationale: `Cross-sell white space across the installed base.`,
      revenueImpact: v.revenue,
      marginGain: v.margin,
      risk: "Low",
      priority: 50,
    });
  }

  // Top price increases.
  for (const s of scans.slice(0, 2)) {
    recs.push({
      id: uid(),
      module: "growth-opportunities",
      title: `Increase ${s.product} by ${s.increasePct}% → $${s.recommendedPrice.toLocaleString()}`,
      rationale: `Win rate supports the move; stays under competitor pricing.`,
      marginGain: s.expectedMarginGain,
      risk: s.risk,
      priority: 46,
    });
  }

  return recs;
}

export const CUSTOMERS: Customer[] = [
  { name: "Sparkle Wash", region: "Texas", annualSpend: 142000, owns: { equipment: true, service: false, chemical: true, reclaim: false } },
  { name: "BrightCar", region: "Southeast", annualSpend: 98000, owns: { equipment: true, service: true, chemical: false, reclaim: false } },
  { name: "AutoSpa", region: "Midwest", annualSpend: 76000, owns: { equipment: true, service: false, chemical: false, reclaim: false } },
  { name: "EcoWash", region: "Southeast", annualSpend: 64000, owns: { equipment: true, service: true, chemical: true, reclaim: true } },
  { name: "MetroWash", region: "West", annualSpend: 120000, owns: { equipment: true, service: false, chemical: true, reclaim: false } },
  { name: "CityWash", region: "Northeast", annualSpend: 54000, owns: { equipment: true, service: true, chemical: false, reclaim: false } },
];

export const SCAN_SKUS: ScanSku[] = [
  { sku: "T-900", product: "Tunnel System T-900", cost: 62000, currentPrice: 84000, competitorPrice: 95000, winRate: 48, annualUnits: 18 },
  { sku: "R-200", product: "Water Reclaim R-200", cost: 14500, currentPrice: 17800, competitorPrice: 17200, winRate: 55, annualUnits: 64 },
  { sku: "CX-10", product: "Chemical Pack CX", cost: 880, currentPrice: 1020, competitorPrice: 1340, winRate: 67, annualUnits: 1200 },
  { sku: "SVC-PRO", product: "Service Contract Pro", cost: 2100, currentPrice: 2380, competitorPrice: 3100, winRate: 62, annualUnits: 340 },
  { sku: "D-50", product: "Dryer D-50", cost: 6800, currentPrice: 9200, competitorPrice: 8600, winRate: 41, annualUnits: 90 },
];
