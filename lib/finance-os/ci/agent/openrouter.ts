// OpenRouter web-search path. Reuses the admin-configured OpenRouter key + its
// enabled models, with the built-in `web` plugin so the model searches live and
// returns citations — no separate search key needed.
//
// Resilient auto-selection: enabled OpenRouter models are ranked (reasoning /
// size heuristics) best-first, then tried in order. Any failure — HTTP error,
// rate-limit (429), timeout, OR an empty response (common on free tiers) — rotates
// to the next model so the agent keeps running. Returns the first good answer.

import "server-only";
import { resolveCandidates } from "@/lib/llm/store";

export type ORWeb =
  | { ok: true; content: string; citations: { title: string; url: string }[]; model: string }
  | { ok: false; status: number; error: "no_openrouter"; detail?: string }
  | { ok: false; status: number; error: "or_failed"; detail?: string };

type Annotation = { type?: string; url_citation?: { url?: string; title?: string } };

const MAX_ATTEMPTS = 6;

// Heuristic "most suitable" score: prefer stronger-reasoning / larger free models.
function score(model: string): number {
  const m = model.toLowerCase();
  let s = 0;
  if (/(r1|reason|think)/.test(m)) s += 4;
  if (/(deepseek|gpt-oss)/.test(m)) s += 3;
  if (/(235b|120b|70b|72b|90b)/.test(m)) s += 3;
  else if (/(32b|30b|27b)/.test(m)) s += 2;
  if (/(qwen|llama-3\.3|llama-3\.1)/.test(m)) s += 1;
  if (/(mini|small|tiny|1b|3b)/.test(m)) s -= 1; // fast but weaker logic
  return s;
}

export async function openrouterWebChat(
  system: string,
  user: string,
  opts?: { maxResults?: number; maxTokens?: number },
): Promise<ORWeb> {
  const candidates = await resolveCandidates();
  const ors = candidates.filter((c) => c.providerId === "openrouter");
  if (!ors.length) return { ok: false, status: 503, error: "no_openrouter" };

  // Rank best-first but keep a stable order for ties (resolveCandidates already
  // puts the admin default first, which we respect on equal score).
  const ranked = ors
    .map((c, i) => ({ c, i }))
    .sort((a, b) => score(b.c.model) - score(a.c.model) || a.i - b.i)
    .map((x) => x.c)
    .slice(0, MAX_ATTEMPTS);

  let lastDetail = "";
  for (const c of ranked) {
    const r = await callOnce(c.apiKey, c.model, system, user, opts);
    if (r.ok && r.content.trim()) {
      return { ok: true, content: r.content, citations: r.citations, model: c.model };
    }
    lastDetail = r.ok ? `${c.model}: empty response` : `${c.model}: ${r.detail}`;
    // rotate to the next model
  }
  return { ok: false, status: 502, error: "or_failed", detail: lastDetail || "all models failed" };
}

async function callOnce(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  opts?: { maxResults?: number; maxTokens?: number },
): Promise<{ ok: true; content: string; citations: { title: string; url: string }[] } | { ok: false; detail: string }> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "NEXERA Ledger" },
      body: JSON.stringify({
        model,
        plugins: [{ id: "web", max_results: opts?.maxResults ?? 6 }],
        max_tokens: opts?.maxTokens ?? 1800,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 160);
      return { ok: false, detail: `${res.status} ${detail}` };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string; annotations?: Annotation[] } }[] };
    const msg = data.choices?.[0]?.message;
    const citations = (msg?.annotations ?? [])
      .filter((a) => a.type === "url_citation" && a.url_citation?.url)
      .map((a) => ({ title: a.url_citation!.title ?? a.url_citation!.url!, url: a.url_citation!.url! }));
    return { ok: true, content: msg?.content ?? "", citations };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}
