// Unified web-research resolver. Default backend = OpenRouter's web plugin (reuses
// the existing key, auto-rotates free models). If a Tavily key is configured it
// overrides (dedicated search → LLM extraction) for deeper source control.

import "server-only";
import { completeWithFallback } from "@/lib/llm/infer";
import { tavilySearch } from "./tavily";
import { searchKeyStatus } from "./search-key";
import { openrouterWebChat } from "./openrouter";

export type AgentOutcome =
  | { ok: true; text: string; sources: { title: string; url: string }[]; model: string; backend: "tavily" | "openrouter"; estimated: boolean }
  | { ok: false; status: number; error: string; detail?: string };

export async function runWebAgent(input: {
  system: string;
  user: string;
  searchQuery: string;
  maxResults?: number;
  maxTokens?: number;
  // Used ONLY when live search is unavailable (no credits / no Tavily). Lets the
  // caller swap in a system prompt that permits model-knowledge answers (flagged
  // as estimates) instead of returning empty. Omit to keep the strict behaviour.
  fallbackSystem?: string;
}): Promise<AgentOutcome> {
  const tav = await searchKeyStatus();

  // Tavily override (configured key) → search then extract.
  if (tav.hasKey) {
    const s = await tavilySearch(input.searchQuery, input.maxResults ?? 8);
    if (!s.ok) return { ok: false, status: s.status, error: s.error, detail: s.detail };
    if (!s.results.length) return { ok: true, text: "", sources: [], model: "none", backend: "tavily", estimated: false };
    const sources = s.results.map((r) => ({ title: r.title, url: r.url }));
    const context = s.results
      .map((r, i) => `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.raw_content || r.content || "").slice(0, 2200)}`)
      .join("\n\n---\n\n");
    const out = await completeWithFallback(input.system, [{ role: "user", content: `${input.user}\n\nSearch results:\n\n${context}` }], undefined, { maxTokens: input.maxTokens ?? 1800 });
    if (!out) return { ok: false, status: 503, error: "no_provider" };
    return { ok: true, text: out.text, sources, model: out.model, backend: "tavily", estimated: false };
  }

  // Default: OpenRouter web plugin (one call does search + answer).
  const or = await openrouterWebChat(input.system, `${input.user}\n\n(Use web search for current facts. Query: ${input.searchQuery})`, {
    maxResults: input.maxResults ?? 6,
    maxTokens: input.maxTokens ?? 1800,
  });
  if (or.ok) {
    return { ok: true, text: or.content, sources: or.citations, model: or.model, backend: "openrouter", estimated: false };
  }

  // Every live-search path failed (no OpenRouter credits / free tier busy, no
  // Tavily key). Rather than dead-end, fall back to a plain completion across ALL
  // providers (OpenRouter / Gemini) using the caller's fallbackSystem when given
  // — model knowledge, no citations. Flagged estimated:true so the UI warns the
  // figures are not live-sourced.
  const fb = await completeWithFallback(
    input.fallbackSystem ?? input.system,
    [
      {
        role: "user",
        content: `${input.user}\n\n(Live web search is unavailable right now — answer from your own knowledge. These figures are ESTIMATES, not live-sourced; flag them as such.)`,
      },
    ],
    undefined,
    { maxTokens: input.maxTokens ?? 1800 },
  );
  if (fb && fb.provider !== "none" && fb.text.trim()) {
    return { ok: true, text: fb.text, sources: [], model: `${fb.model} (estimate)`, backend: "openrouter", estimated: true };
  }

  return { ok: false, status: or.status, error: or.error === "no_openrouter" ? "no_search_backend" : or.error, detail: or.detail };
}
