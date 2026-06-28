/**
 * Commentary Agent executor (Phase 6) — third executable agent.
 *
 * Consumes the Finance Agent's FinanceInsights from prior step outputs (never
 * re-reads files) and calls /api/agents/commentary. When Hermes runs a plan
 * where the Finance Agent ran first, its insights are available in
 * ctx.input.prior and this executor picks them up automatically.
 */

import type { AgentExecutor, AgentExecutionContext, AgentResult } from "@/lib/agents/executor";
import type { FinanceInsights } from "@/lib/agents/finance-agent/types";
import type { CommentaryOutput } from "./types";

function findInsights(prior?: Record<string, unknown>): FinanceInsights | null {
  for (const v of Object.values(prior ?? {})) {
    if (v && typeof v === "object" && typeof (v as { financialSummary?: unknown }).financialSummary === "string") {
      return v as FinanceInsights;
    }
  }
  return null;
}

export const commentaryAgentExecutor: AgentExecutor<CommentaryOutput> = {
  agentId: "commentary",
  async execute(ctx: AgentExecutionContext): Promise<AgentResult<CommentaryOutput>> {
    const insights = findInsights(ctx.input.prior);
    if (!insights) {
      return {
        ok: false,
        needsInput: true,
        error: "No FinanceInsights available — run the Finance Agent first.",
      };
    }
    try {
      const res = await fetch("/api/agents/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insights,
          audience: "Chief Financial Officer",
          tone: "Executive",
          format: "Monthly Business Review",
        }),
      }).then((r) => r.json());
      if (res.error) return { ok: false, error: res.error };
      const commentary = res.commentary as CommentaryOutput;
      return {
        ok: true,
        output: commentary,
        summary: `${commentary.sections.length}-section ${commentary.format} for ${commentary.audience}.`,
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
