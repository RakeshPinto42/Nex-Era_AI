// Server-side key store. Persists to a gitignored JSON file under the project.
// SECURITY: keys are stored plaintext at rest — acceptable for local/single
// user, NOT for shared production. Use a secrets manager (Vault, SSM, Doppler)
// there. Keys are never returned to the client unmasked.

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { PRESET_BY_ID, PRESETS } from "./providers";

export type ProviderConfig = {
  providerId: string;
  apiKey: string;
  enabled: boolean;
  /** Model ids the admin enabled for this provider. */
  models: string[];
};

export type StoreData = {
  providers: ProviderConfig[];
  defaultProviderId: string | null;
  defaultModel: string | null;
};

export type MaskedConfig = Omit<ProviderConfig, "apiKey"> & {
  keyMask: string;
  hasKey: boolean;
};

const DIR = path.join(process.cwd(), ".rak");
const FILE = path.join(DIR, "providers.json");

const EMPTY: StoreData = {
  providers: [],
  defaultProviderId: null,
  defaultModel: null,
};

async function read(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return { ...EMPTY, ...(JSON.parse(raw) as StoreData) };
  } catch {
    return { ...EMPTY };
  }
}

// Provider keys can also come from env vars — the production path (e.g. Vercel,
// where the .rak disk store is read-only). One var per provider.
const ENV_KEYS: Record<string, string> = {
  openrouter: "OPENROUTER_API_KEY",
  groq: "GROQ_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
  google: "GOOGLE_API_KEY",
};

function envProviders(): ProviderConfig[] {
  const out: ProviderConfig[] = [];
  for (const [pid, env] of Object.entries(ENV_KEYS)) {
    const key = process.env[env];
    if (!key) continue;
    const preset = PRESET_BY_ID[pid];
    if (!preset) continue;
    out.push({
      providerId: pid,
      apiKey: key,
      enabled: true,
      models: preset.models.map((m) => m.id),
    });
  }
  return out;
}

// Disk store + env providers, for the read/resolve paths only (NOT mutations —
// env keys must never be written to disk). Disk config wins; env fills the rest.
async function readMerged(): Promise<StoreData> {
  const disk = await read();
  const envs = envProviders();
  if (!envs.length) return disk;
  const byId = new Map(disk.providers.map((p) => [p.providerId, p]));
  for (const e of envs) if (!byId.has(e.providerId)) byId.set(e.providerId, e);
  const providers = [...byId.values()];
  let { defaultProviderId, defaultModel } = disk;
  if (!defaultProviderId && providers.length) {
    defaultProviderId = providers[0].providerId;
    defaultModel = providers[0].models[0] ?? null;
  }
  return { providers, defaultProviderId, defaultModel };
}

async function write(data: StoreData): Promise<void> {
  try {
    await fs.mkdir(DIR, { recursive: true });
    // Atomic write: tmp file + rename so a crash mid-write can't truncate config.
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, FILE);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      throw new Error(
        "Key storage is read-only here (e.g. Vercel). Configure provider keys via environment variables (OPENROUTER_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, GOOGLE_API_KEY) instead.",
      );
    }
    throw e;
  }
}

// Serializes read-modify-write mutations so concurrent callers (e.g. the
// chat-open refresh racing an admin save) can't clobber each other's updates.
let mutationLock: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = mutationLock.then(fn, fn);
  mutationLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function mask(c: ProviderConfig): MaskedConfig {
  const { apiKey, ...rest } = c;
  return { ...rest, keyMask: maskKey(apiKey), hasKey: Boolean(apiKey) };
}

// ---- public API (server-only) ----

export async function listMasked(): Promise<{
  providers: MaskedConfig[];
  defaultProviderId: string | null;
  defaultModel: string | null;
}> {
  const d = await read();
  return {
    providers: d.providers.map(mask),
    defaultProviderId: d.defaultProviderId,
    defaultModel: d.defaultModel,
  };
}

export async function upsertProvider(input: {
  providerId: string;
  apiKey?: string;
  enabled?: boolean;
  models?: string[];
}): Promise<MaskedConfig> {
  if (!PRESET_BY_ID[input.providerId]) {
    throw new Error(`Unknown provider: ${input.providerId}`);
  }
  return withLock(async () => {
    const d = await read();
    const existing = d.providers.find((p) => p.providerId === input.providerId);

    const next: ProviderConfig = {
      providerId: input.providerId,
      // Keep prior key if the caller didn't send a new one (avoids wiping on edit).
      apiKey:
        input.apiKey && input.apiKey.trim()
          ? input.apiKey.trim()
          : existing?.apiKey ?? "",
      enabled: input.enabled ?? existing?.enabled ?? true,
      models: input.models ?? existing?.models ?? [],
    };

    d.providers = [
      ...d.providers.filter((p) => p.providerId !== input.providerId),
      next,
    ];

    // First configured provider becomes default automatically.
    if (!d.defaultProviderId && next.apiKey) {
      d.defaultProviderId = next.providerId;
      d.defaultModel = next.models[0] ?? null;
    }
    await write(d);
    return mask(next);
  });
}

export async function removeProvider(providerId: string): Promise<void> {
  return withLock(async () => {
    const d = await read();
    d.providers = d.providers.filter((p) => p.providerId !== providerId);
    if (d.defaultProviderId === providerId) {
      d.defaultProviderId = d.providers[0]?.providerId ?? null;
      d.defaultModel = d.providers[0]?.models[0] ?? null;
    }
    await write(d);
  });
}

export async function setDefault(
  providerId: string,
  model: string,
): Promise<void> {
  return withLock(async () => {
    const d = await read();
    if (!d.providers.find((p) => p.providerId === providerId)) {
      throw new Error("Provider not configured");
    }
    d.defaultProviderId = providerId;
    d.defaultModel = model;
    await write(d);
  });
}

/** Server-only: resolve the active provider + key for inference. */
export async function resolveActive(): Promise<{
  providerId: string;
  apiKey: string;
  model: string;
} | null> {
  const d = await readMerged();
  const id = d.defaultProviderId;
  if (!id) return null;
  const cfg = d.providers.find((p) => p.providerId === id);
  if (!cfg || !cfg.enabled || !cfg.apiKey) return null;
  return {
    providerId: id,
    apiKey: cfg.apiKey,
    model: d.defaultModel ?? cfg.models[0] ?? "",
  };
}

export type Candidate = { providerId: string; apiKey: string; model: string };

/** OpenRouter free-tier models carry the `:free` suffix (e.g. `…:free`). */
export const isFreeModel = (model: string): boolean => /:free\b/i.test(model);

/**
 * Server-only: ordered inference candidates for fallback. The configured
 * default (provider+model) comes first, then its sibling models, then every
 * other enabled provider's models. Lets the copilot hop to a live provider
 * when the primary returns 429 / quota errors.
 */
export async function resolveCandidates(): Promise<Candidate[]> {
  const d = await readMerged();
  const usable = d.providers.filter((p) => p.enabled && p.apiKey && p.models.length);

  // Default provider first, others after (stable order otherwise).
  const ordered = [...usable].sort((a, b) => {
    if (a.providerId === d.defaultProviderId) return -1;
    if (b.providerId === d.defaultProviderId) return 1;
    return 0;
  });

  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const cfg of ordered) {
    // Within the default provider, put the chosen default model first.
    const models =
      cfg.providerId === d.defaultProviderId && d.defaultModel
        ? [d.defaultModel, ...cfg.models.filter((m) => m !== d.defaultModel)]
        : cfg.models;
    for (const model of models) {
      const k = `${cfg.providerId}::${model}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ providerId: cfg.providerId, apiKey: cfg.apiKey, model });
    }
  }
  return out;
}

/** Server-only: raw key lookup for a specific provider (e.g. connection test). */
export async function getKey(providerId: string): Promise<string | null> {
  const d = await readMerged();
  return d.providers.find((p) => p.providerId === providerId)?.apiKey ?? null;
}

export type AvailableModel = {
  providerId: string;
  providerName: string;
  model: string;
  label: string;
  intent: string;
  isDefault: boolean;
};

/**
 * Safe (no-key) list of enabled models for client UIs (router, model selector).
 * Joins enabled provider configs with their preset metadata.
 */
export async function listAvailableModels(): Promise<{
  models: AvailableModel[];
  defaultProviderId: string | null;
  defaultModel: string | null;
}> {
  const d = await readMerged();
  const models: AvailableModel[] = [];

  for (const cfg of d.providers) {
    if (!cfg.enabled || !cfg.apiKey) continue;
    const preset = PRESET_BY_ID[cfg.providerId];
    if (!preset) continue;
    for (const modelId of cfg.models) {
      const meta = preset.models.find((m) => m.id === modelId);
      models.push({
        providerId: cfg.providerId,
        providerName: preset.name,
        model: modelId,
        label: meta?.label ?? modelId,
        intent: meta?.intent ?? "general",
        isDefault:
          d.defaultProviderId === cfg.providerId && d.defaultModel === modelId,
      });
    }
  }

  return {
    models,
    defaultProviderId: d.defaultProviderId,
    defaultModel: d.defaultModel,
  };
}

// Re-export preset catalog for routes that need intent metadata.
export { PRESETS };
