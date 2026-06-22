// Analyst usecase: run NEXERA Ledger Commission Hub on Sonny's car-wash data and
// independently verify every payout. This is the real engine (lib/finance-os/
// commission/engine) on the real sample + plan the UI ships.

import { describe, it, expect } from "vitest";
import { buildSampleDatasets, carWashPlan } from "@/components/finance-os/commission/sample";
import { SALES_FIELDS, TARGET_FIELDS } from "@/components/finance-os/commission/fields";
import { autoMap } from "@/lib/finance-os/mapping";
import { buildRepFacts, computeCommission } from "@/lib/finance-os/commission/engine";
import type { RepFacts } from "@/lib/finance-os/commission/types";

// --- independent re-implementation of the plan (analyst's own spreadsheet) ---
function tiered(x: number): number {
  // 4% to 8k, 6% to 16k, 8% above
  let t = 0;
  t += Math.min(x, 8000) * 0.04;
  if (x > 8000) t += Math.min(x - 8000, 8000) * 0.06;
  if (x > 16000) t += (x - 16000) * 0.08;
  return t;
}
function handCalc(f: RepFacts) {
  const base = f.revenue > 0 ? tiered(f.revenue) : 0;
  const spiff = 4 * f.units;
  const att = f.quota ? (f.revenue / f.quota) * 100 : null;
  const accel = att != null && att >= 100 ? Math.max(0, f.revenue - (f.quota ?? 0)) * 0.02 : 0;
  const bonus = att != null && att >= 120 ? 250 : 0;
  return { base, spiff, accel, bonus, total: base + spiff + accel + bonus, att };
}

describe("Sonny's car-wash commission run", () => {
  const [sales, targets] = buildSampleDatasets();
  const salesMap = autoMap(sales.table, SALES_FIELDS);
  const targetMap = autoMap(targets.table, TARGET_FIELDS);
  const facts = buildRepFacts(sales.table, { sales: salesMap, targets: targetMap }, targets.table);
  const result = computeCommission(facts, carWashPlan());

  it("auto-maps the car-wash columns including Site -> region", () => {
    expect(salesMap.rep).toBeGreaterThanOrEqual(0);
    expect(salesMap.region).toBeGreaterThanOrEqual(0); // Site
    expect(salesMap.product).toBeGreaterThanOrEqual(0); // Plan
    expect(salesMap.units).toBeGreaterThanOrEqual(0); // Memberships
  });

  it("matches an independent hand-calculation to the cent for every associate", () => {
    for (const s of result.statements) {
      const f = facts.find((x) => x.rep === s.rep)!;
      const hand = handCalc(f);
      expect(s.totalCommission).toBeCloseTo(hand.total, 6);
    }
  });

  it("prints the analyst report", () => {
    const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
    console.log("\n================  SONNY'S — COMMISSION RUN (NEXERA Ledger)  ================");
    console.log("Plan: tiered 4/6/8% revenue + $4/membership SPIFF + 2% over-target + $250 @120%\n");
    console.log(
      "Associate".padEnd(18),
      "Site".padEnd(22),
      "Rev".padStart(9),
      "Mbr".padStart(5),
      "Quota".padStart(8),
      "Att%".padStart(6),
      "Base".padStart(8),
      "SPIFF".padStart(7),
      "Accel".padStart(7),
      "Bonus".padStart(6),
      "TOTAL".padStart(9),
    );
    for (const s of result.statements) {
      const f = facts.find((x) => x.rep === s.rep)!;
      const h = handCalc(f);
      console.log(
        s.rep.padEnd(18),
        (s.region || "—").padEnd(22),
        fmt(s.revenue).padStart(9),
        String(f.units).padStart(5),
        (s.quota ? fmt(s.quota) : "—").padStart(8),
        (s.attainmentPct != null ? s.attainmentPct.toFixed(0) + "%" : "—").padStart(6),
        fmt(h.base).padStart(8),
        fmt(h.spiff).padStart(7),
        fmt(h.accel).padStart(7),
        fmt(h.bonus).padStart(6),
        fmt(s.totalCommission).padStart(9),
      );
    }
    const t = result.totals;
    console.log("\nTOTALS:",
      "revenue", fmt(t.revenue),
      "| commission", fmt(t.totalCommission),
      "| eff rate", t.effRate.toFixed(2) + "%",
      "| avg attainment", t.avgAttainment?.toFixed(0) + "%",
      "| associates", result.statements.length,
    );
    console.log("===========================================================================\n");
    expect(t.totalCommission).toBeGreaterThan(0);
  });
});
