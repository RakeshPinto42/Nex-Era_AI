// Commission Engine — core interfaces (Milestone 1). Pure, deterministic.
// Stages are pure functions over a frozen snapshot; the orchestrator runs them
// in dependency order, captures per-stage digests, and produces an immutable
// CalculationRun + a replayable manifest.

import type {
  CalculationRun, CommissionData, ISODateTime, PayoutLine, Credit, Statement,
  PeriodId, PlanVersionId, RunId, TraceStep, Period,
} from "../model";
import type { money as MoneyApi } from "./money";

export type StageId = string;
export type RunMode = "full" | "incremental";

export type Severity = "exception" | "fault"; // exception = non-fatal; fault = abort
export type EngineException = {
  code: string;
  severity: Severity;
  stage: StageId;
  message: string;
  entity?: string;
  entityId?: string;
};

// The evolving payload threaded stage→stage. Stages return a NEW WorkingSet
// (never mutate inputs). Grows across milestones (credits, payoutLines, …).
export type WorkingSet = {
  readonly transactionIds: string[];          // in-scope transactions for this run
  readonly eligiblePayeeIds: string[];
  readonly credits: Credit[];
  readonly payoutLines: PayoutLine[];
  readonly statements: Statement[];
};

export function emptyWorkingSet(): WorkingSet {
  return { transactionIds: [], eligiblePayeeIds: [], credits: [], payoutLines: [], statements: [] };
}

// Immutable context handed to every stage. `now` is derived from the period
// (NOT the wall clock) so even metadata is reproducible.
export type CalcContext = {
  readonly runId: RunId;
  readonly period: Period;
  readonly planVersionIds: readonly PlanVersionId[];
  readonly data: Readonly<CommissionData>;    // frozen snapshot of all inputs
  readonly now: ISODateTime;                  // = period.end, fixed
  readonly money: typeof MoneyApi;
  readonly mode: RunMode;
};

export type StageResult = {
  output: WorkingSet;
  trace: TraceStep[];
  exceptions: EngineException[];
};

// A stage is a PURE processor. Same (ctx, input) ⇒ same result.
export type Stage = {
  id: StageId;
  dependsOn: StageId[];
  run: (ctx: CalcContext, input: WorkingSet) => StageResult;
};

// Reproducibility key: pin versions + input hash + per-stage output digests.
export type RunManifest = {
  runId: RunId;
  periodId: PeriodId;
  planVersionIds: PlanVersionId[];
  inputHash: string;                          // hash of the frozen input snapshot
  mode: RunMode;
  engineVersion: string;
  stageOrder: StageId[];
  stageDigests: Record<StageId, string>;      // hash of each stage's output
  resultHash: string;                         // hash of the final WorkingSet
};

export type EngineRunResult = {
  run: CalculationRun;                        // immutable
  manifest: RunManifest;
  working: WorkingSet;
  trace: TraceStep[];
  exceptions: EngineException[];
};

// Append-only run store. In-memory impl here; an IndexedDB-backed impl (reusing
// the existing db.ts) binds in a later milestone — no duplication.
export interface RunStore {
  append(result: EngineRunResult): void;
  get(runId: RunId): EngineRunResult | undefined;
  listByPeriod(periodId: PeriodId): EngineRunResult[];
  latest(periodId: PeriodId): EngineRunResult | undefined;
}

export const ENGINE_VERSION = "1.0.0";
