// Local, private tracking store for competitor research. Snapshots live in the
// browser (localStorage) only — they never go to a server. Each refresh appends a
// snapshot so we can diff the latest run against the previous one.

import type { CompetitorProduct, CompetitorRecord, ProductChange, Snapshot } from "./types";

const KEY = "ci.competitor-tracking.v1";

type Store = Record<string, CompetitorRecord>; // keyed by lowercased competitor name

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Store;
  } catch {
    return {};
  }
}

function write(s: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function listRecords(): CompetitorRecord[] {
  return Object.values(read()).sort((a, b) => a.competitor.localeCompare(b.competitor));
}

export function getRecord(competitor: string): CompetitorRecord | null {
  return read()[competitor.toLowerCase()] ?? null;
}

export function saveSnapshot(competitor: string, snapshot: Snapshot): CompetitorRecord {
  const s = read();
  const key = competitor.toLowerCase();
  const rec = s[key] ?? { competitor, snapshots: [] };
  rec.competitor = competitor; // keep latest casing
  rec.snapshots = [snapshot, ...rec.snapshots].slice(0, 24); // cap history
  s[key] = rec;
  write(s);
  return rec;
}

export function deleteRecord(competitor: string) {
  const s = read();
  delete s[competitor.toLowerCase()];
  write(s);
}

const productKey = (p: CompetitorProduct) => (p.sku?.trim() || p.product.trim()).toLowerCase();

/** Diff the most recent snapshot against the one before it. */
export function diffLatest(rec: CompetitorRecord): ProductChange[] {
  const [latest, prev] = rec.snapshots;
  if (!latest) return [];
  const prevMap = new Map<string, CompetitorProduct>();
  if (prev) for (const p of prev.products) prevMap.set(productKey(p), p);

  const changes: ProductChange[] = latest.products.map((p) => {
    const before = prevMap.get(productKey(p));
    prevMap.delete(productKey(p));
    if (!prev || !before) return mk(p, prev ? "new" : "unchanged");
    if (p.price != null && before.price != null && p.price !== before.price) {
      const deltaPct = before.price ? ((p.price - before.price) / before.price) * 100 : null;
      return { key: productKey(p), product: p.product, kind: p.price > before.price ? "price-up" : "price-down", prevPrice: before.price, price: p.price, deltaPct: deltaPct == null ? null : Math.round(deltaPct * 10) / 10 };
    }
    return mk(p, "unchanged");
  });

  // Anything left in prevMap was removed this run.
  for (const before of prevMap.values()) {
    changes.push({ key: productKey(before), product: before.product, kind: "removed", prevPrice: before.price, price: null, deltaPct: null });
  }
  return changes;
}

const mk = (p: CompetitorProduct, kind: ProductChange["kind"]): ProductChange => ({
  key: (p.sku?.trim() || p.product.trim()).toLowerCase(),
  product: p.product,
  kind,
  prevPrice: null,
  price: p.price,
  deltaPct: null,
});
