// Execution graph — a DAG of stages. Validates dependencies + absence of cycles
// and produces a DETERMINISTIC topological order (Kahn's algorithm with ties
// broken by stage id, so the order never depends on insertion order).

import type { Stage, StageId } from "./types";

export class ExecutionGraph {
  private readonly stages = new Map<StageId, Stage>();

  constructor(stages: Stage[] = []) {
    for (const s of stages) this.add(s);
  }

  add(stage: Stage): this {
    if (this.stages.has(stage.id)) throw new Error(`Duplicate stage id: ${stage.id}`);
    this.stages.set(stage.id, stage);
    return this;
  }

  get(id: StageId): Stage | undefined {
    return this.stages.get(id);
  }

  /** Validate that every dependency exists and there is no cycle. Throws otherwise. */
  validate(): void {
    for (const s of this.stages.values()) {
      for (const dep of s.dependsOn) {
        if (!this.stages.has(dep)) throw new Error(`Stage "${s.id}" depends on unknown stage "${dep}"`);
      }
    }
    this.topoOrder(); // throws on cycle
  }

  /** Deterministic topological order. Ties broken by ascending stage id. */
  topoOrder(): StageId[] {
    const indeg = new Map<StageId, number>();
    const ids = [...this.stages.keys()].sort();
    for (const id of ids) indeg.set(id, 0);
    for (const s of this.stages.values()) for (const _ of s.dependsOn) indeg.set(s.id, (indeg.get(s.id) ?? 0) + 1);

    // ready = no remaining deps, kept sorted for determinism
    const ready: StageId[] = ids.filter((id) => (indeg.get(id) ?? 0) === 0).sort();
    const order: StageId[] = [];

    while (ready.length) {
      const id = ready.shift()!;
      order.push(id);
      // decrement dependents (those whose dependsOn includes id)
      const newly: StageId[] = [];
      for (const s of this.stages.values()) {
        if (s.dependsOn.includes(id)) {
          const d = (indeg.get(s.id) ?? 0) - 1;
          indeg.set(s.id, d);
          if (d === 0) newly.push(s.id);
        }
      }
      for (const n of newly.sort()) {
        ready.push(n);
      }
      ready.sort();
    }

    if (order.length !== this.stages.size) {
      throw new Error("Cycle detected in execution graph");
    }
    return order;
  }

  orderedStages(): Stage[] {
    return this.topoOrder().map((id) => this.stages.get(id)!);
  }
}
