import { describe, it, expect } from "vitest";
import { CalcOrchestrator, ExecutionGraph, buildStubPipeline, stableStringify } from "@/lib/finance-os/commission/studio/engine";
import { PERIOD, makeData } from "./_commission-fixtures";

const engine = () => new CalcOrchestrator(new ExecutionGraph(buildStubPipeline()));
const run = () => engine().run({ period: PERIOD, planVersionIds: ["pv1", "pv0"], data: makeData(12) });

describe("same input ⇒ identical output", () => {
  it("N repeated runs are byte-identical", () => {
    const first = run();
    for (let i = 0; i < 5; i++) {
      const r = run();
      expect(r.manifest.inputHash).toBe(first.manifest.inputHash);
      expect(r.manifest.resultHash).toBe(first.manifest.resultHash);
      expect(r.manifest.stageDigests).toEqual(first.manifest.stageDigests);
      expect(r.run.id).toBe(first.run.id);
    }
  });
  it("pinned versions are sorted deterministically (order of input ignored)", () => {
    const a = engine().run({ period: PERIOD, planVersionIds: ["pv1", "pv0"], data: makeData(4) });
    const b = engine().run({ period: PERIOD, planVersionIds: ["pv0", "pv1"], data: makeData(4) });
    expect(b.run.id).toBe(a.run.id);
    expect(b.manifest.planVersionIds).toEqual(["pv0", "pv1"]);
  });
});

describe("replay reproduces byte-identical payout structures", () => {
  it("replay matches every stage digest + result hash", () => {
    const orch = engine();
    const first = orch.run({ period: PERIOD, planVersionIds: ["pv1"], data: makeData(12) });
    const replay = orch.replay(first.manifest, { period: PERIOD, planVersionIds: ["pv1"], data: makeData(12) });
    expect(replay.ok).toBe(true);
    expect(replay.resultMatch).toBe(true);
    expect(replay.mismatches).toEqual([]);
  });
  it("the WorkingSet (payout container) serializes byte-identically", () => {
    const a = run();
    const b = run();
    expect(stableStringify(a.working)).toBe(stableStringify(b.working));
  });
});
