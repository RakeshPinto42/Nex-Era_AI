// Deterministic content addressing. `hashOf` is order-independent over object
// keys, so the same logical input always produces the same digest — the basis
// for snapshot input-hashes, per-stage output digests, and replay verification.
// No clock, no randomness.

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

// FNV-1a 32-bit → 8-char hex. Stable across runs/machines.
export function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
}

export function hashOf(value: unknown): string {
  return fnv1a(stableStringify(value));
}

// Deep-freeze a snapshot so stages cannot mutate engine inputs (enforces purity
// at runtime in dev/test). Returns the same reference, frozen.
export function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}
