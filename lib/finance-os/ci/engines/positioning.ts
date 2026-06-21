// Sonny's Positioning Engine. Where Sonny's stands vs competitors: price position,
// premium rank, competitive position, product/market coverage, threat level.
// Pure — computes from web-sourced catalogs only.

import { uid } from "@/lib/utils";
import type { Recommendation, RiskLevel } from "../types";
import { type EntityCatalog, avgPrice, categories, priced } from "../sonnys";

export type ThreatRow = { competitor: string; avgPrice: number | null; products: number; pricePosPct: number | null; threat: RiskLevel };
export type CategoryRow = { category: string; sonnysAvg: number | null; marketAvg: number | null; position: "Premium" | "Parity" | "Value" | "No data" };

export type PositioningResult = {
  hasData: boolean;
  sonnysAvg: number | null;
  marketAvg: number | null;
  pricePositionPct: number | null; // sonny's vs market, %
  premiumRank: number;
  entities: number;
  productCoverage: number; // sonny's distinct categories
  marketCategories: number; // categories across the whole market
  competitorsWithData: number;
  competitorsTotal: number;
  threats: ThreatRow[];
  byCategory: CategoryRow[];
  recommendations: Recommendation[];
};

export function computePositioning(sonnys: EntityCatalog, competitors: EntityCatalog[]): PositioningResult {
  const sAvg = avgPrice(sonnys.products);
  const withData = competitors.filter((c) => priced(c.products).length > 0);
  const compAvgs = withData.map((c) => ({ name: c.name, avg: avgPrice(c.products)!, n: c.products.length }));
  const marketAvg = compAvgs.length ? compAvgs.reduce((s, c) => s + c.avg, 0) / compAvgs.length : null;

  // Premium rank: where Sonny's avg sits among all entities (1 = most premium).
  const allAvgs = [...compAvgs.map((c) => c.avg), ...(sAvg != null ? [sAvg] : [])].sort((a, b) => b - a);
  const premiumRank = sAvg != null ? allAvgs.indexOf(sAvg) + 1 : 0;

  const sonnysCats = categories(sonnys.products);
  const marketCats = new Set<string>();
  for (const c of competitors) for (const cat of categories(c.products)) marketCats.add(cat);

  const threats: ThreatRow[] = compAvgs
    .map((c) => {
      const pricePosPct = sAvg ? Math.round(((c.avg - sAvg) / sAvg) * 1000) / 10 : null;
      // Threat: undercuts us AND has breadth.
      const undercut = pricePosPct != null && pricePosPct < -3;
      const broad = c.n >= Math.max(3, sonnys.products.length * 0.6);
      const threat: RiskLevel = undercut && broad ? "High" : undercut || broad ? "Medium" : "Low";
      return { competitor: c.name, avgPrice: c.avg, products: c.n, pricePosPct, threat };
    })
    .sort((a, b) => rank(b.threat) - rank(a.threat) || (a.pricePosPct ?? 0) - (b.pricePosPct ?? 0));

  const byCategory = buildCategoryRows(sonnys, competitors, [...marketCats]);

  return {
    hasData: sAvg != null || compAvgs.length > 0,
    sonnysAvg: sAvg,
    marketAvg,
    pricePositionPct: sAvg != null && marketAvg != null ? Math.round(((sAvg - marketAvg) / marketAvg) * 1000) / 10 : null,
    premiumRank,
    entities: allAvgs.length,
    productCoverage: sonnysCats.size,
    marketCategories: marketCats.size,
    competitorsWithData: withData.length,
    competitorsTotal: competitors.length,
    threats,
    byCategory,
    recommendations: buildRecs(sAvg, marketAvg, sonnysCats, marketCats, threats),
  };
}

function buildCategoryRows(sonnys: EntityCatalog, competitors: EntityCatalog[], cats: string[]): CategoryRow[] {
  return cats.map((cat) => {
    const sProd = sonnys.products.filter((p) => (p.category || "").toLowerCase() === cat);
    const cProd = competitors.flatMap((c) => c.products).filter((p) => (p.category || "").toLowerCase() === cat);
    const sAvg = avgPrice(sProd);
    const mAvg = avgPrice(cProd);
    let position: CategoryRow["position"] = "No data";
    if (sAvg != null && mAvg != null) {
      const d = (sAvg - mAvg) / mAvg;
      position = d > 0.05 ? "Premium" : d < -0.05 ? "Value" : "Parity";
    }
    return { category: titleCase(cat), sonnysAvg: sAvg, marketAvg: mAvg, position };
  });
}

function buildRecs(
  sAvg: number | null,
  marketAvg: number | null,
  sonnysCats: Set<string>,
  marketCats: Set<string>,
  threats: ThreatRow[],
): Recommendation[] {
  const recs: Recommendation[] = [];
  if (sAvg != null && marketAvg != null && sAvg < marketAvg * 0.97) {
    const gap = Math.round(((marketAvg - sAvg) / sAvg) * 1000) / 10;
    recs.push({
      id: uid(),
      module: "positioning",
      title: `Sonny's prices ${gap}% below market — pricing headroom`,
      rationale: `Average list pricing trails the competitor field. Selective increases capture margin without losing position.`,
      risk: "Low",
      priority: 60,
    });
  }
  const gaps = [...marketCats].filter((c) => !sonnysCats.has(c));
  if (gaps.length) {
    recs.push({
      id: uid(),
      module: "positioning",
      title: `Coverage gap: competitors sell ${gaps.length} categories Sonny's doesn't`,
      rationale: `White-space categories present in the market: ${gaps.slice(0, 4).map(titleCase).join(", ")}${gaps.length > 4 ? "…" : ""}.`,
      risk: "Medium",
      priority: 48,
    });
  }
  const high = threats.find((t) => t.threat === "High");
  if (high) {
    recs.push({
      id: uid(),
      module: "positioning",
      title: `Defend against ${high.competitor} — undercuts ${Math.abs(high.pricePosPct ?? 0)}% with breadth`,
      rationale: `Highest-threat competitor on price + range. Target competitive responses where you overlap.`,
      risk: "High",
      priority: 52,
    });
  }
  return recs;
}

const rank = (t: RiskLevel) => ({ Low: 0, Medium: 1, High: 2 })[t];
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
