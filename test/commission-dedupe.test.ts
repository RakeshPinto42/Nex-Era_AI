import { describe, it, expect } from "vitest";
import { findDuplicates, groupBy, transactionKey } from "@/lib/finance-os/commission/studio/engine";
import { makeTransaction } from "./_commission-fixtures";

describe("duplicate detection — deterministic", () => {
  it("groups by key", () => {
    const g = groupBy([{ k: "a" }, { k: "b" }, { k: "a" }], (x) => x.k);
    expect(g.get("a")!.length).toBe(2);
    expect(g.get("b")!.length).toBe(1);
  });
  it("returns only duplicated keys, sorted", () => {
    const items = [{ id: 1, k: "z" }, { id: 2, k: "a" }, { id: 3, k: "z" }, { id: 4, k: "a" }, { id: 5, k: "m" }];
    const dups = findDuplicates(items, (x) => x.k);
    expect(dups.map((d) => d.key)).toEqual(["a", "z"]); // sorted, only >1
    expect(dups.find((d) => d.key === "a")!.items.map((i) => i.id)).toEqual([2, 4]);
  });
  it("no duplicates → empty", () => {
    expect(findDuplicates([{ k: "a" }, { k: "b" }], (x) => x.k)).toEqual([]);
  });
  it("output order is independent of input order", () => {
    const a = findDuplicates([{ k: "z" }, { k: "z" }, { k: "a" }, { k: "a" }], (x) => x.k).map((d) => d.key);
    const b = findDuplicates([{ k: "a" }, { k: "z" }, { k: "a" }, { k: "z" }], (x) => x.k).map((d) => d.key);
    expect(a).toEqual(b);
  });
});

describe("transactionKey", () => {
  it("prefers external id", () => {
    expect(transactionKey({ externalId: "INV-9", date: "2026-06-01", amount: 100 })).toBe("ext:INV-9");
  });
  it("falls back to a natural composite key", () => {
    const k = transactionKey({ date: "2026-06-01", amount: 100, ownerPayeeId: "p1", accountId: "a1", productId: "x" });
    expect(k.startsWith("nat|")).toBe(true);
    expect(k).toContain("100.0000");
  });
  it("flags two transactions with the same external id as duplicates", () => {
    const txns = [makeTransaction(0), makeTransaction(1), { ...makeTransaction(2), externalId: "EXT-0" }];
    const dups = findDuplicates(txns, transactionKey);
    expect(dups.length).toBe(1);
    expect(dups[0].key).toBe("ext:EXT-0");
    expect(dups[0].items.map((t) => t.id).sort()).toEqual(["tx0", "tx2"]);
  });
});
