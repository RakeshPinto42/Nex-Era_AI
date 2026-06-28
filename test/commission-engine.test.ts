import { describe, it, expect } from "vitest";
import { EMPTY_COMMISSION_DATA, type Period } from "@/lib/finance-os/commission/studio/model";
import {
  CalcOrchestrator, ExecutionGraph, buildStubPipeline, PIPELINE_ORDER,
  InMemoryRunStore, money, hashOf, stableStringify,
  type Stage, type RunInput,
} from "@/lib/finance-os/commission/studio/engine";

const period: Period = {
  id: "2026-06", label: "Jun 2026", type: "month", fiscalYear: "FY26",
  start: "2026-06-01", end: "2026-06-30", status: "open",
  createdAt: "2026-06-01T00:00:00.000Z", createdBy: "test",
};
const input = (): RunInput => ({ period, planVersionIds: ["pv1"], data: structuredClone(EMPTY_COMMISSION_DATA) });
const engine = () => new CalcOrchestrator(new ExecutionGraph(buildStubPipeline()));

describe("money — deterministic, integer-cents", () => {
  it("rounds half-up, sign-aware", () => {
    expect(money.roundHalfUp(2.5)).toBe(3);
    expect(money.roundHalfUp(-2.5)).toBe(-3);
    expect(money.roundHalfUp(2.4)).toBe(2);
  });
  it("percent / multiply / cap / floor", () => {
    const c = money.toCents(10000); // $10,000 → 1,000,000 cents
    expect(money.toMoney(money.percent(c, 12.5))).toBe(1250);
    expect(money.toMoney(money.multiply(money.toCents(100), 1.5))).toBe(150);
    expect(money.cap(900, 500)).toBe(500);
    expect(money.floor(300, 500)).toBe(500);
    expect(money.toMoney(money.add(money.toCents(10.1), money.toCents(20.2)))).toBe(30.3); // no float drift
  });
});

describe("hash — order-independent + stable", () => {
  it("ignores key order", () => {
    expect(hashOf({ a: 1, b: 2 })).toBe(hashOf({ b: 2, a: 1 }));
    expect(stableStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });
});

describe("execution graph", () => {
  it("produces the approved topological order, deterministically", () => {
    const g = new ExecutionGraph(buildStubPipeline());
    expect(g.topoOrder()).toEqual(PIPELINE_ORDER);
    // insertion order must not matter
    const shuffled = new ExecutionGraph([...buildStubPipeline()].reverse());
    expect(shuffled.topoOrder()).toEqual(PIPELINE_ORDER);
  });
  it("rejects unknown deps and cycles", () => {
    expect(() => new ExecutionGraph([{ id: "a", dependsOn: ["nope"], run: (_c, i) => ({ output: i, trace: [], exceptions: [] }) }]).validate()).toThrow(/unknown/);
    const cyclic: Stage[] = [
      { id: "a", dependsOn: ["b"], run: (_c, i) => ({ output: i, trace: [], exceptions: [] }) },
      { id: "b", dependsOn: ["a"], run: (_c, i) => ({ output: i, trace: [], exceptions: [] }) },
    ];
    expect(() => new ExecutionGraph(cyclic).topoOrder()).toThrow(/Cycle/);
  });
});

describe("run lifecycle + determinism", () => {
  it("runs end-to-end to done with a deterministic id and metadata", () => {
    const r = engine().run(input());
    expect(r.run.status).toBe("done");
    expect(r.run.id).toBe(r.manifest.runId);
    expect(r.run.createdAt).toBe("2026-06-30T23:59:59.000Z"); // from period, NOT wall clock
    expect(r.manifest.stageOrder).toEqual(PIPELINE_ORDER);
    expect(Object.keys(r.manifest.stageDigests).length).toBe(PIPELINE_ORDER.length);
  });
  it("identical inputs ⇒ byte-identical manifest", () => {
    const a = engine().run(input());
    const b = engine().run(input());
    expect(b.manifest.inputHash).toBe(a.manifest.inputHash);
    expect(b.manifest.resultHash).toBe(a.manifest.resultHash);
    expect(b.manifest.stageDigests).toEqual(a.manifest.stageDigests);
    expect(b.run.id).toBe(a.run.id);
  });
  it("result is immutable (frozen)", () => {
    const r = engine().run(input());
    expect(Object.isFrozen(r.run)).toBe(true);
    expect(Object.isFrozen(r.working)).toBe(true);
    expect(Object.isFrozen(r.manifest)).toBe(true);
  });
});

describe("replay", () => {
  it("reproduces a prior run exactly", () => {
    const orch = engine();
    const first = orch.run(input());
    const replay = orch.replay(first.manifest, input());
    expect(replay.ok).toBe(true);
    expect(replay.resultMatch).toBe(true);
    expect(replay.mismatches).toEqual([]);
  });
  it("detects drift when inputs change", () => {
    const orch = engine();
    const first = orch.run(input());
    const mutated = input();
    mutated.planVersionIds = ["pv2"]; // different pinned version
    const replay = orch.replay(first.manifest, mutated);
    expect(replay.ok).toBe(false);
  });
});

describe("fault handling", () => {
  it("aborts on a fault and marks the run error", () => {
    const g = new ExecutionGraph([
      { id: "a", dependsOn: [], run: (_c, i) => ({ output: i, trace: [], exceptions: [] }) },
      { id: "b", dependsOn: ["a"], run: (_c, i) => ({ output: i, trace: [], exceptions: [{ code: "BOOM", severity: "fault", stage: "b", message: "boom" }] }) },
      { id: "c", dependsOn: ["b"], run: (_c, i) => ({ output: i, trace: [], exceptions: [] }) },
    ]);
    const r = new CalcOrchestrator(g).run(input());
    expect(r.run.status).toBe("error");
    expect(r.run.error).toBe("boom");
    expect(r.manifest.stageDigests["c"]).toBeUndefined(); // aborted before c
  });
});

describe("append-only run store", () => {
  it("stores and retrieves runs by period", () => {
    const store = new InMemoryRunStore();
    const r = engine().run(input());
    store.append(r);
    expect(store.get(r.run.id)?.run.id).toBe(r.run.id);
    expect(store.latest(period.id)?.run.id).toBe(r.run.id);
    expect(store.listByPeriod(period.id).length).toBe(1);
  });
});
