/**
 * Agent Platform — reusable runtime lifecycle.
 *
 * ONE canonical state machine that every future agent + run will share.
 * This file defines the vocabulary only — no execution, no orchestration,
 * no side effects. Phase 1A foundation.
 */

export type RuntimeState =
  | "idle"
  | "queued"
  | "planning"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "retrying"
  | "cancelled";

/** Canonical ordering of the lifecycle (used for legends / pickers). */
export const RUNTIME_STATES: RuntimeState[] = [
  "idle",
  "queued",
  "planning",
  "running",
  "waiting",
  "completed",
  "failed",
  "retrying",
  "cancelled",
];

export type RuntimeTone = "neutral" | "info" | "active" | "warn" | "good" | "bad";

export type RuntimeStateMeta = {
  label: string;
  /** Short description of what the state means. */
  desc: string;
  /** Hex accent for dots / pills (light Command Center palette). */
  color: string;
  tone: RuntimeTone;
};

export const RUNTIME_META: Record<RuntimeState, RuntimeStateMeta> = {
  idle: { label: "Idle", desc: "Registered, nothing scheduled.", color: "#94a3b8", tone: "neutral" },
  queued: { label: "Queued", desc: "Accepted, awaiting a runner.", color: "#8b5cf6", tone: "info" },
  planning: { label: "Planning", desc: "Decomposing the task into steps.", color: "#6366f1", tone: "info" },
  running: { label: "Running", desc: "Executing steps.", color: "#2563eb", tone: "active" },
  waiting: { label: "Waiting", desc: "Paused on input or a dependency.", color: "#f59e0b", tone: "warn" },
  completed: { label: "Completed", desc: "Finished successfully.", color: "#10b981", tone: "good" },
  failed: { label: "Failed", desc: "Stopped on an unrecoverable error.", color: "#ef4444", tone: "bad" },
  retrying: { label: "Retrying", desc: "Re-attempting after a failure.", color: "#f97316", tone: "warn" },
  cancelled: { label: "Cancelled", desc: "Stopped by the operator.", color: "#6b7280", tone: "neutral" },
};

/** States in which the agent is doing work right now. */
export const ACTIVE_STATES: RuntimeState[] = ["queued", "planning", "running", "waiting", "retrying"];

/** States from which no further transition happens without a new trigger. */
export const TERMINAL_STATES: RuntimeState[] = ["completed", "failed", "cancelled"];

export const isActiveState = (s: RuntimeState): boolean => ACTIVE_STATES.includes(s);
export const isTerminalState = (s: RuntimeState): boolean => TERMINAL_STATES.includes(s);

/** Agent operational health — independent of the runtime state of any single run. */
export type AgentHealth = "healthy" | "degraded" | "down" | "unknown";

export const HEALTH_META: Record<AgentHealth, { label: string; color: string }> = {
  healthy: { label: "Healthy", color: "#10b981" },
  degraded: { label: "Degraded", color: "#f59e0b" },
  down: { label: "Down", color: "#ef4444" },
  unknown: { label: "Unknown", color: "#94a3b8" },
};

/** Who may see / invoke an agent. */
export type AgentVisibility = "public" | "internal" | "beta";

export const VISIBILITY_META: Record<AgentVisibility, { label: string }> = {
  public: { label: "Public" },
  internal: { label: "Internal" },
  beta: { label: "Beta" },
};
