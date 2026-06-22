// Optional Vercel KV (Upstash Redis) backend for the server-side key stores.
// On Vercel the disk under .rak is read-only, so admin-saved provider/search
// keys can't persist there. When a KV integration is attached (Vercel KV or
// Upstash), these helpers persist to Redis instead; otherwise they no-op so
// local dev keeps using the .rak disk store.
//
// Env vars: Vercel KV exposes KV_REST_API_URL / KV_REST_API_TOKEN; a raw
// Upstash integration exposes UPSTASH_REDIS_REST_URL / _TOKEN. Either works.

import "server-only";
import { Redis } from "@upstash/redis";

let client: Redis | null = null;
let resolved = false;

function getClient(): Redis | null {
  if (resolved) return client;
  resolved = true;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) client = new Redis({ url, token });
  return client;
}

/** True when a KV backend is configured (prod path). */
export function kvEnabled(): boolean {
  return getClient() !== null;
}

/** Read + JSON-parse a key. Returns null when absent or KV is not configured. */
export async function kvGetJSON<T>(key: string): Promise<T | null> {
  const c = getClient();
  if (!c) return null;
  // @upstash/redis auto-deserializes JSON values written via set().
  return (await c.get<T>(key)) ?? null;
}

/** JSON-serialize + write a key. Throws if KV is not configured. */
export async function kvSetJSON<T>(key: string, value: T): Promise<void> {
  const c = getClient();
  if (!c) throw new Error("KV not configured");
  await c.set(key, value);
}

/** Delete a key. No-op when KV is not configured. */
export async function kvDel(key: string): Promise<void> {
  const c = getClient();
  if (!c) return;
  await c.del(key);
}
