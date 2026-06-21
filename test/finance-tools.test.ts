import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/finance/csv";
import { computeForecast } from "@/lib/finance/forecast";
import { computeMargin } from "@/lib/finance/margin";

describe("forecast", () => {
  const table = parseCsv("Period,Value\nP1,100\nP2,110\nP3,120\nP4,130");

  it("projects a linear trend forward", () => {
    const r = computeForecast(table, { period: 0, value: 1 }, { periods: 2, method: "trend" });
    expect(r.history).toHaveLength(4);
    const proj = r.points.filter((p) => p.projected);
    expect(proj).toHaveLength(2);
    // perfect +10/step trend → next points 140, 150
    expect(proj[0].value).toBe(140);
    expect(proj[1].value).toBe(150);
  });

  it("computes growth metrics", () => {
    const r = computeForecast(table, { period: 0, value: 1 }, { periods: 1, method: "growth" });
    expect(r.avgGrowth).toBeGreaterThan(0);
    expect(r.cagr).toBeGreaterThan(0);
  });
});

describe("margin", () => {
  const table = parseCsv("Seg,Rev,Cost\nA,1000,600\nB,500,200\nA,500,400");

  it("computes profit + margin per segment and aggregates", () => {
    const r = computeMargin(table, { segment: 0, revenue: 1, cost: 2 });
    expect(r.rows).toHaveLength(2);
    const a = r.rows.find((x) => x.segment === "A")!;
    expect(a.revenue).toBe(1500); // 1000 + 500
    expect(a.cost).toBe(1000); // 600 + 400
    expect(a.profit).toBe(500);
    expect(a.margin).toBeCloseTo(33.33, 1);
    expect(r.totals.revenue).toBe(2000);
    expect(r.totals.profit).toBe(800);
  });
});
