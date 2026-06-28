/**
 * Stock Agent executor (Investment Hub Phase 1) — fourth executable agent.
 *
 * Registered under agent id "market". Resolves a ticker from the goal and calls
 * /api/agents/stock, which pulls normalized data from the Market Intelligence
 * Tool (mocked) and reasons via the AI Router. No direct provider calls.
 */

import type { AgentExecutor, AgentExecutionContext, AgentResult } from "@/lib/agents/executor";
import type { InvestmentInsights } from "./types";

const STOPWORDS = new Set(["A", "I", "THE", "AND", "FOR", "ON", "OF", "IS", "TO", "ANALYZE", "STOCK", "RESEARCH"]);

function extractTicker(goal: string): string | null {
  const dollar = goal.match(/\$([A-Za-z]{1,6})/);
  if (dollar) return dollar[1].toUpperCase();
  const upper = goal.match(/\b[A-Z]{2,6}\b/g)?.filter((t) => !STOPWORDS.has(t));
  if (upper && upper.length) return upper[0];
  return null;
}

export const stockAgentExecutor: AgentExecutor<InvestmentInsights> = {
  agentId: "market",
  async execute(ctx: AgentExecutionContext): Promise<AgentResult<InvestmentInsights>> {
    const ticker = extractTicker(ctx.input.goal ?? "");
    if (!ticker) {
      return {
        ok: false,
        needsInput: true,
        error: "No ticker found in the goal — include a ticker like $AAPL or AAPL.",
      };
    }
    try {
      const res = await fetch("/api/agents/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      }).then((r) => r.json());
      if (res.error) return { ok: false, error: res.error };
      const insights = res.insights as InvestmentInsights;
      return { ok: true, output: insights, summary: `${insights.company} (${insights.ticker}) research prepared.` };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
