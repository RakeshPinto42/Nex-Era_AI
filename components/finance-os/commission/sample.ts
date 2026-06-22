// Deterministic sample datasets for the Commission Hub — modeled on a US express
// car-wash operator (Sonny's-style): sales associates sell unlimited-wash
// memberships + retail washes + detail packages out of multiple sites. A few
// data issues are injected so validation visibly catches them.

import type { Dataset } from "@/lib/finance-os/types";
import type { CommissionPlan } from "@/lib/finance-os/commission/types";
import { uid } from "@/lib/utils";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}
const round = (n: number) => Math.round(n);

const ASSOCIATES = [
  "Marcus Bell", "Tina Alvarez", "Derek Cho", "Priya Nair",
  "Jamal Carter", "Sofia Russo", "Kevin Tran", "Brittany Hughes",
];
const SITES = [
  "Tampa - Dale Mabry", "Orlando - I-Drive", "Miami - Kendall",
  "Jacksonville - Southside", "St. Pete - 4th St",
];
// Monthly recurring membership plans (the core "deal" — unlimited wash club).
const MEMBERSHIPS = [
  { name: "Unlimited Basic", price: 20 },
  { name: "Unlimited Deluxe", price: 30 },
  { name: "Unlimited Ceramic", price: 40 },
];
// One-off retail (counted in revenue, NOT toward the per-membership SPIFF).
const RETAIL = [
  { name: "Single Wash - The Works", price: 18 },
  { name: "Express Detail", price: 120 },
];

function ds(name: string, role: Dataset["role"], columns: string[], rows: (string | number)[][]): Dataset {
  return { id: uid("ds"), name, role, addedAt: Date.now(), table: { columns, rows: rows.map((r) => r.map(String)) } };
}

export function buildSampleDatasets(): Dataset[] {
  const r = rng(7);
  const rows: (string | number)[][] = [];

  ASSOCIATES.forEach((rep, i) => {
    const site = SITES[i % SITES.length];

    // Membership deals — `Memberships` column carries the unit count (drives SPIFF).
    const memLines = 2 + Math.floor(r() * 2);
    for (let k = 0; k < memLines; k++) {
      const p = MEMBERSHIPS[Math.floor(r() * MEMBERSHIPS.length)];
      const units = 25 + Math.floor(r() * 110);
      const revenue = units * p.price;
      rows.push([rep, site, p.name, revenue, round(revenue * 0.18), units, round(revenue * (0.85 + r() * 0.12))]);
    }

    // Retail / detail — revenue only; Memberships count = 0 (not a club deal).
    const retLines = 1 + Math.floor(r() * 2);
    for (let k = 0; k < retLines; k++) {
      const p = RETAIL[Math.floor(r() * RETAIL.length)];
      const detail = p.name.includes("Detail");
      const count = detail ? 4 + Math.floor(r() * 18) : 40 + Math.floor(r() * 160);
      const revenue = count * p.price;
      rows.push([rep, site, p.name, revenue, round(revenue * (detail ? 0.4 : 0.25)), 0, round(revenue * (0.9 + r() * 0.1))]);
    }
  });

  // injected issues for validation:
  rows.push([ASSOCIATES[2], SITES[0], "Unlimited Deluxe", -600, 200, 0, 0]); // negative revenue
  rows.push([...rows[0]]); // duplicate row
  rows.push(["Walk-in Kiosk", SITES[1], "Single Wash - The Works", 540, 140, 0, 500]); // rep not in team master

  const sales = ds(
    "carwash_sales.csv",
    "sales",
    ["Associate", "Site", "Plan", "Revenue", "Cost", "Memberships", "Collections"],
    rows,
  );

  // targets: omit one associate (validation: missing-target)
  const targets = ds(
    "carwash_targets.csv",
    "target",
    ["Associate", "Quota"],
    ASSOCIATES.filter((_, i) => i !== 5).map((rep) => [rep, 9000 + round(r() * 7000)]),
  );

  const team = ds(
    "carwash_team.csv",
    "employee",
    ["Associate", "Site", "Manager"],
    ASSOCIATES.map((rep, i) => [rep, SITES[i % SITES.length], "Site Manager"]),
  );

  return [sales, targets, team];
}

// A realistic car-wash commission plan: a tiered rate on total revenue, plus a
// per-membership SPIFF (the bounty that drives wash-club sales), an over-target
// accelerator, and a bonus for blowing past quota.
export function carWashPlan(): CommissionPlan {
  const id = "plan_carwash";
  return {
    id,
    name: "Car Wash Sales Plan",
    basis: "revenue",
    components: [
      {
        id: `${id}_c0`,
        label: "Membership & retail revenue",
        basis: "revenue",
        weight: 1,
        schedule: {
          type: "tiered",
          slabs: [
            { upTo: 8000, rate: 4 },
            { upTo: 16000, rate: 6 },
            { upTo: null, rate: 8 },
          ],
        },
      },
    ],
    modifiers: [
      { kind: "spiff", id: `${id}_m0`, label: "Per-membership SPIFF ($4/club deal)", amount: 0, perUnit: 4 },
      { kind: "accelerator", id: `${id}_m1`, label: "Over-target accelerator (+2%)", aboveAttainmentPct: 100, rate: 2 },
      { kind: "bonus", id: `${id}_m2`, label: "Club-buster bonus", minAttainmentPct: 120, amount: 250 },
    ],
    effectiveFrom: null,
    version: 1,
    updatedAt: Date.now(),
  };
}
