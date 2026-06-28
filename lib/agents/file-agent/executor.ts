/**
 * File Agent executor (Phase 4) — the first executable agent.
 *
 * Implements the common AgentExecutor interface by calling the existing File
 * Agent endpoint (/api/agents/file), which reuses the shared extraction
 * pipeline. Read-only. No business logic.
 */

import type { AgentExecutor, AgentExecutionContext, AgentResult } from "@/lib/agents/executor";
import type { FileAgentContext } from "./types";

export const fileAgentExecutor: AgentExecutor<FileAgentContext> = {
  agentId: "file",
  async execute(ctx: AgentExecutionContext): Promise<AgentResult<FileAgentContext>> {
    const files = ctx.input.files ?? [];
    if (files.length === 0) {
      return {
        ok: false,
        needsInput: true,
        error: "No files attached — attach files to run the File Agent.",
      };
    }
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("file", f));
      const res = await fetch("/api/agents/file", { method: "POST", body: fd }).then((r) => r.json());
      if (res.error) return { ok: false, error: res.error };
      const context = res.context as FileAgentContext;
      return { ok: true, output: context, summary: context.summary };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  },
};
