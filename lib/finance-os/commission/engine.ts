// Commission engine — rule-driven pipeline:
//   per rep → resolve basis metric → apply slab schedule (tiered|progressive)
//           → fold modifier rules in order → statement.
// Modifiers are registered in a map so new kinds drop in without touching core.

import { toNum, type Table } from "@/lib/finance/csv";
import type { ColumnMapping } from "../types";
import type {
  CommissionBasis,
  CommissionPlan,
  CommissionRunResult,
  CommissionStatement,
  ComponentBasis,
  Modifier,
  PlanComponent,
  RepFacts,
  SlabSchedule,
  StatementModifier,
} from "./types";

// ---- metric resolution ----

export function metricFor(basis: ComponentBasis, f: RepFacts): number {
  switch (basis) {
    case "revenue":
      return f.revenue;
    case "grossMargin":
      return f.revenue - f.cost;
    case "units":
      return f.units;
    case "collections":
      return f.collections;
  }
}

const BASIS_LABEL: Record<CommissionBasis, string> = {
  revenue: "Revenue",
  grossMargin: "Gross Margin",
  units: "Units",
  collections: "Collections",
  hybrid: "Hybrid",
};

/** The metric used for attainment: a hybrid plan attains on revenue. */
function primaryMetric(plan: CommissionPlan, f: RepFacts): number {
  if (plan.basis === "hybrid") return f.revenue;
  return metricFor(plan.basis, f);
}

// ---- slab schedules ----

export function applySchedule(metric: number, schedule: SlabSchedule): number {
  if (!Number.isFinite(metric) || metric <= 0) return 0;
  return schedule.type === "progressive"
    ? progressive(metric, schedule)
    : tiered(metric, schedule);
}

function tiered(metric: number, { slabs }: SlabSchedule): number {
  let remaining = metric;
  let prev = 0;
  let total = 0;
  for (const s of slabs) {
    const cap = s.upTo ?? Infinity;
    const band = Math.min(remaining, cap - prev);
    if (band <= 0) break;
    total += band * (s.rate / 100);
    remaining -= band;
    prev = cap;
    if (remaining <= 0) break;
  }
  return total;
}

function progressive(metric: number, { slabs }: SlabSchedule): number {
  // Whole-amount: the rate of the band the metric lands in applies to all of it.
  let rate = slabs[slabs.length - 1]?.rate ?? 0;
  for (const s of slabs) {
    if (s.upTo == null || metric <= s.upTo) {
      rate = s.rate;
      break;
    }
  }
  return metric * (rate / 100);
}

// ---- modifier registry ----

type ModCtx = {
  facts: RepFacts;
  metric: number;
  attainmentPct: number | null;
  quota: number | null;
  baseCommission: number;
};

type ModFn<K extends Modifier["kind"]> = (mod: Extract<Modifier, { kind: K }>, ctx: ModCtx) => number;

const MODIFIERS: { [K in Modifier["kind"]]: ModFn<K> } = {
  accelerator: (m, ctx) => {
    if (ctx.attainmentPct == null || ctx.quota == null) return 0;
    if (ctx.attainmentPct < m.aboveAttainmentPct) return 0;
    const threshold = ctx.quota * (m.aboveAttainmentPct / 100);
    const over = Math.max(0, ctx.metric - threshold);
    return over * (m.rate / 100);
  },
  decelerator: (m, ctx) => {
    if (ctx.attainmentPct == null) return 0;
    if (ctx.attainmentPct >= m.belowAttainmentPct) return 0;
    return ctx.baseCommission * (m.factor - 1); // factor < 1 reduces payout
  },
  bonus: (m, ctx) => {
    if (ctx.attainmentPct == null) return 0;
    return ctx.attainmentPct >= m.minAttainmentPct ? m.amount : 0;
  },
  spiff: (m, ctx) => m.amount + (m.perUnit ?? 0) * ctx.facts.units,
  clawback: (m, ctx) => {
    if (ctx.attainmentPct == null) return 0;
    return ctx.attainmentPct < m.belowAttainmentPct ? -ctx.baseCommission * (m.rate / 100) : 0;
  },
  manualAdjustment: (m, ctx) => {
    if (m.rep && m.rep.trim().toLowerCase() !== ctx.facts.rep.toLowerCase()) return 0;
    return m.amount;
  },
};

function applyModifier(mod: Modifier, ctx: ModCtx): number {
  const fn = MODIFIERS[mod.kind] as ModFn<typeof mod.kind>;
  return fn(mod as never, ctx);
}

// ---- base commission across components (hybrid = weighted sum) ----

function baseCommission(plan: CommissionPlan, f: RepFacts): number {
  const comps: PlanComponent[] = plan.components.length
    ? plan.components
    : [{ id: "c", label: "", basis: plan.basis === "hybrid" ? "revenue" : plan.basis, weight: 1, schedule: { type: "tiered", slabs: [] } }];
  return comps.reduce((sum, c) => sum + applySchedule(metricFor(c.basis, f), c.schedule) * (c.weight ?? 1), 0);
}

// ---- public: compute one run (pure) ----

export function computeCommission(facts: RepFacts[], plan: CommissionPlan): CommissionRunResult {
  const statements: CommissionStatement[] = facts
    .map((f) => {
      const metric = primaryMetric(plan, f);
      const attainmentPct = f.quota && f.quota > 0 ? (metric / f.quota) * 100 : null;
      const base = baseCommission(plan, f);

      const ctx: ModCtx = { facts: f, metric, attainmentPct, quota: f.quota, baseCommission: base };
      const modifiers: StatementModifier[] = plan.modifiers
        .map((m) => ({ label: m.label, kind: m.kind, amount: applyModifier(m, ctx) }))
        .filter((m) => m.amount !== 0);

      const total = base + modifiers.reduce((s, m) => s + m.amount, 0);
      return {
        rep: f.rep,
        region: f.region ?? "",
        product: f.product ?? "",
        metric,
        metricLabel: BASIS_LABEL[plan.basis],
        revenue: f.revenue,
        quota: f.quota,
        attainmentPct,
        baseCommission: base,
        modifiers,
        totalCommission: total,
        effRate: f.revenue ? (total / f.revenue) * 100 : 0,
      };
    })
    .sort((a, b) => b.totalCommission - a.totalCommission);

  const revenue = sum(statements, (s) => s.revenue);
  const base = sum(statements, (s) => s.baseCommission);
  const total = sum(statements, (s) => s.totalCommission);
  const atts = statements.map((s) => s.attainmentPct).filter((a): a is number => a != null);

  return {
    statements,
    totals: {
      revenue,
      baseCommission: base,
      totalCommission: total,
      effRate: revenue ? (total / revenue) * 100 : 0,
      avgAttainment: atts.length ? atts.reduce((a, b) => a + b, 0) / atts.length : null,
    },
  };
}

const sum = <T>(arr: T[], f: (t: T) => number) => arr.reduce((s, t) => s + f(t), 0);

// ---- table → RepFacts aggregation (data-mapping layer) ----

export type FactMapping = {
  sales: ColumnMapping; // rep, revenue, cost?, units?, collections?, region?, product?
  targets?: ColumnMapping; // rep, quota
};

const cell = (row: string[], idx: number | undefined) => (idx == null || idx < 0 ? "" : row[idx] ?? "");
const numCell = (row: string[], idx: number | undefined) => {
  const n = toNum(cell(row, idx));
  return Number.isFinite(n) ? n : 0;
};

/** Aggregate a sales table (+ optional targets) into per-rep facts. */
export function buildRepFacts(salesTable: Table, mapping: FactMapping, targetsTable?: Table): RepFacts[] {
  const m = mapping.sales;
  const byRep = new Map<string, RepFacts>();

  for (const row of salesTable.rows) {
    const rep = cell(row, m.rep).trim() || "(unnamed)";
    const cur =
      byRep.get(rep) ??
      ({ rep, revenue: 0, cost: 0, units: 0, collections: 0, quota: null, region: cell(row, m.region) || undefined, product: cell(row, m.product) || undefined } as RepFacts);
    cur.revenue += numCell(row, m.revenue);
    cur.cost += numCell(row, m.cost);
    cur.units += numCell(row, m.units);
    cur.collections += numCell(row, m.collections);
    if (!cur.region && cell(row, m.region)) cur.region = cell(row, m.region);
    if (!cur.product && cell(row, m.product)) cur.product = cell(row, m.product);
    byRep.set(rep, cur);
  }

  if (targetsTable && mapping.targets) {
    const t = mapping.targets;
    const quota = new Map<string, number>();
    for (const row of targetsTable.rows) {
      const rep = cell(row, t.rep).trim();
      if (rep) quota.set(rep.toLowerCase(), (quota.get(rep.toLowerCase()) ?? 0) + numCell(row, t.quota));
    }
    for (const f of byRep.values()) {
      const q = quota.get(f.rep.toLowerCase());
      if (q != null) f.quota = q;
    }
  }

  return [...byRep.values()];
}
