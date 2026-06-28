// Canonical pipeline — the approved stage order as a DAG. Milestone 1 ships the
// full topology with IDENTITY stub stages so the engine runs end-to-end and is
// provably deterministic + replayable NOW. Milestones 2-5 replace the stubs with
// real Validation / Crediting / Calculation / Statement logic — the orchestrator,
// graph, lifecycle, snapshot and replay never change.

import type { CalcContext, Stage, StageId, WorkingSet } from "./types";

export const STAGE = {
  ingest: "ingest",
  validate: "validate",
  eligibility: "eligibility",
  credit: "credit",
  attainment: "attainment",
  rules: "rules",
  rate: "rate",
  accelerator: "accelerator",
  cap: "cap",
  guarantee: "guarantee",
  draw: "draw",
  clawback: "clawback",
  adjustment: "adjustment",
  payout: "payout",
  statement: "statement",
} as const;

// The dependency edges (the approved DAG).
const DEPS: Record<StageId, StageId[]> = {
  [STAGE.ingest]: [],
  [STAGE.validate]: [STAGE.ingest],
  [STAGE.eligibility]: [STAGE.ingest],
  [STAGE.credit]: [STAGE.validate, STAGE.eligibility],
  [STAGE.attainment]: [STAGE.credit],
  [STAGE.rules]: [STAGE.attainment],
  [STAGE.rate]: [STAGE.rules],
  [STAGE.accelerator]: [STAGE.rate],
  [STAGE.cap]: [STAGE.accelerator],
  [STAGE.guarantee]: [STAGE.cap],
  [STAGE.draw]: [STAGE.guarantee],
  [STAGE.clawback]: [STAGE.draw],
  [STAGE.adjustment]: [STAGE.clawback],
  [STAGE.payout]: [STAGE.adjustment],
  [STAGE.statement]: [STAGE.payout],
};

// Identity stub: passes the WorkingSet through unchanged, emits one deterministic
// trace marker, no exceptions. Pure.
function stubStage(id: StageId): Stage {
  return {
    id,
    dependsOn: DEPS[id] ?? [],
    run: (_ctx: CalcContext, input: WorkingSet) => ({
      output: input,
      trace: [{ id: `${id}`, step: id, detail: `${id}: stub (implemented in a later milestone)` }],
      exceptions: [],
    }),
  };
}

/** Milestone-1 pipeline: all stages present, identity behavior. */
export function buildStubPipeline(): Stage[] {
  return Object.values(STAGE).map((id) => stubStage(id));
}

// Deterministic topological order. `eligibility` and `validate` both depend only
// on `ingest` (they run in parallel); the engine breaks the tie alphabetically,
// so eligibility precedes validate. Both orderings are correct.
export const PIPELINE_ORDER: StageId[] = [
  STAGE.ingest, STAGE.eligibility, STAGE.validate, STAGE.credit, STAGE.attainment,
  STAGE.rules, STAGE.rate, STAGE.accelerator, STAGE.cap, STAGE.guarantee,
  STAGE.draw, STAGE.clawback, STAGE.adjustment, STAGE.payout, STAGE.statement,
];
