// Tiny deterministic property-test harness (no new dependency). Seeded PRNG
// (mulberry32) → reproducible "random" cases, so property tests never flake.

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Run `prop` over `n` generated cases with a fixed seed. */
export function forAll<T>(n: number, gen: (r: () => number, i: number) => T, prop: (x: T, i: number) => void, seed = 0x5eed): void {
  const r = makeRng(seed);
  for (let i = 0; i < n; i++) prop(gen(r, i), i);
}

/** Fisher-Yates shuffle driven by the seeded rng (deterministic). */
export function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random money with exactly 2 decimal places (representable in cents). */
export function money2dp(r: () => number, max = 100000): number {
  return Math.round(r() * max * 100) / 100;
}
