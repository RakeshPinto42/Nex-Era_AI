import { describe, it, expect } from "vitest";
import { fnv1a, hashOf, stableStringify, deepFreeze } from "@/lib/finance-os/commission/studio/engine/hash";
import { CalcOrchestrator, ExecutionGraph, buildStubPipeline } from "@/lib/finance-os/commission/studio/engine";
import { PERIOD, makeData } from "./_commission-fixtures";

describe("content hashing — stable algorithm (golden values lock it)", () => {
  it("FNV-1a golden values", () => {
    expect(fnv1a("")).toBe("811c9dc5");
    expect(fnv1a("abc")).toBe("1a47e90b");
    expect(hashOf({ a: 1, b: [2, 3], c: { d: "x" } })).toBe("f92680bf");
  });
  it("produces 8-char lowercase hex", () => {
    expect(hashOf({ any: "thing", n: 42 })).toMatch(/^[0-9a-f]{8}$/);
  });
  it("is stable across repeated calls", () => {
    const v = { x: [1, 2, { y: "z" }], n: 3.14 };
    expect(hashOf(v)).toBe(hashOf(v));
  });
});

describe("hash stability — order independent", () => {
  it("ignores object key order (nested)", () => {
    expect(hashOf({ a: 1, b: { c: 2, d: 3 } })).toBe(hashOf({ b: { d: 3, c: 2 }, a: 1 }));
  });
  it("respects array order (arrays are ordered)", () => {
    expect(hashOf([1, 2, 3])).not.toBe(hashOf([3, 2, 1]));
  });
  it("stableStringify sorts keys deterministically", () => {
    expect(stableStringify({ b: 2, a: 1, c: [3, { y: 2, x: 1 }] })).toBe('{"a":1,"b":2,"c":[3,{"x":1,"y":2}]}');
  });
  it("handles null/undefined/empty", () => {
    expect(hashOf(null)).toBe(hashOf(null));
    expect(hashOf({})).toBe(hashOf({}));
    expect(hashOf([])).not.toBe(hashOf({}));
  });
});

describe("single-change sensitivity", () => {
  it("changing one object field changes the hash", () => {
    const base = { a: 1, b: 2, c: 3 };
    expect(hashOf({ ...base, b: 999 })).not.toBe(hashOf(base));
  });
  it("changing ONE transaction changes the snapshot input hash + runId", () => {
    const orch = new CalcOrchestrator(new ExecutionGraph(buildStubPipeline()));
    const dataA = makeData(8);
    const runA = orch.run({ period: PERIOD, planVersionIds: ["pv1"], data: dataA });

    const dataB = makeData(8);
    dataB.transactions[3] = { ...dataB.transactions[3], amount: dataB.transactions[3].amount + 0.01 };
    const runB = orch.run({ period: PERIOD, planVersionIds: ["pv1"], data: dataB });

    expect(runB.manifest.inputHash).not.toBe(runA.manifest.inputHash);
    expect(runB.run.id).not.toBe(runA.run.id);
  });
  it("identical transaction sets produce identical input hash", () => {
    const orch = new CalcOrchestrator(new ExecutionGraph(buildStubPipeline()));
    const a = orch.run({ period: PERIOD, planVersionIds: ["pv1"], data: makeData(8) });
    const b = orch.run({ period: PERIOD, planVersionIds: ["pv1"], data: makeData(8) });
    expect(b.manifest.inputHash).toBe(a.manifest.inputHash);
  });
});

describe("deepFreeze", () => {
  it("freezes nested structures", () => {
    const o = deepFreeze({ a: { b: { c: 1 } }, arr: [{ x: 1 }] });
    expect(Object.isFrozen(o)).toBe(true);
    expect(Object.isFrozen(o.a.b)).toBe(true);
    expect(Object.isFrozen(o.arr[0])).toBe(true);
    expect(() => { "use strict"; (o.a.b as { c: number }).c = 2; }).toThrow();
  });
});
