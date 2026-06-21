// SKU Intelligence — match our products against competitor products. Computes a
// similarity score (feature / capacity / warranty within the same category), the
// price gap, the feature gap, and the resulting margin opportunity. Pure, browser-only.
// Emits Recommendations: where a close competitor is priced higher, raising toward
// them is low-risk margin; where they carry features we lack, that's a roadmap gap.

import { uid } from "@/lib/utils";
import type { Recommendation, RiskLevel } from "./types";

export type CompetitorSku = {
  sku: string;
  product: string;
  vendor: string;
  category: string;
  features: string[];
  capacity: number; // domain unit (e.g. cars/hr); 0 = N/A
  warrantyMonths: number;
  price: number;
};

export type OurSku = Omit<CompetitorSku, "vendor"> & {
  cost: number;
  annualUnits: number; // for sizing the margin opportunity
};

export type FeatureGap = {
  theyHave: string[]; // competitor features we lack
  weHave: string[]; // our features the competitor lacks
};

export type SkuMatch = {
  our: OurSku;
  match: CompetitorSku | null;
  similarityPct: number;
  priceGap: number; // competitor − ours (per unit)
  priceGapPct: number;
  featureGap: FeatureGap;
  marginOpportunity: number; // $ from capturing half the positive price gap × annual units
  currentMarginPct: number;
};

const jaccard = (a: string[], b: string[]) => {
  const A = new Set(a.map(norm));
  const B = new Set(b.map(norm));
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
};
const norm = (s: string) => s.trim().toLowerCase();
const closeness = (a: number, b: number) => {
  const m = Math.max(a, b);
  if (m <= 0) return 1; // both N/A → neutral
  return 1 - Math.min(1, Math.abs(a - b) / m);
};

function similarity(our: OurSku, comp: CompetitorSku): number {
  const feat = jaccard(our.features, comp.features);
  const cap = closeness(our.capacity, comp.capacity);
  const warr = closeness(our.warrantyMonths, comp.warrantyMonths);
  return Math.round(100 * (0.55 * feat + 0.25 * cap + 0.2 * warr));
}

function featureGap(our: OurSku, comp: CompetitorSku): FeatureGap {
  const ours = new Set(our.features.map(norm));
  const theirs = new Set(comp.features.map(norm));
  return {
    theyHave: comp.features.filter((f) => !ours.has(norm(f))),
    weHave: our.features.filter((f) => !theirs.has(norm(f))),
  };
}

export function matchSkus(ours: OurSku[], competitors: CompetitorSku[]): SkuMatch[] {
  return ours.map((our) => {
    // Candidates are same-category competitor SKUs; pick the most similar.
    const candidates = competitors.filter((c) => norm(c.category) === norm(our.category));
    let match: CompetitorSku | null = null;
    let best = -1;
    for (const c of candidates) {
      const s = similarity(our, c);
      if (s > best) {
        best = s;
        match = c;
      }
    }
    const similarityPct = match ? best : 0;
    const priceGap = match ? match.price - our.price : 0;
    const priceGapPct = match && our.price ? (priceGap / our.price) * 100 : 0;
    const gap = match ? featureGap(our, match) : { theyHave: [], weHave: [] };
    const marginOpportunity = priceGap > 0 ? Math.round(priceGap * 0.5 * our.annualUnits) : 0;
    const currentMarginPct = our.price ? ((our.price - our.cost) / our.price) * 100 : 0;
    return {
      our,
      match,
      similarityPct,
      priceGap: Math.round(priceGap),
      priceGapPct: Math.round(priceGapPct * 10) / 10,
      featureGap: gap,
      marginOpportunity,
      currentMarginPct: Math.round(currentMarginPct * 10) / 10,
    };
  });
}

export function skuRecommendations(matches: SkuMatch[]): Recommendation[] {
  const recs: Recommendation[] = [];

  // Pricing headroom: close match priced higher than us.
  for (const m of matches) {
    if (!m.match) continue;
    if (m.similarityPct >= 65 && m.priceGapPct > 4 && m.marginOpportunity > 0) {
      const risk: RiskLevel = m.similarityPct >= 85 ? "Low" : m.similarityPct >= 72 ? "Medium" : "High";
      recs.push({
        id: uid(),
        module: "sku-intelligence",
        title: `Reprice ${m.our.product} toward ${m.match.vendor} (+${m.priceGapPct.toFixed(0)}% headroom)`,
        rationale: `${m.similarityPct}% match to ${m.match.product} at $${m.match.price.toLocaleString()} — capturing half the gap on ${m.our.annualUnits.toLocaleString()} units/yr.`,
        marginGain: m.marginOpportunity,
        risk,
      });
    }
  }

  // Feature gaps on close matches: roadmap signal.
  for (const m of matches) {
    if (m.match && m.similarityPct >= 60 && m.featureGap.theyHave.length) {
      recs.push({
        id: uid(),
        module: "sku-intelligence",
        title: `Close feature gap on ${m.our.product}: ${m.featureGap.theyHave.join(", ")}`,
        rationale: `${m.match.vendor} ${m.match.product} carries these and we don't — a win-rate and premium risk.`,
        risk: "Medium",
      });
    }
  }

  return recs;
}

// Sample masters (car-wash equipment domain, aligned with the Margin Optimizer SKUs).
export const OUR_SKUS: OurSku[] = [
  { sku: "T-900", product: "Tunnel System T-900", category: "Tunnel", features: ["Touchless", "LED Dry", "Eco Rinse"], capacity: 120, warrantyMonths: 36, price: 84000, cost: 62000, annualUnits: 18 },
  { sku: "R-200", product: "Water Reclaim R-200", category: "Reclaim", features: ["Bio Filter", "UV Treat"], capacity: 80, warrantyMonths: 24, price: 17800, cost: 14500, annualUnits: 64 },
  { sku: "CX-10", product: "Chemical Pack CX", category: "Chemical", features: ["Biodegradable", "High Foam"], capacity: 0, warrantyMonths: 12, price: 1020, cost: 880, annualUnits: 1200 },
  { sku: "SVC-PRO", product: "Service Contract Pro", category: "Service", features: ["24/7 Support", "Parts Included", "Quarterly Visit"], capacity: 0, warrantyMonths: 12, price: 2380, cost: 2100, annualUnits: 340 },
  { sku: "D-50", product: "Dryer D-50", category: "Dryer", features: ["High CFM", "Energy Save"], capacity: 50, warrantyMonths: 24, price: 9200, cost: 6800, annualUnits: 90 },
];

export const COMPETITOR_SKUS: CompetitorSku[] = [
  { sku: "TX-1000", product: "RivalWash TX-1000", vendor: "CleanCo", category: "Tunnel", features: ["Touchless", "LED Dry", "Eco Rinse", "Ceramic Coat"], capacity: 130, warrantyMonths: 24, price: 95000 },
  { sku: "TX-500", product: "RivalWash TX-500", vendor: "CleanCo", category: "Tunnel", features: ["Touchless", "LED Dry"], capacity: 90, warrantyMonths: 24, price: 72000 },
  { sku: "AQ-250", product: "AquaSave 250", vendor: "HydroMax", category: "Reclaim", features: ["Bio Filter", "UV Treat", "Ozone"], capacity: 90, warrantyMonths: 36, price: 17200 },
  { sku: "FM-CHEM", product: "FoamMax Chem", vendor: "ChemPro", category: "Chemical", features: ["Biodegradable", "High Foam", "Wax Boost"], capacity: 0, warrantyMonths: 12, price: 1340 },
  { sku: "CARE+", product: "CarePlus Service", vendor: "HydroMax", category: "Service", features: ["24/7 Support", "Parts Included"], capacity: 0, warrantyMonths: 12, price: 3100 },
  { sku: "TD-60", product: "TurboDry 60", vendor: "CleanCo", category: "Dryer", features: ["High CFM"], capacity: 60, warrantyMonths: 18, price: 8600 },
];
