import { describe, it, expect } from "vitest";
import { money, toCents, toMoney } from "@/lib/finance-os/commission/studio/engine/money";
import { hashOf } from "@/lib/finance-os/commission/studio/engine/hash";
import { findDuplicates, transactionKey } from "@/lib/finance-os/commission/studio/engine/dedupe";
import { CalcOrchestrator, ExecutionGraph, buildStubPipeline } from "@/lib/finance-os/commission/studio/engine";
import { EMPTY_COMMISSION_DATA, type CommissionData, type Transaction } from "@/lib/finance-os/commission/studio/model";
import { forAll, makeRng, money2dp, shuffle } from "./_prop";
import { PERIOD, makeTransaction } from "./_commission-fixtures";

const engine = () => new CalcOrchestrator(new ExecutionGraph(buildStubPipeline()));
const dataOf = (txns: Transaction[]): CommissionData => ({ ...structuredClone(EMPTY_COMMISSION_DATA), transactions: txns });

/* ----------------------------------------------------- money invariants */
describe("property: money arithmetic invariants", () => {
  it("toMoney(toCents(m)) === m for 2dp money", () => {
    forAll(500, (r) => money2dp(r), (m) => expect(toMoney(toCents(m))).toBe(m));
  });
  it("percent(c,100)===c and percent(c,0)===0; multiply(c,1)===c", () => {
    forAll(500, (r) => toCents(money2dp(r)), (c) => {
      expect(money.percent(c, 100)).toBe(c);
      expect(money.percent(c, 0)).toBe(0);
      expect(money.multiply(c, 1)).toBe(c);
    });
  });
  it("cap ≤ cap, floor ≥ min", () => {
    forAll(500, (r) => [toCents(money2dp(r)), toCents(money2dp(r))] as [number, number], ([c, lim]) => {
      expect(money.cap(c, lim)).toBeLessThanOrEqual(lim);
      expect(money.floor(c, lim)).toBeGreaterThanOrEqual(lim);
    });
  });
  it("percent is monotonic in pct (positive amount) — no float inversions", () => {
    forAll(300, (r) => toCents(money2dp(r, 100000) + 1), (c) => {
      expect(money.percent(c, 5)).toBeLessThanOrEqual(money.percent(c, 10));
      expect(money.percent(c, 10)).toBeLessThanOrEqual(money.percent(c, 25));
    });
  });
  it("summation has no float drift (cents = manual integer sum)", () => {
    forAll(200, (r) => Array.from({ length: 50 }, () => toCents(money2dp(r, 5000))), (cs) => {
      const viaApi = cs.reduce((a, b) => money.add(a, b), 0);
      const manual = cs.reduce((a, b) => a + b, 0);
      expect(viaApi).toBe(manual);
      expect(Number.isInteger(viaApi)).toBe(true);
    });
  });
});

/* ----------------------------------------------------- hash invariants */
describe("property: hashing invariants", () => {
  it("hash is independent of object key order", () => {
    forAll(300, (r) => {
      const keys = Array.from({ length: 1 + Math.floor(r() * 6) }, (_, i) => `k${i}`);
      const obj: Record<string, number> = {};
      for (const k of keys) obj[k] = Math.floor(r() * 1000);
      return obj;
    }, (obj) => {
      const keys = Object.keys(obj);
      const r2 = makeRng(99);
      const reordered: Record<string, number> = {};
      for (const k of shuffle(keys, r2)) reordered[k] = obj[k];
      expect(hashOf(reordered)).toBe(hashOf(obj));
    });
  });
  it("distinct inputs are almost always distinct hashes (≥99%)", () => {
    const set = new Set<string>();
    const N = 2000;
    forAll(N, (_r, i) => i, (i) => set.add(hashOf({ n: i, s: `row-${i}` })));
    expect(set.size / N).toBeGreaterThanOrEqual(0.99);
  });
});

/* ----------------------------------------------------- dedupe invariants */
describe("property: duplicate detection invariants", () => {
  it("output is independent of input order", () => {
    forAll(200, (r) => {
      const n = 5 + Math.floor(r() * 30);
      return Array.from({ length: n }, () => ({ k: `k${Math.floor(r() * 6)}` })); // few keys → many dups
    }, (items) => {
      const r2 = makeRng(7);
      const a = findDuplicates(items, (x) => x.k).map((d) => d.key);
      const b = findDuplicates(shuffle(items, r2), (x) => x.k).map((d) => d.key);
      expect(b).toEqual(a);
    });
  });
  it("every returned group has ≥2 items; non-duplicates excluded", () => {
    forAll(200, (r) => Array.from({ length: 20 }, () => ({ k: `k${Math.floor(r() * 8)}` })), (items) => {
      const dups = findDuplicates(items, (x) => x.k);
      for (const g of dups) expect(g.items.length).toBeGreaterThanOrEqual(2);
      const dupKeys = new Set(dups.map((d) => d.key));
      const counts = new Map<string, number>();
      for (const it of items) counts.set(it.k, (counts.get(it.k) ?? 0) + 1);
      for (const [k, c] of counts) expect(dupKeys.has(k)).toBe(c > 1);
    });
  });
});

/* ----------------------------------------------------- engine invariants */
describe("property: engine determinism + order-independence", () => {
  it("same dataset ⇒ identical run (twice)", () => {
    forAll(50, (r) => 1 + Math.floor(r() * 40), (count) => {
      const txns = Array.from({ length: count }, (_, i) => makeTransaction(i));
      const a = engine().run({ period: PERIOD, planVersionIds: ["pv1"], data: dataOf(txns) });
      const b = engine().run({ period: PERIOD, planVersionIds: ["pv1"], data: dataOf(txns) });
      expect(b.manifest.inputHash).toBe(a.manifest.inputHash);
      expect(b.run.id).toBe(a.run.id);
      expect(b.manifest.resultHash).toBe(a.manifest.resultHash);
    });
  });
  it("DIFFERENT INPUT ORDER ⇒ identical output (canonicalization)", () => {
    forAll(50, (r) => ({ count: 5 + Math.floor(r() * 30), seed: Math.floor(r() * 1e6) }), ({ count, seed }) => {
      const txns = Array.from({ length: count }, (_, i) => makeTransaction(i));
      const a = engine().run({ period: PERIOD, planVersionIds: ["pv1"], data: dataOf(txns) });
      const b = engine().run({ period: PERIOD, planVersionIds: ["pv1"], data: dataOf(shuffle(txns, makeRng(seed))) });
      expect(b.manifest.inputHash).toBe(a.manifest.inputHash);
      expect(b.run.id).toBe(a.run.id);
    });
  });
});

describe("engine: empty + large datasets", () => {
  it("empty input runs deterministically to done", () => {
    const a = engine().run({ period: PERIOD, planVersionIds: [], data: structuredClone(EMPTY_COMMISSION_DATA) });
    const b = engine().run({ period: PERIOD, planVersionIds: [], data: structuredClone(EMPTY_COMMISSION_DATA) });
    expect(a.run.status).toBe("done");
    expect(a.manifest.inputHash).toBe(b.manifest.inputHash);
  });
  it("handles a large dataset (5,000 transactions) deterministically", () => {
    const txns = Array.from({ length: 5000 }, (_, i) => makeTransaction(i));
    const a = engine().run({ period: PERIOD, planVersionIds: ["pv1"], data: dataOf(txns) });
    const b = engine().run({ period: PERIOD, planVersionIds: ["pv1"], data: dataOf(shuffle(txns, makeRng(123))) });
    expect(a.run.status).toBe("done");
    expect(b.manifest.inputHash).toBe(a.manifest.inputHash); // order-independent at scale
    expect(findDuplicates(txns, transactionKey).length).toBe(0); // distinct externalIds
  });
});
