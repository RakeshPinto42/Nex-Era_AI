/**
 * Hermes — Execution Plan structures (Phase 2).
 *
 * Reusable, observable plan representation. Every future NEX·ERA workflow
 * (Finance OS, Investment Hub, Language OS, Workspace, Research, …) begins as
 * one of these plans. Structure only — no execution.
 */

import type { AICapability } from "./capabilities";

/** Shared execution lifecycle Hermes tracks. */
export type ExecutionStatus =
  | "pending"
  | "planning"
  | "ready"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled";

export const EXECUTION_STATES: ExecutionStatus[] = [
  "pending",
  "planning",
  "ready",
  "running",
  "waiting",
  "completed",
  "failed",
  "cancelled",
];

export const EXECUTION_META: Record<ExecutionStatus, { label: string; color: string }> = {
  pending: { label: "Pending", color: "#94a3b8" },
  planning: { label: "Planning", color: "#6366f1" },
  ready: { label: "Ready", color: "#2563eb" },
  running: { label: "Running", color: "#0ea5e9" },
  waiting: { label: "Waiting", color: "#f59e0b" },
  completed: { label: "Completed", color: "#10b981" },
  failed: { label: "Failed", color: "#ef4444" },
  cancelled: { label: "Cancelled", color: "#6b7280" },
};

export type Complexity = "low" | "medium" | "high";

export const COMPLEXITY_META: Record<Complexity, { label: string; color: string }> = {
  low: { label: "Low", color: "#10b981" },
  medium: { label: "Medium", color: "#f59e0b" },
  high: { label: "High", color: "#ef4444" },
};

/** One unit of work in a plan. Estimated only — not executed in Phase 2. */
export type PlanStep = {
  id: string;
  title: string;
  description: string;
  /** Agent Registry id chosen by discovery, or null if none matched. */
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  /** Tool Registry ids discovered for this step. */
  requiredTools: string[];
  /** AI capabilities this step requests from the Router. */
  requiredCapabilities: AICapability[];
  /** Step ids that must complete first. */
  dependencies: string[];
  /** Estimated status (pending/ready) — Hermes does not run it yet. */
  status: ExecutionStatus;
  /** Declared output artifact names. */
  outputs: string[];
};

export type TimelineEvent = {
  id: string;
  at: string; // ISO
  label: string;
  detail?: string;
};

/** The full, observable execution plan produced by Hermes. */
export type ExecutionPlan = {
  id: string;
  goal: string;
  intent: string;
  summary: string;
  status: ExecutionStatus;
  complexity: Complexity;
  complexityScore: number;
  steps: PlanStep[];
  /** Unique Agent Registry ids assigned across the plan. */
  agents: string[];
  /** Unique Tool Registry ids selected across the plan. */
  tools: string[];
  /** Unique AI capabilities requested across the plan. */
  capabilities: AICapability[];
  createdAt: string; // ISO
  timeline: TimelineEvent[];
};
