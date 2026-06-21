import { describe, expect, it } from "vitest";
import { applySchedule, buildRepFacts, computeCommission, metricFor } from "@/lib/finance-os/commission/engine";
import type { CommissionPlan, RepFacts, SlabSchedule } from "@/lib/finance-os/commission/types";

const facts = (over: Partial<RepFacts>): RepFacts => ({
  rep: "Ana",
  revenue: 0,
  cost: 0,
  units: 0,
  collections: 0,
  quota: null,
  ...over,
});

const plan = (over: Partial<CommissionPlan>): CommissionPlan => ({
  id: "p",
  name: "P",
  basis: "revenue",
  components: [],
  modifiers: [],
  effectiveFrom: null,
  version: 1,
  updatedAt: 0,
  ...over,
});

const sched = (type: SlabSchedule["type"], slabs: SlabSchedule["slabs"]): SlabSchedule => ({ type, slabs });

describe("applySchedule", () => {
  it("tiered = marginal bands", () => {
    const s = sched("tiered", [
      { upTo: 100, rate: 10 },
      { upTo: null, rate: 20 },
    ]);
    expect(applySchedule(150, s)).toBe(20); // 100*10% + 50*20%
  });

  it("progressive = whole-amount at the landed band", () => {
    const s = sched("progressive", [
      { upTo: 100, rate: 10 },
      { upTo: null, rate: 20 },
    ]);
    expect(applySchedule(150, s)).toBe(30); // 150 * 20%
    expect(applySchedule(80, s)).toBe(8); // 80 * 10%
  });

  it("returns 0 for non-positive metric", () => {
    expect(applySchedule(0, sched("tiered", [{ upTo: null, rate: 10 }]))).toBe(0);
    expect(applySchedule(-5, sched("tiered", [{ upTo: null, rate: 10 }]))).toBe(0);
  });
});

describe("metricFor", () => {
  it("gross margin = revenue - cost", () => {
    expect(metricFor("grossMargin", facts({ revenue: 100, cost: 30 }))).toBe(70);
  });
  it("units / collections", () => {
    expect(metricFor("units", facts({ units: 12 }))).toBe(12);
    expect(metricFor("collections", facts({ collections: 500 }))).toBe(500);
  });
});

describe("computeCommission", () => {
  const flat = sched("tiered", [{ upTo: null, rate: 10 }]);

  it("computes base commission on revenue", () => {
    const res = computeCommission(
      [facts({ rep: "Ana", revenue: 1000 })],
      plan({ components: [{ id: "c", label: "", basis: "revenue", weight: 1, schedule: flat }] }),
    );
    expect(res.statements[0].baseCommission).toBe(100);
    expect(res.totals.totalCommission).toBe(100);
  });

  it("hybrid = weighted sum of components", () => {
    const res = computeCommission(
      [facts({ rep: "Ana", revenue: 1000, cost: 400 })],
      plan({
        basis: "hybrid",
        components: [
          { id: "a", label: "rev", basis: "revenue", weight: 0.5, schedule: flat },
          { id: "b", label: "gm", basis: "grossMargin", weight: 0.5, schedule: flat },
        ],
      }),
    );
    expect(res.statements[0].baseCommission).toBe(80); // 50 + 30
  });

  it("accelerator pays extra above attainment threshold", () => {
    const res = computeCommission(
      [facts({ rep: "Ana", revenue: 1500, quota: 1000 })],
      plan({
        components: [{ id: "c", label: "", basis: "revenue", weight: 1, schedule: flat }],
        modifiers: [{ kind: "accelerator", id: "m", label: "Acc", aboveAttainmentPct: 100, rate: 5 }],
      }),
    );
    const acc = res.statements[0].modifiers.find((m) => m.kind === "accelerator");
    expect(acc?.amount).toBe(25); // 500 over quota * 5%
    expect(res.statements[0].totalCommission).toBe(175);
  });

  it("bonus, clawback, manual adjustment apply by attainment / rep", () => {
    const res = computeCommission(
      [facts({ rep: "Ana", revenue: 500, quota: 1000 })], // 50% attainment
      plan({
        components: [{ id: "c", label: "", basis: "revenue", weight: 1, schedule: flat }],
        modifiers: [
          { kind: "bonus", id: "b", label: "Bonus", minAttainmentPct: 100, amount: 1000 },
          { kind: "clawback", id: "cl", label: "Clawback", belowAttainmentPct: 60, rate: 50 },
          { kind: "manualAdjustment", id: "mj", label: "Adj", rep: "Ana", amount: 10 },
        ],
      }),
    );
    const kinds = res.statements[0].modifiers.map((m) => m.kind);
    expect(kinds).not.toContain("bonus");
    expect(kinds).toContain("clawback");
    expect(kinds).toContain("manualAdjustment");
    expect(res.statements[0].totalCommission).toBe(35); // 50 - 25 + 10
  });
});

describe("buildRepFacts", () => {
  it("aggregates sales per rep and joins quota", () => {
    const sales = {
      columns: ["Rep", "Revenue", "Cost"],
      rows: [
        ["Ana", "600", "200"],
        ["Ana", "400", "100"],
        ["Bo", "300", "50"],
      ],
    };
    const targets = { columns: ["Rep", "Quota"], rows: [["Ana", "1000"]] };
    const out = buildRepFacts(
      sales,
      { sales: { rep: 0, revenue: 1, cost: 2 }, targets: { rep: 0, quota: 1 } },
      targets,
    );
    const ana = out.find((f) => f.rep === "Ana")!;
    expect(ana.revenue).toBe(1000);
    expect(ana.cost).toBe(300);
    expect(ana.quota).toBe(1000);
    expect(out.find((f) => f.rep === "Bo")!.quota).toBeNull();
  });
});
