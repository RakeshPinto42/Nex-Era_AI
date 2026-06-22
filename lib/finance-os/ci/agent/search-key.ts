// Server-side store for the web-search (Tavily) API key. Persists to a gitignored
// JSON file under .rak, with an env fallback (TAVILY_API_KEY) for read-only hosts.
// Plaintext at rest — fine for local/single-user; use a secrets manager in shared prod.

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { kvEnabled, kvGetJSON, kvSetJSON, kvDel } from "@/lib/llm/kv";
import { encryptSecret, decryptSecret } from "@/lib/llm/secret-crypto";

const FILE = path.join(process.cwd(), ".rak", "ci-search.json");
const KV_KEY = "rak:ci-search";

function mask(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

async function readStore(): Promise<string | null> {
  if (kvEnabled()) {
    const j = await kvGetJSON<{ tavilyKey?: string }>(KV_KEY);
    const v = j?.tavilyKey?.trim();
    return v ? decryptSecret(v) : null;
  }
  try {
    const j = JSON.parse(await fs.readFile(FILE, "utf8")) as { tavilyKey?: string };
    const v = j.tavilyKey?.trim();
    return v ? decryptSecret(v) : null;
  } catch {
    return null;
  }
}

/** Resolve the active search key: stored key wins, else env. */
export async function getSearchKey(): Promise<string | null> {
  return (await readStore()) ?? process.env.TAVILY_API_KEY ?? null;
}

export async function setSearchKey(key: string): Promise<void> {
  const enc = encryptSecret(key.trim());
  if (kvEnabled()) {
    await kvSetJSON(KV_KEY, { tavilyKey: enc });
    return;
  }
  const dir = path.dirname(FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ tavilyKey: enc }, null, 2), "utf8");
    await fs.rename(tmp, FILE);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      throw new Error("Key storage is read-only here. Attach a Vercel KV / Upstash store, or set TAVILY_API_KEY as an environment variable.");
    }
    throw e;
  }
}

export async function clearSearchKey(): Promise<void> {
  if (kvEnabled()) {
    await kvDel(KV_KEY);
    return;
  }
  try {
    await fs.unlink(FILE);
  } catch {
    /* already absent */
  }
}

export async function searchKeyStatus(): Promise<{ hasKey: boolean; mask: string; source: "store" | "env" | "none" }> {
  const stored = await readStore();
  if (stored) return { hasKey: true, mask: mask(stored), source: "store" };
  if (process.env.TAVILY_API_KEY) return { hasKey: true, mask: mask(process.env.TAVILY_API_KEY), source: "env" };
  return { hasKey: false, mask: "", source: "none" };
}
