/**
 * Finance Agent executor (Phase 5) — second executable agent.
 *
 * Implements the common AgentExecutor interface by calling /api/agents/finance,
 * which reuses the extraction pipeline + AI Router. Read-only reasoning; hands
 * off to downstream agents via suggestedNextAgents (Hermes decides).
 */

import type { AgentExecutor, AgentExecutionContext, AgentResult } from "@/lib/agents/executor";
import type { FinanceInsights } from "./types";

export const financeAgentExecutor: AgentExecutor<FinanceInsights> = {
  agentId: "finance",
  async execute(ctx: AgentExecutionContext): Promise<AgentResult<FinanceInsights>> {
    const files = ctx.input.files ?? [];
    if (files.length === 0) {
      return {
        ok: false,
        needsInput: true,
        error: "No financial files attached — attach Excel/CSV/statements to run the Finance Agent.",
      };
    }
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("file", f));
      const res = await fetch("/api/agents/finance", { method: "POST", body: fd }).then((r) => r.json());
      if (res.error) return { ok: false, error: res.error };
      const insights = res.insights as FinanceInsights;
      return { ok: true, output: insights, summary: insights.financialSummary };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
