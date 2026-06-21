// Server-only Tavily web-search helper, shared by the research + discovery routes.

import "server-only";
import { getSearchKey } from "./search-key";

export type TavilyResult = { title: string; url: string; content: string; raw_content?: string };

export type TavilyOutcome =
  | { ok: true; results: TavilyResult[] }
  | { ok: false; status: number; error: "search_key_missing" | "search_failed"; detail?: string };

export async function tavilySearch(query: string, maxResults = 8): Promise<TavilyOutcome> {
  const key = await getSearchKey();
  if (!key) return { ok: false, status: 503, error: "search_key_missing" };
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, search_depth: "advanced", max_results: maxResults, include_raw_content: true }),
    });
    if (!r.ok) {
      const detail = (await r.text().catch(() => "")).slice(0, 200);
      return { ok: false, status: 502, error: "search_failed", detail };
    }
    const data = (await r.json()) as { results?: TavilyResult[] };
    return { ok: true, results: data.results ?? [] };
  } catch (err) {
    return { ok: false, status: 502, error: "search_failed", detail: (err as Error).message };
  }
}
