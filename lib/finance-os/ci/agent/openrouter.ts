// OpenRouter web-search path. Reuses the admin-configured OpenRouter key + its
// enabled models, with the built-in `web` plugin so the model searches live and
// returns citations — no separate search key needed.
//
// Resilient auto-selection: enabled OpenRouter models are ranked HEALTH-FIRST
// (known-good before unknown before recently-rate-limited), ties broken by a
// reasoning / size heuristic, then tried in order. Any failure — HTTP error,
// rate-limit (429), timeout, OR an empty response (common on free tiers) — rotates
// to the next model so the agent keeps running. Each attempt is written back to
// the shared health cache so subsequent calls route around busy free models.

import "server-only";
import { resolveCandidates } from "@/lib/llm/store";
import {
  readHealthMap,
  recordHealth,
  HEALTH_TTL_MS,
  BUSY_COOLDOWN_MS,
  type HealthMap,
} from "@/lib/llm/discovery";

export type ORWeb =
  | { ok: true; content: string; citations: { title: string; url: string }[]; model: string }
  | { ok: false; status: number; error: "no_openrouter"; detail?: string }
  | { ok: false; status: number; error: "or_failed"; detail?: string };

type Annotation = { type?: string; url_citation?: { url?: string; title?: string } };

const MAX_ATTEMPTS = 8;

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

// Health tier — lower is tried first. Steers around free models that are busy
// right now instead of hammering the biggest (most contended) ones blind.
//   0 = known healthy (recent ok)   1 = unknown / stale   2 = recently 429'd
function tier(model: string, health: HealthMap, now: number): number {
  const h = health[model];
  if (!h) return 1;
  if (h.status === 429 && now - h.ts < BUSY_COOLDOWN_MS) return 2; // busy
  if (h.ok && now - h.ts < HEALTH_TTL_MS) return 0; // healthy
  return 1; // stale or other → give it another shot
}

export async function openrouterWebChat(
  system: string,
  user: string,
  opts?: { maxResults?: number; maxTokens?: number },
): Promise<ORWeb> {
  const candidates = await resolveCandidates();
  const ors = candidates.filter((c) => c.providerId === "openrouter");
  if (!ors.length) return { ok: false, status: 503, error: "no_openrouter" };

  const health = await readHealthMap();
  const now = Date.now();

  // Rank: health tier first, then score, then stable original order (which keeps
  // the admin default ahead on equal footing). Hard-dead models are dropped.
  const ranked = ors
    .map((c, i) => ({ c, i }))
    .filter((x) => !health[x.c.model]?.dead)
    .sort(
      (a, b) =>
        tier(a.c.model, health, now) - tier(b.c.model, health, now) ||
        score(b.c.model) - score(a.c.model) ||
        a.i - b.i,
    )
    .map((x) => x.c)
    .slice(0, MAX_ATTEMPTS);

  let lastDetail = "";
  let lastStatus = 502;
  for (const c of ranked) {
    const r = await callOnce(c.apiKey, c.model, system, user, opts);
    if (r.ok && r.content.trim()) {
      await recordHealth(c.model, { ok: true, status: 200, dead: false, detail: "" });
      return { ok: true, content: r.content, citations: r.citations, model: c.model };
    }
    // Record the failure so the next call routes around this model.
    if (r.ok) {
      await recordHealth(c.model, { ok: false, status: 200, dead: false, detail: "empty response" });
      lastDetail = `${c.model}: empty response`;
    } else {
      await recordHealth(c.model, { ok: false, status: r.status, dead: false, detail: r.detail.slice(0, 160) });
      lastDetail = `${c.model}: ${r.detail}`;
      lastStatus = r.status;
      // Account-level failures (no credits / bad key / forbidden) are identical
      // for EVERY model — rotating wastes a request per model. Stop immediately
      // so the caller can fall back fast instead of grinding through all 8.
      if (r.status === 401 || r.status === 402 || r.status === 403) {
        return { ok: false, status: r.status, error: "or_failed", detail: lastDetail };
      }
    }
    // rotate to the next model
  }
  return { ok: false, status: lastStatus, error: "or_failed", detail: lastDetail || "all models failed" };
}

async function callOnce(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  opts?: { maxResults?: number; maxTokens?: number },
): Promise<
  | { ok: true; content: string; citations: { title: string; url: string }[] }
  | { ok: false; status: number; detail: string }
> {
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
      return { ok: false, status: res.status, detail: `${res.status} ${detail}` };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string; annotations?: Annotation[] } }[] };
    const msg = data.choices?.[0]?.message;
    const citations = (msg?.annotations ?? [])
      .filter((a) => a.type === "url_citation" && a.url_citation?.url)
      .map((a) => ({ title: a.url_citation!.title ?? a.url_citation!.url!, url: a.url_citation!.url! }));
    return { ok: true, content: msg?.content ?? "", citations };
  } catch (err) {
    return { ok: false, status: 0, detail: (err as Error).message };
  }
}
