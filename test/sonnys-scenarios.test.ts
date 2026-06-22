// Commission analyst @ Sonny's — plan-design scenarios in the Commission Hub.
// Same associates + data, four plan variants (Plan Studio edits), each costed
// through the real engine. Verifies internal consistency + a hand re-derivation.

import { describe, it, expect } from "vitest";
import { buildSampleDatasets, carWashPlan } from "@/components/finance-os/commission/sample";
import { SALES_FIELDS, TARGET_FIELDS } from "@/components/finance-os/commission/fields";
import { autoMap } from "@/lib/finance-os/mapping";
import { buildRepFacts, computeCommission } from "@/lib/finance-os/commission/engine";
import type { CommissionPlan, Slab } from "@/lib/finance-os/commission/types";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString();
const slabs = (a: number, b: number, c: number): Slab[] => [
  { upTo: 8000, rate: a },
  { upTo: 16000, rate: b },
  { upTo: null, rate: c },
];
function plan(name: string, sched: Slab[], mods: CommissionPlan["modifiers"]): CommissionPlan {
  const base = carWashPlan();
  return { ...base, name, components: [{ ...base.components[0], schedule: { type: "tiered", slabs: sched } }], modifiers: mods };
}

describe("Sonny's — commission plan scenarios", () => {
  const [sales, targets] = buildSampleDatasets();
  const facts = buildRepFacts(
    sales.table,
    { sales: autoMap(sales.table, SALES_FIELDS), targets: autoMap(targets.table, TARGET_FIELDS) },
    targets.table,
  );
  // Exclude the non-employee kiosk transaction (analyst data hygiene).
  const reps = facts.filter((f) => f.rep !== "Walk-in Kiosk");

  const SPIFF = (n: number) => ({ kind: "spiff" as const, id: "s", label: `$${n}/mbr SPIFF`, amount: 0, perUnit: n });
  const ACCEL = (r: number) => ({ kind: "accelerator" as const, id: "a", label: `+${r}% over target`, aboveAttainmentPct: 100, rate: r });
  const BONUS = (p: number, amt: number) => ({ kind: "bonus" as const, id: "b", label: `$${amt} @${p}%`, minAttainmentPct: p, amount: amt });
  const CLAWBACK = (p: number, r: number) => ({ kind: "clawback" as const, id: "c", label: `-${r}% < ${p}%`, belowAttainmentPct: p, rate: r });

  const scenarios: CommissionPlan[] = [
    plan("S0 Current", slabs(4, 6, 8), [SPIFF(4), ACCEL(2), BONUS(120, 250)]),
    plan("S1 Membership-led", slabs(3, 4, 5), [SPIFF(6), ACCEL(2), BONUS(120, 250)]),
    plan("S2 Margin-protect", slabs(4, 6, 8), [SPIFF(4), ACCEL(2), BONUS(120, 250), CLAWBACK(60, 25)]),
    plan("S3 Attainment-driven", slabs(4, 6, 8), [SPIFF(4), ACCEL(4), BONUS(110, 300)]),
  ];

  const runs = scenarios.map((p) => ({ plan: p, res: computeCommission(reps, p) }));

  it("each run is internally consistent (totals == sum of statements)", () => {
    for (const { res } of runs) {
      const s = res.statements.reduce((a, b) => a + b.totalCommission, 0);
      expect(res.totals.totalCommission).toBeCloseTo(s, 6);
    }
  });

  it("hand-checks S1 membership-led for the top membership seller", () => {
    const { res } = runs[1];
    const top = [...res.statements].sort((a, b) => b.revenue - a.revenue)[0];
    const f = reps.find((x) => x.rep === top.rep)!;
    let base = Math.min(f.revenue, 8000) * 0.03;
    if (f.revenue > 8000) base += Math.min(f.revenue - 8000, 8000) * 0.04;
    if (f.revenue > 16000) base += (f.revenue - 16000) * 0.05;
    const spiff = 6 * f.units;
    const att = f.quota ? (f.revenue / f.quota) * 100 : 0;
    const accel = att >= 100 ? Math.max(0, f.revenue - (f.quota ?? 0)) * 0.02 : 0;
    const bonus = att >= 120 ? 250 : 0;
    expect(top.totalCommission).toBeCloseTo(base + spiff + accel + bonus, 6);
  });

  it("prints the scenario comparison + per-rep delta", () => {
    console.log("\n============  SONNY'S — COMMISSION PLAN SCENARIOS  ============");
    console.log("Book: " + fmt(runs[0].res.totals.revenue) + " revenue · " + reps.length + " associates\n");
    console.log("Scenario".padEnd(22), "Comm cost".padStart(10), "Eff%".padStart(7), "vs S0".padStart(9));
    const s0 = runs[0].res.totals.totalCommission;
    for (const { plan: p, res } of runs) {
      const t = res.totals.totalCommission;
      console.log(
        p.name.padEnd(22),
        fmt(t).padStart(10),
        (res.totals.effRate.toFixed(2) + "%").padStart(7),
        (t === s0 ? "—" : (t > s0 ? "+" : "") + fmt(t - s0)).padStart(9),
      );
    }

    console.log("\nPer-associate: S0 Current vs S1 Membership-led");
    const m0 = new Map(runs[0].res.statements.map((s) => [s.rep, s.totalCommission]));
    console.log("Associate".padEnd(18), "Mbr".padStart(5), "S0".padStart(8), "S1".padStart(8), "Δ".padStart(8));
    for (const s of runs[1].res.statements) {
      const f = reps.find((x) => x.rep === s.rep)!;
      const a = m0.get(s.rep) ?? 0;
      console.log(
        s.rep.padEnd(18),
        String(f.units).padStart(5),
        fmt(a).padStart(8),
        fmt(s.totalCommission).padStart(8),
        ((s.totalCommission >= a ? "+" : "") + fmt(s.totalCommission - a)).padStart(8),
      );
    }
    console.log("==============================================================\n");
    expect(runs.length).toBe(4);
  });
});
