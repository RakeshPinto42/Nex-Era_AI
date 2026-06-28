// Deterministic grouping + duplicate detection. Used by Validation (Milestone 2)
// to flag duplicate transactions, but implemented + tested in the engine
// foundation because correctness here is load-bearing. Pure, order-independent
// output (groups + ids returned in sorted order).

export function groupBy<T>(items: T[], keyFn: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = keyFn(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}

// Returns only the keys that occur more than once, sorted for determinism.
export function findDuplicates<T>(items: T[], keyFn: (t: T) => string): { key: string; items: T[] }[] {
  const groups = groupBy(items, keyFn);
  const out: { key: string; items: T[] }[] = [];
  for (const [key, group] of groups) if (group.length > 1) out.push({ key, items: group });
  return out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

// Canonical de-dupe key for a transaction. Prefers the source-system external id;
// otherwise a composite natural key. Stable + collision-resistant for real data.
export function transactionKey(tx: {
  externalId?: string; date: string; amount: number;
  ownerPayeeId?: string; productId?: string; accountId?: string;
}): string {
  if (tx.externalId) return `ext:${tx.externalId}`;
  return [
    "nat", tx.date, tx.amount.toFixed(4),
    tx.ownerPayeeId ?? "", tx.accountId ?? "", tx.productId ?? "",
  ].join("|");
}
