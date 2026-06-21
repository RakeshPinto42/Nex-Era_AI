// Sample dataset builders for the upload-based modules. Reuses the existing
// lib/finance/samples generators where they fit, plus a few module-specific ones.

import { SAMPLE_BY_KEY } from "@/lib/finance/samples";
import { uid } from "@/lib/utils";
import type { Dataset, FileRole } from "./types";

export function makeDataset(
  name: string,
  role: FileRole,
  columns: string[],
  rows: (string | number)[][],
): Dataset {
  return { id: uid("ds"), name, role, addedAt: Date.now(), table: { columns, rows: rows.map((r) => r.map(String)) } };
}

/** Wrap an existing lib/finance sample spec as a Dataset. */
export function sampleDataset(key: string, role: FileRole): Dataset {
  const s = SAMPLE_BY_KEY[key].build();
  return makeDataset(`sample_${key}.csv`, role, s.columns, s.rows);
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}
const round = (n: number) => Math.round(n);

export function sampleForecast(): Dataset {
  const r = rng(37);
  const months: string[] = [];
  for (let y = 2025; y <= 2026; y++) for (let m = 1; m <= 12; m++) {
    if (y === 2026 && m > 6) break;
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  let v = 410_000;
  let budget = 420_000;
  const rows = months.map((m) => {
    v = v * (1.03 + (r() - 0.5) * 0.04);
    budget = budget * 1.035;
    const cost = v * (0.55 + r() * 0.1); // ~55-65% COGS
    return [m, round(v), round(budget), round(cost)];
  });
  return makeDataset("sample_forecast.csv", "actuals", ["Month", "Revenue", "Budget", "Cost"], rows);
}

export function sampleCustomerProfit(): Dataset {
  const r = rng(91);
  const customers = ["Acme", "Globex", "Initech", "Umbrella", "Stark", "Wayne", "Hooli", "Wonka", "Soylent", "Cyberdyne"];
  const rows = customers.map((c) => {
    const revenue = round(80_000 + r() * 900_000);
    const direct = round(revenue * (0.3 + r() * 0.35));
    const support = round(revenue * (0.05 + r() * 0.2));
    const account = round(5_000 + r() * 40_000);
    return [c, revenue, direct, support, account];
  });
  return makeDataset("sample_customers.csv", "other", ["Customer", "Revenue", "Direct Cost", "Support Cost", "Account Cost"], rows);
}

export function sampleRevenueLedger(): Dataset {
  const r = rng(7);
  const customers = ["Acme", "Globex", "Initech", "Umbrella", "Stark"];
  const rows: (string | number)[][] = [];
  for (let i = 0; i < 60; i++) {
    const month = 1 + Math.floor(r() * 3);
    rows.push([
      `INV-${1000 + i}`,
      customers[Math.floor(r() * customers.length)],
      `2026-${String(month).padStart(2, "0")}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`,
      round(2_000 + r() * 50_000),
    ]);
  }
  rows.push([...rows[0]]); // duplicate
  rows.push(["INV-2000", "Acme", "2025-12-15", 12_000]); // out of period
  rows.push(["INV-2001", "", "2026-02-10", 8_000]); // missing customer
  return makeDataset("sample_revenue_ledger.csv", "other", ["Doc", "Customer", "Date", "Amount"], rows);
}

export function sampleCommissionResults(): Dataset {
  const r = rng(31);
  const reps = ["A. Mehta", "J. Park", "L. Diaz", "S. Khan", "R. Cohen", "M. Ito", "T. Novak", "P. Singh"];
  const rows = reps.map((rep) => {
    const revenue = round(300_000 + r() * 500_000);
    return [rep, "West", revenue, round(revenue * (0.06 + r() * 0.04))];
  });
  return makeDataset("sample_commission_results.csv", "other", ["Rep", "Region", "Revenue", "Commission"], rows);
}
