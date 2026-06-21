// Competitor Intelligence Agent — types. The agent researches a competitor's
// products + pricing from live web search and the result is tracked over time
// (snapshots) so price/SKU changes are visible. No fabricated numbers: a price the
// sources don't state stays null.

export type CompetitorProduct = {
  product: string;
  sku: string | null;
  category: string | null;
  price: number | null;
  currency: string | null;
  features: string[];
  sourceUrl: string | null;
  note: string | null;
};

export type SearchSource = { title: string; url: string };

export type ResearchResult = {
  competitor: string;
  products: CompetitorProduct[];
  sources: SearchSource[];
  model: string;
  researchedAt: string; // ISO timestamp
};

export type Snapshot = {
  researchedAt: string;
  model: string;
  products: CompetitorProduct[];
  sources: SearchSource[];
};

export type CompetitorRecord = { competitor: string; snapshots: Snapshot[] };

export type ChangeKind = "new" | "removed" | "price-up" | "price-down" | "unchanged";
export type ProductChange = {
  key: string;
  product: string;
  kind: ChangeKind;
  prevPrice: number | null;
  price: number | null;
  deltaPct: number | null;
};
