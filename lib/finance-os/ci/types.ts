// Commercial Intelligence — shared types. CI is the flagship Ledger module: a
// commercial-strategy command center. Every sub-module analysis must emit
// Recommendations (action + business impact + risk + expected margin gain) so the
// right-hand Recommendations panel can always answer "what should we do next?".

export type RiskLevel = "Low" | "Medium" | "High";

export type Recommendation = {
  id: string;
  module: string; // source sub-module slug
  title: string; // the action, e.g. "Increase Product A by 5%"
  rationale?: string;
  marginGain?: number; // expected gross-margin gain, $
  revenueImpact?: number; // expected revenue impact, $
  risk: RiskLevel;
  /** Higher = surfaced first. Defaults derived from marginGain when omitted. */
  priority?: number;
};

export type CiModuleSlug =
  | "research"
  | "positioning"
  | "sku-comparison"
  | "pricing-strategy"
  | "new-business"
  | "news-center"
  | "executive-action";

export type CiModuleDef = {
  slug: CiModuleSlug;
  name: string;
  desc: string;
  ready: boolean; // false = placeholder until its engine is built
};

// Tab order inside the command center. Executive Strategy Center sits last as the
// aggregator of every other module's recommendations.
// Sonny's (us) vs the competitor field. The Research tab builds the catalogs (live,
// cited); the engines compute over them. Pricing Strategy / New Business / News
// Center are on the roadmap (need cost/volume or a news monitor) — shown as
// Placeholder rather than fabricating numbers.
export const CI_MODULES: CiModuleDef[] = [
  { slug: "research", name: "Research", desc: "Build Sonny's + competitor catalogs from live, cited web sources. Feeds every engine.", ready: true },
  { slug: "positioning", name: "Positioning", desc: "Where Sonny's stands: price/premium position, coverage, competitive threat.", ready: true },
  { slug: "sku-comparison", name: "SKU Comparison", desc: "Each Sonny's SKU vs closest competitor — similarity, price gap, advantage, action.", ready: true },
  { slug: "pricing-strategy", name: "Pricing Strategy", desc: "Per-SKU: raise / hold / bundle / defend, with margin & win-rate impact.", ready: true },
  { slug: "new-business", name: "New Business", desc: "Cross-sell, service, chemical, reclaim, subscription & dealer/territory expansion.", ready: true },
  { slug: "news-center", name: "News Center", desc: "Monitor competitor launches, M&A, dealer & tech moves — threat/opportunity response.", ready: true },
  { slug: "executive-action", name: "Executive Action Center", desc: "Top-10 moves Sonny's should make next, with impact, risk & confidence.", ready: true },
];

// Geographic markets the research agent actually resolves against. Kept aligned
// with the research region vocabulary so the Scope rail "speaks" to the agent.
export const CI_REGIONS = ["United States", "Europe", "United States & Europe"] as const;
export type CiRegion = (typeof CI_REGIONS)[number];

/** Scope sentinel: no region filter (national view). Default scope. */
export const CI_REGION_ALL = "All Regions";

/** True when a row's region passes the current scope (ALL = everything). */
export const matchesRegion = (rowRegion: string, scope: string) =>
  scope === CI_REGION_ALL || rowRegion === scope;

/** Default sort: explicit priority, then expected margin gain, then risk. */
export function rankRecommendations(recs: Recommendation[]): Recommendation[] {
  const riskRank = { Low: 0, Medium: 1, High: 2 };
  return [...recs].sort((a, b) => {
    const pa = a.priority ?? a.marginGain ?? 0;
    const pb = b.priority ?? b.marginGain ?? 0;
    if (pb !== pa) return pb - pa;
    return riskRank[a.risk] - riskRank[b.risk];
  });
}
