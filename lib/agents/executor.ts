/**
 * Agent execution interface (Phase 4).
 *
 * Every executable agent exposes the same shape: execute(context) → AgentResult.
 * Hermes coordinates agents through this seam and never knows implementation
 * details. Only implemented agents register here — currently the File Agent.
 */

import type { WorkspaceContextSnapshot } from "@/lib/workspace/model";

/** Read-only context handed to an agent at execution time. */
export type AgentExecutionContext = {
  agentId: string;
  stepId: string;
  /** AI capabilities the step requested (Router decides the model downstream). */
  capabilities: string[];
  /** Tool Registry ids resolved for this step. */
  tools: string[];
  input: {
    goal: string;
    /** Uploaded files for this run (browser File objects). */
    files?: File[];
    workspace?: WorkspaceContextSnapshot | null;
    /** Outputs collected from prior completed steps, keyed by step id. */
    prior?: Record<string, unknown>;
  };
};

/** Normalized result every agent returns. Hermes reads this, not internals. */
export type AgentResult<TOutput = unknown> = {
  ok: boolean;
  output?: TOutput;
  summary?: string;
  error?: string;
  /** Agent ran but needs input it didn't get (observable, not a failure). */
  needsInput?: boolean;
};

/** Common interface every executable agent implements. */
export interface AgentExecutor<TOutput = unknown> {
  readonly agentId: string;
  execute(context: AgentExecutionContext): Promise<AgentResult<TOutput>>;
}
