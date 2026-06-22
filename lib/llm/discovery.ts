// Shared free-model discovery + health logic used by the sync route, the
// "refresh on chat open" endpoint and the admin health check.

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { PRESET_BY_ID } from "./providers";
import { getKey, listMasked, upsertProvider } from "./store";
import { kvEnabled, kvGetJSON, kvSetJSON } from "./kv";

// Free ids that aren't usable chat models (guardrail / classifier endpoints).
const SKIP = [/content-safety/i, /moderation/i, /guard/i];

const DIR = path.join(process.cwd(), ".rak");
const HEALTH_FILE = path.join(DIR, "health.json");
const HEALTH_KV_KEY = "rak:health";

// How long a health result is trusted before we re-ping (protects the daily
// free-request quota — we don't want to "Hi" every model on every chat open).
export const HEALTH_TTL_MS = 12 * 60 * 60 * 1000; // 12h

export type HealthEntry = {
  ok: boolean;
  status: number;
  dead: boolean; // hard failure (4xx ≠ 429) — safe to prune
  detail: string;
  ts: number;
};
export type HealthMap = Record<string, HealthEntry>;

async function readHealth(): Promise<HealthMap> {
  if (kvEnabled()) {
    return (await kvGetJSON<HealthMap>(HEALTH_KV_KEY)) ?? {};
  }
  try {
    return JSON.parse(await fs.readFile(HEALTH_FILE, "utf8")) as HealthMap;
  } catch {
    return {};
  }
}
// Best-effort: health is a cache, never let a write failure (e.g. Vercel's
// read-only disk) bubble up and break sync/inference.
async function writeHealth(h: HealthMap): Promise<void> {
  try {
    if (kvEnabled()) {
      await kvSetJSON(HEALTH_KV_KEY, h);
      return;
    }
    await fs.mkdir(DIR, { recursive: true });
    await fs.writeFile(HEALTH_FILE, JSON.stringify(h, null, 2), "utf8");
  } catch {
    /* health cache is best-effort */
  }
}

// A free model that just 429'd is treated as "busy" for this window — live
// routers deprioritize it until it cools down (shorter than HEALTH_TTL_MS so a
// transient rate-limit doesn't sideline a model for 12h).
export const BUSY_COOLDOWN_MS = 5 * 60 * 1000; // 5m

/** Public read of the cached health map — lets live routers bias model choice. */
export async function readHealthMap(): Promise<HealthMap> {
  return readHealth();
}

/**
 * Merge one live health observation and persist. Best-effort: health is a cache,
 * never block inference on a write failure. Called by routers after each real
 * request so "busy" state reflects live load, not just the 12h ping.
 */
export async function recordHealth(
  model: string,
  entry: Omit<HealthEntry, "ts">,
): Promise<void> {
  try {
    const h = await readHealth();
    h[model] = { ...entry, ts: Date.now() };
    await writeHealth(h);
  } catch {
    /* health cache is best-effort */
  }
}

// Lists every ":free" model on an OpenAI-compatible gateway, minus classifiers.
export async function fetchFreeIds(providerId = "openrouter"): Promise<string[]> {
  const preset = PRESET_BY_ID[providerId];
  if (!preset || preset.kind !== "openai") return [];
  const key = (await getKey(providerId)) || "";
  if (!key) return [];

  const res = await fetch(`${preset.baseUrl}/models`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  const all: string[] = Array.isArray(data?.data)
    ? data.data.map((m: { id?: string }) => m?.id).filter(Boolean)
    : [];
  return all
    .filter((id) => id.endsWith(":free"))
    .filter((id) => !SKIP.some((re) => re.test(id)))
    .sort();
}

// Pings one model with "Hi". dead = the model itself is broken (bad id, gone,
// auth) → prune. A 429 is transient (rate-limited), NOT dead → keep.
async function ping(
  providerId: string,
  model: string,
): Promise<{ ok: boolean; status: number; dead: boolean; detail: string }> {
  const preset = PRESET_BY_ID[providerId];
  const key = (await getKey(providerId)) || "";
  if (!preset || !key) return { ok: false, status: 0, dead: false, detail: "no key" };

  try {
    const res = await fetch(`${preset.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(preset.extraHeaders ?? {}),
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    if (res.ok) {
      const j = await res.json().catch(() => null);
      const ok = Boolean(j?.choices?.length);
      return { ok, status: 200, dead: !ok, detail: ok ? "" : "empty response" };
    }
    const detail = (await res.text().catch(() => "")).slice(0, 160);
    // 429 = rate-limited (keep). 4xx/5xx otherwise = broken model (prune).
    const dead = res.status !== 429 && res.status >= 400 && res.status < 500;
    return { ok: false, status: res.status, dead, detail: `${res.status} ${detail}` };
  } catch (e) {
    return { ok: false, status: 0, dead: false, detail: (e as Error).message };
  }
}

export type RefreshReport = {
  found: number; // :free ids discovered
  enabled: number; // models enabled after prune
  checked: number; // models pinged this run
  okModels: string[];
  rateLimited: string[];
  pruned: string[]; // removed as dead this run
  knownDead: number;
};

// Core routine: discover free models, sync them into the provider, health-check
// (respecting TTL unless forced), prune the hard-dead.
export async function refreshFreeModels(opts: {
  providerId?: string;
  forceHealth?: boolean;
  runHealth?: boolean; // if false, sync only (no quota spend)
}): Promise<RefreshReport> {
  const providerId = opts.providerId ?? "openrouter";
  const health = await readHealth();
  const now = Date.now();

  const freeIds = await fetchFreeIds(providerId);

  // Preserve manually-added non-":free" picks (e.g. openrouter/free router).
  const state = await listMasked();
  const existing =
    state.providers.find((p) => p.providerId === providerId)?.models ?? [];
  const manual = existing.filter((m) => !m.endsWith(":free"));

  // Discovery failed (gateway down / rate-limited → empty list). DO NOT wipe the
  // saved catalog — leave the existing models untouched and report a no-op.
  if (freeIds.length === 0) {
    return {
      found: 0,
      enabled: existing.length,
      checked: 0,
      okModels: [],
      rateLimited: [],
      pruned: [],
      knownDead: 0,
    };
  }

  const deadSet = new Set(
    Object.entries(health)
      .filter(([, h]) => h.dead)
      .map(([m]) => m),
  );

  // Health check (optional / TTL-gated).
  const okModels: string[] = [];
  const rateLimited: string[] = [];
  const pruned: string[] = [];
  let checked = 0;

  if (opts.runHealth !== false) {
    const toCheck = freeIds.filter((m) => {
      if (opts.forceHealth) return true;
      const h = health[m];
      return !h || now - h.ts > HEALTH_TTL_MS;
    });
    const results = await Promise.all(
      toCheck.map(async (m) => ({ m, r: await ping(providerId, m) })),
    );
    checked = results.length;
    for (const { m, r } of results) {
      health[m] = {
        ok: r.ok,
        status: r.status,
        dead: r.dead,
        detail: r.detail,
        ts: now,
      };
      if (r.dead) deadSet.add(m);
      else deadSet.delete(m);
    }
    await writeHealth(health);
  }

  // Classify for the report based on latest known health.
  for (const m of freeIds) {
    const h = health[m];
    if (h?.dead) pruned.push(m);
    else if (h?.ok) okModels.push(m);
    else if (h?.status === 429) rateLimited.push(m);
  }

  // Enabled = manual picks + all discovered free models that aren't hard-dead.
  const enabledModels = Array.from(
    new Set([...manual, ...freeIds.filter((m) => !deadSet.has(m))]),
  );
  await upsertProvider({ providerId, models: enabledModels, enabled: true });

  return {
    found: freeIds.length,
    enabled: enabledModels.length,
    checked,
    okModels,
    rateLimited,
    pruned,
    knownDead: deadSet.size,
  };
}
