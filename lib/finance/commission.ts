// Commission calculator: tiered (marginal) commission on revenue per rep, with
// an optional quota accelerator. Pure compute — runs in the browser.

import { toNum, type Table } from "./csv";

// Marginal tiers: each applies to the revenue band between the previous tier's
// `upTo` and this one's. Last tier should have upTo = null (infinity).
export type Tier = { upTo: number | null; rate: number }; // rate as percent

export type CommissionConfig = {
  tiers: Tier[];
  /** Optional: revenue above this quota earns `acceleratorRate` instead. */
  quota?: number | null;
  acceleratorRate?: number | null; // percent
};

export type CommissionRow = {
  rep: string;
  revenue: number;
  commission: number;
  effRate: number; // commission / revenue * 100
  attainment: number | null; // revenue / quota * 100
};

export type CommissionResult = {
  rows: CommissionRow[];
  totals: { revenue: number; commission: number; effRate: number };
};

export const DEFAULT_TIERS: Tier[] = [
  { upTo: 100000, rate: 5 },
  { upTo: 250000, rate: 7 },
  { upTo: null, rate: 10 },
];

/** Commission for one revenue figure under the marginal-tier schedule. */
export function commissionFor(revenue: number, cfg: CommissionConfig): number {
  if (!Number.isFinite(revenue) || revenue <= 0) return 0;

  // Quota accelerator: revenue beyond quota earns the accelerator rate; revenue
  // up to quota still runs through the tiers.
  if (cfg.quota && cfg.acceleratorRate != null && revenue > cfg.quota) {
    const base = tieredCommission(cfg.quota, cfg.tiers);
    const over = (revenue - cfg.quota) * (cfg.acceleratorRate / 100);
    return base + over;
  }
  return tieredCommission(revenue, cfg.tiers);
}

function tieredCommission(revenue: number, tiers: Tier[]): number {
  let remaining = revenue;
  let prev = 0;
  let total = 0;
  for (const t of tiers) {
    const cap = t.upTo ?? Infinity;
    const band = Math.min(remaining, cap - prev);
    if (band <= 0) break;
    total += band * (t.rate / 100);
    remaining -= band;
    prev = cap;
    if (remaining <= 0) break;
  }
  return total;
}

export function computeCommission(
  table: Table,
  map: { rep: number; revenue: number },
  cfg: CommissionConfig,
): CommissionResult {
  // Aggregate revenue per rep (a rep may appear on multiple rows / deals).
  const byRep = new Map<string, number>();
  for (const r of table.rows) {
    const rep = (r[map.rep] ?? "").trim() || "(unnamed)";
    const rev = toNum(r[map.revenue]);
    if (!Number.isFinite(rev)) continue;
    byRep.set(rep, (byRep.get(rep) ?? 0) + rev);
  }

  const rows: CommissionRow[] = [...byRep.entries()]
    .map(([rep, revenue]) => {
      const commission = commissionFor(revenue, cfg);
      return {
        rep,
        revenue,
        commission,
        effRate: revenue ? (commission / revenue) * 100 : 0,
        attainment: cfg.quota ? (revenue / cfg.quota) * 100 : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  const commission = rows.reduce((s, r) => s + r.commission, 0);
  return {
    rows,
    totals: { revenue, commission, effRate: revenue ? (commission / revenue) * 100 : 0 },
  };
}
