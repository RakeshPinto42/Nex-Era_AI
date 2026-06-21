// Deterministic sample datasets for the Commission Hub. Includes a few injected
// data issues so validation visibly catches them.

import type { Dataset } from "@/lib/finance-os/types";
import { uid } from "@/lib/utils";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}
const round = (n: number) => Math.round(n);

const REPS = ["A. Mehta", "J. Park", "L. Diaz", "S. Khan", "R. Cohen", "M. Ito", "T. Novak", "P. Singh"];
const REGIONS = ["West", "East", "North", "South"];
const PRODUCTS = ["Platform", "Analytics", "Premium Support", "Integrations"];

function ds(name: string, role: Dataset["role"], columns: string[], rows: (string | number)[][]): Dataset {
  return { id: uid("ds"), name, role, addedAt: Date.now(), table: { columns, rows: rows.map((r) => r.map(String)) } };
}

export function buildSampleDatasets(): Dataset[] {
  const r = rng(23);
  const salesRows: (string | number)[][] = [];

  REPS.forEach((rep, i) => {
    const deals = 3 + Math.floor(r() * 4);
    for (let d = 0; d < deals; d++) {
      const revenue = round(30_000 + r() * 180_000);
      const cost = round(revenue * (0.4 + r() * 0.3));
      salesRows.push([
        rep,
        REGIONS[Math.floor(r() * REGIONS.length)],
        PRODUCTS[Math.floor(r() * PRODUCTS.length)],
        revenue,
        cost,
        1 + Math.floor(r() * 8),
        round(revenue * (0.7 + r() * 0.3)),
      ]);
    }
    // inject a negative-revenue row for one rep (validation: negative)
    if (i === 2) salesRows.push([rep, "West", "Platform", -5000, 2000, 1, 0]);
  });
  // inject a duplicate of the first row (validation: duplicate)
  salesRows.push([...salesRows[0]]);
  // a rep not present in the employee master (validation: foreign-ref)
  salesRows.push(["X. Unknown", "East", "Analytics", 90_000, 40_000, 2, 60_000]);

  const sales = ds(
    "sample_sales.csv",
    "sales",
    ["Rep", "Region", "Product", "Revenue", "Cost", "Units", "Collections"],
    salesRows,
  );

  // targets: omit one rep (validation: missing-target)
  const targets = ds(
    "sample_targets.csv",
    "target",
    ["Rep", "Quota"],
    REPS.filter((_, i) => i !== 5).map((rep) => [rep, round(300_000 + r() * 250_000)]),
  );

  const employees = ds(
    "sample_employees.csv",
    "employee",
    ["Rep", "Region", "Manager"],
    REPS.map((rep) => [rep, REGIONS[Math.floor(r() * REGIONS.length)], "VP Sales"]),
  );

  return [sales, targets, employees];
}
