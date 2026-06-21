// Commission Hub — dynamic, rule-driven plan model. Plans are NOT assumed to be
// tiered-revenue. A plan combines one or more weighted component schedules
// (hybrid) over different bases, plus an ordered list of modifier rules.

export type CommissionBasis =
  | "revenue"
  | "grossMargin"
  | "units"
  | "collections"
  | "hybrid";

export const BASES: { value: CommissionBasis; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "grossMargin", label: "Gross Margin" },
  { value: "units", label: "Units" },
  { value: "collections", label: "Collections" },
  { value: "hybrid", label: "Hybrid (weighted)" },
];

export type ComponentBasis = Exclude<CommissionBasis, "hybrid">;

/** A rate band. `upTo` = null means the top (infinite) band. */
export type Slab = { upTo: number | null; rate: number }; // rate as percent

export type SlabType = "tiered" | "progressive";
// tiered      = marginal: each band's rate applies only to the metric in that band
// progressive = whole-amount: the band the metric lands in applies to the entire metric

export type SlabSchedule = { type: SlabType; slabs: Slab[] };

/** One weighted scoring component. Simple plans have exactly one (weight 1). */
export type PlanComponent = {
  id: string;
  label: string;
  basis: ComponentBasis;
  weight: number;
  schedule: SlabSchedule;
};

/** Modifier rules, applied in array order after base commission is computed. */
export type Modifier =
  | { kind: "accelerator"; id: string; label: string; aboveAttainmentPct: number; rate: number }
  | { kind: "decelerator"; id: string; label: string; belowAttainmentPct: number; factor: number }
  | { kind: "bonus"; id: string; label: string; minAttainmentPct: number; amount: number }
  | { kind: "spiff"; id: string; label: string; amount: number; perUnit?: number }
  | { kind: "clawback"; id: string; label: string; rate: number; belowAttainmentPct: number }
  | { kind: "manualAdjustment"; id: string; label: string; rep?: string; amount: number };

export type ModifierKind = Modifier["kind"];

export const MODIFIER_KINDS: { value: ModifierKind; label: string }[] = [
  { value: "accelerator", label: "Accelerator" },
  { value: "decelerator", label: "Decelerator" },
  { value: "bonus", label: "Bonus" },
  { value: "spiff", label: "SPIFF" },
  { value: "clawback", label: "Clawback" },
  { value: "manualAdjustment", label: "Manual Adjustment" },
];

export type CommissionPlan = {
  id: string;
  name: string;
  basis: CommissionBasis;
  components: PlanComponent[];
  modifiers: Modifier[];
  effectiveFrom: string | null;
  version: number;
  updatedAt: number;
};

/** Pre-aggregated per-rep facts the engine consumes (pure, testable). */
export type RepFacts = {
  rep: string;
  revenue: number;
  cost: number;
  units: number;
  collections: number;
  quota: number | null;
  region?: string;
  product?: string;
};

export type StatementModifier = { label: string; kind: ModifierKind; amount: number };

export type CommissionStatement = {
  rep: string;
  region: string;
  product: string;
  metric: number;
  metricLabel: string;
  revenue: number;
  quota: number | null;
  attainmentPct: number | null;
  baseCommission: number;
  modifiers: StatementModifier[];
  totalCommission: number;
  effRate: number;
};

export type CommissionTotals = {
  revenue: number;
  baseCommission: number;
  totalCommission: number;
  effRate: number;
  avgAttainment: number | null;
};

export type CommissionRunResult = {
  statements: CommissionStatement[];
  totals: CommissionTotals;
};

const DEFAULT_SCHEDULE: SlabSchedule = {
  type: "tiered",
  slabs: [
    { upTo: 100000, rate: 5 },
    { upTo: 250000, rate: 7 },
    { upTo: null, rate: 10 },
  ],
};

/** A sensible starter plan for the Plan Studio. Name is caller-supplied so it
 *  stays deterministic across SSR/CSR (no module-level counter). */
export function newPlan(id: string, name = "Plan 1"): CommissionPlan {
  return {
    id,
    name,
    basis: "revenue",
    components: [
      { id: `${id}_c0`, label: "Revenue commission", basis: "revenue", weight: 1, schedule: DEFAULT_SCHEDULE },
    ],
    modifiers: [],
    effectiveFrom: null,
    version: 1,
    updatedAt: Date.now(),
  };
}
