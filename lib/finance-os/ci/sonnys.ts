// Sonny's = OUR company (home). Commercial Intelligence compares Sonny's against a
// fixed set of primary competitors. Catalogs (Sonny's + each competitor) are filled
// by the research agent and read from the local tracking store; engines compute over
// them. No fabricated data — only what the agent sourced from the web.

import type { CompetitorProduct } from "./agent/types";

export const HOME = "Sonny's";
// Query the agent uses for our own public catalog.
export const HOME_RESEARCH_QUERY = "Sonny's CarWash Factory";

// Industry anchor. Passed as the research "focus" so the agent (and especially the
// no-search estimate fallback) resolves the RIGHT entity — "Sonny's" is otherwise
// ambiguous (grocery / BBQ brands) and the model would catalog the wrong company.
export const INDUSTRY = "car wash equipment and systems (tunnels, conveyors, dryers, chemicals)";

export const COMPETITORS = [
  "WashTec",
  "Istobal",
  "PDQ",
  "MacNeil",
  "Belanger",
  "Tommy Car Wash Systems",
  "Coleman Hanna",
  "D&S",
  "PECO",
  "Mark VII",
  "Motor City Wash Works",
] as const;

export type EntityCatalog = { name: string; products: CompetitorProduct[]; isHome?: boolean };

export const priced = (ps: CompetitorProduct[]) => ps.filter((p) => p.price != null) as (CompetitorProduct & { price: number })[];
export const avgPrice = (ps: CompetitorProduct[]) => {
  const pp = priced(ps);
  return pp.length ? pp.reduce((s, p) => s + p.price, 0) / pp.length : null;
};
export const categories = (ps: CompetitorProduct[]) => new Set(ps.map((p) => (p.category || "").trim().toLowerCase()).filter(Boolean));

// Lightweight product similarity (category + feature Jaccard + name token overlap).
export function similarity(a: CompetitorProduct, b: CompetitorProduct): number {
  const sameCat = (a.category || "").trim().toLowerCase() === (b.category || "").trim().toLowerCase();
  const fa = new Set(a.features.map((f) => f.toLowerCase()));
  const fb = new Set(b.features.map((f) => f.toLowerCase()));
  let inter = 0;
  for (const f of fa) if (fb.has(f)) inter++;
  const feat = fa.size || fb.size ? inter / (fa.size + fb.size - inter || 1) : 0;
  const ta = new Set(tokens(a.product));
  const tb = new Set(tokens(b.product));
  let tinter = 0;
  for (const t of ta) if (tb.has(t)) tinter++;
  const name = ta.size || tb.size ? tinter / (ta.size + tb.size - tinter || 1) : 0;
  return Math.round(100 * ((sameCat ? 0.4 : 0) + 0.4 * feat + 0.2 * name));
}

const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 2);
