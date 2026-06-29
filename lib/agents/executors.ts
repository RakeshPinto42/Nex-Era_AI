/**
 * Executable agent registry (Phase 4).
 *
 * Maps Agent Registry ids → AgentExecutor implementations. Only IMPLEMENTED
 * agents appear here; everything else is plan-only and gets skipped at run
 * time. Hermes resolves executors from this map — never hardcoded.
 */

import type { AgentExecutor } from "./executor";
import { fileAgentExecutor } from "./file-agent/executor";
import { financeAgentExecutor } from "./finance-agent/executor";
import { commentaryAgentExecutor } from "./commentary-agent/executor";
import { stockAgentExecutor } from "./stock-agent/executor";
import { factoryExecutor, investmentsImproverExecutor, germanTutorExecutor } from "./self-improve-executors";

const EXECUTORS: Record<string, AgentExecutor> = {
  file: fileAgentExecutor,
  finance: financeAgentExecutor,
  commentary: commentaryAgentExecutor,
  market: stockAgentExecutor,
  factory: factoryExecutor,
  "investments-improver": investmentsImproverExecutor,
  "german-tutor": germanTutorExecutor,
};

export function getExecutor(agentId: string | null | undefined): AgentExecutor | undefined {
  return agentId ? EXECUTORS[agentId] : undefined;
}

export function isExecutable(agentId: string | null | undefined): boolean {
  return !!getExecutor(agentId);
}

export function executableAgentIds(): string[] {
  return Object.keys(EXECUTORS);
}
