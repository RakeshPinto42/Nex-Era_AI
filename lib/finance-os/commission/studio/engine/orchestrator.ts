// Commission Engine — orchestrator (Milestone 1). Owns the run lifecycle:
//   snapshot (pin versions + hash inputs) → execute stages in dependency order
//   → capture per-stage digests → produce an IMMUTABLE CalculationRun + manifest.
// Pure & deterministic: no Date.now (time comes from the period), no randomness.
// Replay re-executes a manifest and verifies digests match byte-for-byte.

import type { CalculationRun, CommissionData, Period, PlanVersionId, RunId, TraceStep } from "../model";
import { deepFreeze, hashOf } from "./hash";
import { canonicalizeData } from "./canonical";
import { money } from "./money";
import { ExecutionGraph } from "./graph";
import {
  CalcContext, EngineException, EngineRunResult, ENGINE_VERSION, emptyWorkingSet,
  RunManifest, RunMode, StageId, WorkingSet,
} from "./types";

export type RunInput = {
  period: Period;
  planVersionIds: PlanVersionId[];
  data: CommissionData;
  mode?: RunMode;
  runBy?: string;
};

export class CalcOrchestrator {
  constructor(private readonly graph: ExecutionGraph) {
    graph.validate(); // fail fast on bad DAG
  }

  /** Build the immutable, deterministic context for a run. */
  private snapshot(input: RunInput): { ctx: CalcContext; inputHash: string; runId: RunId } {
    // Canonicalize (sort all collections by id) so input order can't change the
    // run, then freeze so stages cannot mutate inputs.
    const data = deepFreeze(canonicalizeData(input.data));
    const planVersionIds = [...input.planVersionIds].sort();
    const inputHash = hashOf({ periodId: input.period.id, planVersionIds, data });
    const runId: RunId = `run_${input.period.id}_${inputHash.slice(0, 8)}`;
    const now = `${input.period.end}T23:59:59.000Z`;
    const ctx: CalcContext = {
      runId, period: input.period, planVersionIds, data,
      now, money, mode: input.mode ?? "full",
    };
    return { ctx, inputHash, runId };
  }

  /** Execute a full run. Returns an immutable result + replayable manifest. */
  run(input: RunInput): EngineRunResult {
    const { ctx, inputHash, runId } = this.snapshot(input);
    const order = this.graph.topoOrder();

    let working: WorkingSet = emptyWorkingSet();
    const trace: TraceStep[] = [];
    const exceptions: EngineException[] = [];
    const stageDigests: Record<StageId, string> = {};
    let faulted = false;
    let error: string | undefined;

    for (const id of order) {
      const stage = this.graph.get(id)!;
      try {
        const res = stage.run(ctx, working);
        working = res.output;
        trace.push(...res.trace);
        exceptions.push(...res.exceptions);
      } catch (e) {
        exceptions.push({ code: "STAGE_THROW", severity: "fault", stage: id, message: (e as Error).message });
      }
      stageDigests[id] = hashOf(working);
      if (exceptions.some((x) => x.severity === "fault")) {
        faulted = true;
        error = exceptions.find((x) => x.severity === "fault")!.message;
        break; // abort on fault — no partial commit
      }
    }

    const resultHash = hashOf(working);
    const run: CalculationRun = {
      id: runId,
      periodId: input.period.id,
      planVersionIds: ctx.planVersionIds as PlanVersionId[],
      status: faulted ? "error" : "done",
      mode: ctx.mode,
      startedAt: ctx.now,
      finishedAt: ctx.now,
      stats: {
        payees: working.eligiblePayeeIds.length,
        transactions: working.transactionIds.length,
        payoutLines: working.payoutLines.length,
        exceptions: exceptions.length,
      },
      error,
      createdAt: ctx.now,
      createdBy: input.runBy ?? "engine",
    };

    const manifest: RunManifest = {
      runId, periodId: input.period.id, planVersionIds: ctx.planVersionIds as PlanVersionId[],
      inputHash, mode: ctx.mode, engineVersion: ENGINE_VERSION,
      stageOrder: order, stageDigests, resultHash,
    };

    return deepFreeze({ run, manifest, working, trace, exceptions });
  }

  /**
   * Replay a prior manifest against an input snapshot and verify reproducibility:
   * every stage digest + the result hash must match. Determinism guarantee.
   */
  replay(prior: RunManifest, input: RunInput): { ok: boolean; mismatches: StageId[]; resultMatch: boolean } {
    const fresh = this.run(input);
    const mismatches = prior.stageOrder.filter((id) => prior.stageDigests[id] !== fresh.manifest.stageDigests[id]);
    const resultMatch = prior.resultHash === fresh.manifest.resultHash;
    return { ok: mismatches.length === 0 && resultMatch && prior.inputHash === fresh.manifest.inputHash, mismatches, resultMatch };
  }
}
