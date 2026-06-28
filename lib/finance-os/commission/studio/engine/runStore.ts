// Append-only run store. Runs are never mutated; recompute appends a new run
// that supersedes. In-memory implementation (used by the engine + tests). An
// IndexedDB-backed implementation reusing the shared `db.ts` binds in a later
// milestone — same interface, no duplication.

import type { PeriodId, RunId } from "../model";
import type { EngineRunResult, RunStore } from "./types";

export class InMemoryRunStore implements RunStore {
  private readonly byId = new Map<RunId, EngineRunResult>();
  private readonly byPeriod = new Map<PeriodId, RunId[]>();

  append(result: EngineRunResult): void {
    const id = result.run.id;
    this.byId.set(id, result);                 // overwrite same id = same deterministic run
    const list = this.byPeriod.get(result.run.periodId) ?? [];
    if (!list.includes(id)) list.push(id);
    this.byPeriod.set(result.run.periodId, list);
  }

  get(runId: RunId): EngineRunResult | undefined {
    return this.byId.get(runId);
  }

  listByPeriod(periodId: PeriodId): EngineRunResult[] {
    return (this.byPeriod.get(periodId) ?? []).map((id) => this.byId.get(id)!).filter(Boolean);
  }

  latest(periodId: PeriodId): EngineRunResult | undefined {
    const list = this.byPeriod.get(periodId) ?? [];
    return list.length ? this.byId.get(list[list.length - 1]) : undefined;
  }
}
