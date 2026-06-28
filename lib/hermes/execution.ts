/**
 * Hermes — Execution Coordinator (Phase 4).
 *
 * Turns Hermes from a planner into a scheduler. Iterates an ExecutionPlan,
 * resolves the agent executor (from the executable-agent registry) and tools
 * (from the Tool Registry — never hardcoded), invokes the agent through the
 * common interface, collects results and emits observable events.
 *
 * Hermes performs NO business logic — it only coordinates. Only implemented
 * agents run; everything else is skipped.
 */

import type { ExecutionPlan } from "./plan";
import { getExecutor } from "@/lib/agents/executors";
import { getTool } from "@/lib/tools/registry";
import type { AgentResult } from "@/lib/agents/executor";
import type { WorkspaceContextSnapshot } from "@/lib/workspace/model";

export type StepRunStatus =
  | "pending"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

export type ExecutionEventType =
  | "run-started"
  | "started"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled"
  | "run-completed"
  | "run-failed";

export type ExecutionEvent = {
  id: string;
  at: string; // ISO
  type: ExecutionEventType;
  stepId: string | null;
  label: string;
};

export type StepRun = {
  stepId: string;
  title: string;
  agentId: string | null;
  agentName: string | null;
  runningTool: string | null;
  status: StepRunStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  summary?: string;
  error?: string;
};

export type RunStatus = "pending" | "running" | "completed" | "failed";

export type ExecutionRun = {
  id: string;
  planId: string;
  goal: string;
  status: RunStatus;
  steps: StepRun[];
  events: ExecutionEvent[];
  startedAt: string | null;
  endedAt: string | null;
  /** Outputs collected from completed steps, keyed by step id. */
  outputs: Record<string, unknown>;
};

export type RunInput = {
  files?: File[];
  workspace?: WorkspaceContextSnapshot | null;
};

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const now = () => new Date().toISOString();

/** Build the initial run from a plan (all steps pending). */
export function initRun(plan: ExecutionPlan): ExecutionRun {
  return {
    id: uid("run"),
    planId: plan.id,
    goal: plan.goal,
    status: "pending",
    steps: plan.steps.map((s) => ({
      stepId: s.id,
      title: s.title,
      agentId: s.assignedAgentId,
      agentName: s.assignedAgentName,
      runningTool: null,
      status: "pending",
      startedAt: null,
      endedAt: null,
      durationMs: null,
    })),
    events: [],
    startedAt: null,
    endedAt: null,
    outputs: {},
  };
}

function clone(run: ExecutionRun): ExecutionRun {
  return { ...run, steps: run.steps.map((s) => ({ ...s })), events: [...run.events], outputs: { ...run.outputs } };
}

/**
 * Execute a plan. Calls onChange after every state transition so the UI can
 * render progress live. Returns the final run.
 */
export async function executeRun(
  plan: ExecutionPlan,
  input: RunInput,
  onChange?: (run: ExecutionRun) => void,
): Promise<ExecutionRun> {
  const run = initRun(plan);
  const byId = new Map(run.steps.map((s) => [s.stepId, s]));
  const emit = (type: ExecutionEventType, label: string, stepId: string | null = null) =>
    run.events.unshift({ id: uid("ev"), at: now(), type, stepId, label });
  const push = () => onChange?.(clone(run));

  run.status = "running";
  run.startedAt = now();
  emit("run-started", `Executing: ${plan.goal}`);
  push();

  for (const planStep of plan.steps) {
    const sr = byId.get(planStep.id)!;
    const executor = getExecutor(planStep.assignedAgentId);

    // resolve tool from the Tool Registry (never hardcoded)
    sr.runningTool = planStep.requiredTools.map((t) => getTool(t)?.name ?? t)[0] ?? null;

    if (!executor) {
      sr.status = "skipped";
      emit("skipped", `${sr.agentName ?? "Step"} — not executable yet`, sr.stepId);
      push();
      continue;
    }

    // A dependency that completed OR was skipped (not executable) is non-blocking.
    const depsOk = planStep.dependencies.every((d) => {
      const st = byId.get(d)?.status;
      return st === "completed" || st === "skipped";
    });
    if (!depsOk) {
      sr.status = "skipped";
      emit("skipped", `${sr.title} — dependency not met`, sr.stepId);
      push();
      continue;
    }

    sr.status = "running";
    sr.startedAt = now();
    emit("started", `${sr.title} → ${sr.agentName}${sr.runningTool ? ` (tool: ${sr.runningTool})` : ""}`, sr.stepId);
    push();

    let result: AgentResult;
    try {
      result = await executor.execute({
        agentId: planStep.assignedAgentId!,
        stepId: planStep.id,
        capabilities: planStep.requiredCapabilities,
        tools: planStep.requiredTools,
        input: { goal: plan.goal, files: input.files, workspace: input.workspace, prior: run.outputs },
      });
    } catch (e) {
      result = { ok: false, error: (e as Error).message };
    }

    sr.endedAt = now();
    sr.durationMs = sr.startedAt ? +new Date(sr.endedAt) - +new Date(sr.startedAt) : null;

    if (result.needsInput) {
      sr.status = "waiting";
      sr.error = result.error;
      emit("waiting", `${sr.title} — ${result.error ?? "needs input"}`, sr.stepId);
    } else if (result.ok) {
      sr.status = "completed";
      sr.summary = result.summary;
      run.outputs[planStep.id] = result.output;
      emit("completed", `${sr.title}${result.summary ? ` — ${result.summary}` : ""}`, sr.stepId);
    } else {
      sr.status = "failed";
      sr.error = result.error;
      emit("failed", `${sr.title} — ${result.error ?? "failed"}`, sr.stepId);
    }
    push();
  }

  run.endedAt = now();
  const failed = run.steps.some((s) => s.status === "failed");
  run.status = failed ? "failed" : "completed";
  emit(failed ? "run-failed" : "run-completed", failed ? "Execution failed" : "Execution complete");
  push();

  return run;
}
