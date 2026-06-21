// New Business Opportunity Engine. Surfaces revenue opportunities for Sonny's:
// white-space categories competitors sell that Sonny's doesn't (evidence-based from
// catalogs) + standard car-wash adjacency attaches (service / chemical / reclaim /
// subscription) + dealer & territory expansion. No fabricated $ — opportunities are
// evidence- or framework-based; sizing needs Sonny's internal data.

import { type EntityCatalog, categories } from "../sonnys";

export type OppType =
  | "White-Space"
  | "Service Revenue"
  | "Chemical Revenue"
  | "Water Reclaim"
  | "Subscription"
  | "Cross-Sell / Upsell"
  | "Dealer Expansion"
  | "Territory Expansion";

export type NewBizOpp = {
  type: OppType;
  title: string;
  evidence: string;
  basis: "catalog" | "adjacency" | "strategic";
  priority: "High" | "Medium" | "Low";
};

// Standard high-margin attaches around a car-wash equipment base.
const ADJACENCIES: { type: OppType; match: RegExp; title: string; note: string }[] = [
  { type: "Service Revenue", match: /service|maintenance|support|contract/i, title: "Service contracts on the installed base", note: "Recurring, high-margin attach to every equipment sale." },
  { type: "Chemical Revenue", match: /chemical|detergent|soap|wax|solution/i, title: "Chemical & consumables subscription", note: "Repeat consumable revenue tied to wash volume." },
  { type: "Water Reclaim", match: /reclaim|water|recycl|filtration/i, title: "Water reclaim / recycling upsell", note: "Sustainability + utility savings; strong tunnel attach." },
  { type: "Subscription", match: /subscription|membership|unlimited|saas|software/i, title: "Subscription / membership platform", note: "Software + unlimited-wash programs lift per-site revenue." },
];

export function buildNewBusiness(sonnys: EntityCatalog, competitors: EntityCatalog[]): NewBizOpp[] {
  const opps: NewBizOpp[] = [];
  const sonnysCats = categories(sonnys.products);

  // 1) White-space: categories competitors sell that Sonny's doesn't (from catalogs).
  const marketCatOwners = new Map<string, Set<string>>();
  for (const c of competitors) for (const p of c.products) {
    const cat = (p.category || "").trim().toLowerCase();
    if (!cat) continue;
    if (!marketCatOwners.has(cat)) marketCatOwners.set(cat, new Set());
    marketCatOwners.get(cat)!.add(c.name);
  }
  for (const [cat, owners] of marketCatOwners) {
    if (sonnysCats.has(cat)) continue;
    opps.push({
      type: "White-Space",
      title: `Enter ${titleCase(cat)} — competitors sell it, Sonny's doesn't`,
      evidence: `Offered by ${[...owners].slice(0, 4).join(", ")}${owners.size > 4 ? "…" : ""}.`,
      basis: "catalog",
      priority: owners.size >= 3 ? "High" : "Medium",
    });
  }

  // 2) Adjacency attaches — higher priority where Sonny's doesn't already cover it.
  for (const a of ADJACENCIES) {
    const owned = [...sonnysCats].some((c) => a.match.test(c)) || sonnys.products.some((p) => a.match.test(p.product));
    opps.push({
      type: a.type,
      title: a.title,
      evidence: owned ? `Sonny's already participates — expand attach rate. ${a.note}` : `Not in Sonny's catalog yet. ${a.note}`,
      basis: "adjacency",
      priority: owned ? "Medium" : "High",
    });
  }

  // 3) Strategic expansion (framework — needs Sonny's internal coverage data to size).
  opps.push(
    { type: "Cross-Sell / Upsell", title: "Cross-sell across the equipment install base", evidence: "Attach service, chemicals & reclaim to existing tunnel/dryer accounts.", basis: "strategic", priority: "High" },
    { type: "Dealer Expansion", title: "Recruit dealers where competitors are strong", evidence: "Target regions/segments where rival breadth out-covers Sonny's.", basis: "strategic", priority: "Medium" },
    { type: "Territory Expansion", title: "Expand sales coverage into under-served territories", evidence: "Prioritize by competitor concentration; sizing needs internal pipeline.", basis: "strategic", priority: "Medium" },
  );

  const order = { High: 0, Medium: 1, Low: 2 };
  return opps.sort((a, b) => order[a.priority] - order[b.priority]);
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
