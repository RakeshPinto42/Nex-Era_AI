// Shared request throttle for expensive endpoints. ONE module, called from each
// route handler (no duplicated middleware). Enforces per-IP + per-user sliding
// windows AND a concurrency cap per category. Returns 429 with Retry-After.
//
// In-memory / per-instance (same trade-off as the login throttle); back with KV
// for strict multi-instance guarantees. Reuses the session for per-user keys.

import { sessionFromRequest } from "@/lib/auth/session";

export type ThrottleCategory =
  | "llm"
  | "media"
  | "upload"
  | "research"
  | "finance"
  | "investment"
  | "scanner"
  | "consensus"
  | "opportunities"
  | "portfolio"
  | "commentary"
  | "broker"
  | "terminal";

type Limit = { windowMs: number; ipMax: number; userMax: number; concurrency: number };

const MIN = 60_000;

// Tuned by cost: heavy fan-out / LLM endpoints get tight limits.
const LIMITS: Record<ThrottleCategory, Limit> = {
  llm: { windowMs: MIN, ipMax: 30, userMax: 20, concurrency: 3 },
  media: { windowMs: MIN, ipMax: 12, userMax: 8, concurrency: 2 },
  upload: { windowMs: MIN, ipMax: 15, userMax: 10, concurrency: 2 },
  research: { windowMs: MIN, ipMax: 20, userMax: 15, concurrency: 2 },
  finance: { windowMs: MIN, ipMax: 15, userMax: 10, concurrency: 2 },
  investment: { windowMs: MIN, ipMax: 40, userMax: 30, concurrency: 4 },
  scanner: { windowMs: MIN, ipMax: 8, userMax: 6, concurrency: 1 },
  consensus: { windowMs: MIN, ipMax: 14, userMax: 10, concurrency: 2 },
  opportunities: { windowMs: MIN, ipMax: 8, userMax: 6, concurrency: 1 },
  portfolio: { windowMs: MIN, ipMax: 8, userMax: 6, concurrency: 1 },
  commentary: { windowMs: MIN, ipMax: 14, userMax: 10, concurrency: 2 },
  broker: { windowMs: MIN, ipMax: 40, userMax: 30, concurrency: 4 },
  terminal: { windowMs: MIN, ipMax: 40, userMax: 30, concurrency: 4 },
};

const hits = new Map<string, number[]>(); // key → request timestamps (window)
const running = new Map<string, number>(); // key → in-flight count

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

function windowCheck(key: string, max: number, windowMs: number, now: number): { ok: boolean; retryAfter: number } {
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    const retryAfter = Math.ceil((windowMs - (now - arr[0])) / 1000);
    hits.set(key, arr);
    return { ok: false, retryAfter: Math.max(1, retryAfter) };
  }
  arr.push(now);
  hits.set(key, arr);
  return { ok: true, retryAfter: 0 };
}

function tooMany(retryAfter: number, scope: string): Response {
  return Response.json(
    { error: `Rate limit exceeded (${scope}). Retry in ${retryAfter}s.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export type GuardResult = { ok: true; release: () => void } | { ok: false; res: Response };

/**
 * Wrap a route handler with throttling. Usage:
 *   async function handlePOST(req: Request) { … }
 *   export const POST = (req: Request) => withGuard(req, "scanner", () => handlePOST(req));
 */
export async function withGuard(
  req: Request,
  category: ThrottleCategory,
  handler: () => Promise<Response>,
): Promise<Response> {
  const g = await guard(req, category);
  if (!g.ok) return g.res;
  try {
    return await handler();
  } finally {
    g.release();
  }
}

/**
 * Throttle an expensive request. Call at the top of a route handler:
 *   const g = await guard(req, "scanner");
 *   if (!g.ok) return g.res;
 *   try { …work… } finally { g.release(); }
 */
export async function guard(req: Request, category: ThrottleCategory): Promise<GuardResult> {
  const lim = LIMITS[category];
  const now = Date.now();
  const ip = clientIp(req);
  const session = await sessionFromRequest(req).catch(() => null);
  const user = session?.u ?? `ip:${ip}`;

  // Per-IP window.
  const ipw = windowCheck(`${category}:ip:${ip}`, lim.ipMax, lim.windowMs, now);
  if (!ipw.ok) return { ok: false, res: tooMany(ipw.retryAfter, "per-IP") };

  // Per-user window.
  const uw = windowCheck(`${category}:user:${user}`, lim.userMax, lim.windowMs, now);
  if (!uw.ok) return { ok: false, res: tooMany(uw.retryAfter, "per-user") };

  // Concurrency cap.
  const cKey = `${category}:conc:${user}`;
  const cur = running.get(cKey) ?? 0;
  if (cur >= lim.concurrency) {
    return { ok: false, res: tooMany(2, "too many concurrent requests") };
  }
  running.set(cKey, cur + 1);

  let released = false;
  return {
    ok: true,
    release: () => {
      if (released) return;
      released = true;
      running.set(cKey, Math.max(0, (running.get(cKey) ?? 1) - 1));
    },
  };
}
