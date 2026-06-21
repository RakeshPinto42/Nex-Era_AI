import { describe, it, expect } from "vitest";
import { parseCsv, toNum } from "@/lib/finance/csv";
import { computeVariance } from "@/lib/finance/variance";
import {
  commissionFor,
  computeCommission,
  DEFAULT_TIERS,
} from "@/lib/finance/commission";

describe("csv.toNum", () => {
  it("parses money, percents, parens-negatives", () => {
    expect(toNum("$1,200")).toBe(1200);
    expect(toNum("(500)")).toBe(-500);
    expect(toNum("5%")).toBe(5);
    expect(toNum("")).toBeNaN();
    expect(toNum("abc")).toBeNaN();
  });
});

describe("variance", () => {
  const table = parseCsv(
    "Item,Actual,Budget\nRevenue,1200,1000\nCOGS,400,350",
  );

  it("computes per-line + totals (revenue kind)", () => {
    const r = computeVariance(table, { label: 0, actual: 1, budget: 2, kind: "revenue" });
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].variance).toBe(200);
    expect(r.rows[0].pct).toBeCloseTo(20);
    expect(r.rows[0].favorable).toBe(true); // revenue up = good
    expect(r.totals.actual).toBe(1600);
    expect(r.totals.budget).toBe(1350);
    expect(r.totals.variance).toBe(250);
  });

  it("flips favorability for cost kind", () => {
    const r = computeVariance(table, { label: 0, actual: 1, budget: 2, kind: "cost" });
    // COGS actual(400) > budget(350) → unfavorable for a cost
    expect(r.rows[1].favorable).toBe(false);
  });
});

describe("commission", () => {
  it("applies marginal tiers correctly", () => {
    // 100k@5% + 150k@7% + 50k@10% = 5000 + 10500 + 5000 = 20500
    expect(commissionFor(300000, { tiers: DEFAULT_TIERS })).toBe(20500);
    // under first tier: 80k@5% = 4000
    expect(commissionFor(80000, { tiers: DEFAULT_TIERS })).toBe(4000);
    expect(commissionFor(0, { tiers: DEFAULT_TIERS })).toBe(0);
  });

  it("applies a quota accelerator above quota", () => {
    // quota 200k → tiered to 200k = 100k@5% + 100k@7% = 5000+7000 = 12000
    // over 100k @ 12% = 12000 → total 24000
    const c = commissionFor(300000, {
      tiers: DEFAULT_TIERS,
      quota: 200000,
      acceleratorRate: 12,
    });
    expect(c).toBe(24000);
  });

  it("aggregates revenue per rep and totals", () => {
    const table = parseCsv("Rep,Rev\nA,100000\nB,200000\nA,50000");
    const r = computeCommission(table, { rep: 0, revenue: 1 }, { tiers: DEFAULT_TIERS });
    expect(r.rows).toHaveLength(2);
    const a = r.rows.find((x) => x.rep === "A")!;
    expect(a.revenue).toBe(150000); // 100k + 50k aggregated
    expect(r.totals.revenue).toBe(350000);
  });
});
