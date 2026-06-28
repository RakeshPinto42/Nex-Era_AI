// Market Intelligence Tool — caching, rate-limit gating, freshness.
// In-process only (no external store). Keeps provider calls cheap and polite.

import "server-only";

type Entry = { value: unknown; t: number };

const store = new Map<string, Entry>();
const lastCall = new Map<string, number>();

/** Return cached value if younger than ttlMs, else null. */
export function getCached<T>(key: string, ttlMs: number): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() - e.t > ttlMs) return null;
  return e.value as T;
}

export function setCached<T>(key: string, value: T): void {
  store.set(key, { value, t: Date.now() });
}

/** Age of a cache entry in ms, or null if absent. */
export function cacheAge(key: string): number | null {
  const e = store.get(key);
  return e ? Date.now() - e.t : null;
}

/** Map a cache age to a freshness band. */
export function freshnessFor(ageMs: number | null): "fresh" | "delayed" | "stale" {
  if (ageMs == null) return "fresh";
  if (ageMs < 30_000) return "fresh";
  if (ageMs < 5 * 60_000) return "delayed";
  return "stale";
}

/** Block until at least minIntervalMs has elapsed since this provider's last call. */
export async function rateGate(provider: string, minIntervalMs: number): Promise<void> {
  const last = lastCall.get(provider) ?? 0;
  const wait = last + minIntervalMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall.set(provider, Date.now());
}
