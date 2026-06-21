// Server-side store for the web-search (Tavily) API key. Persists to a gitignored
// JSON file under .rak, with an env fallback (TAVILY_API_KEY) for read-only hosts.
// Plaintext at rest — fine for local/single-user; use a secrets manager in shared prod.

import "server-only";
import { promises as fs } from "fs";
import path from "path";

const FILE = path.join(process.cwd(), ".rak", "ci-search.json");

function mask(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

async function readStore(): Promise<string | null> {
  try {
    const j = JSON.parse(await fs.readFile(FILE, "utf8")) as { tavilyKey?: string };
    return j.tavilyKey?.trim() || null;
  } catch {
    return null;
  }
}

/** Resolve the active search key: stored key wins, else env. */
export async function getSearchKey(): Promise<string | null> {
  return (await readStore()) ?? process.env.TAVILY_API_KEY ?? null;
}

export async function setSearchKey(key: string): Promise<void> {
  const dir = path.dirname(FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ tavilyKey: key.trim() }, null, 2), "utf8");
    await fs.rename(tmp, FILE);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "EPERM") {
      throw new Error("Key storage is read-only here. Set TAVILY_API_KEY as an environment variable instead.");
    }
    throw e;
  }
}

export async function clearSearchKey(): Promise<void> {
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
