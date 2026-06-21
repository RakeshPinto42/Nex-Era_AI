// Per-user daily usage quota for guests. Admins are unlimited. In-memory +
// process-local (resets on restart / per-instance) — fine for the intended
// scale; back with Redis for strict multi-instance enforcement.

import type { Role } from "./session";

export type QuotaAction = "image" | "video" | "text";

// Guest allowance per rolling 24h window.
export const GUEST_LIMITS: Record<QuotaAction, number> = {
  text: 50,
  image: 20,
  video: 5,
};

const WINDOW_MS = 24 * 60 * 60 * 1000;
const buckets = new Map<string, { count: number; start: number }>();

export type QuotaResult = {
  ok: boolean;
  limit: number; // Infinity for admin
  remaining: number;
  retryAfterSec?: number;
};

function bucket(key: string, now: number) {
  let b = buckets.get(key);
  if (!b || now - b.start > WINDOW_MS) {
    b = { count: 0, start: now };
    buckets.set(key, b);
  }
  return b;
}

/** Check-and-consume one unit. Admin → always ok, unlimited. */
export function consumeQuota(
  user: string,
  role: Role,
  action: QuotaAction,
  now = Date.now(),
): QuotaResult {
  if (role === "admin") return { ok: true, limit: Infinity, remaining: Infinity };
  const limit = GUEST_LIMITS[action];
  const b = bucket(`${user}:${action}`, now);
  if (b.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      retryAfterSec: Math.ceil((b.start + WINDOW_MS - now) / 1000),
    };
  }
  b.count += 1;
  return { ok: true, limit, remaining: limit - b.count };
}

/** Read remaining without consuming (for display). */
export function peekQuota(
  user: string,
  role: Role,
  action: QuotaAction,
  now = Date.now(),
): QuotaResult {
  if (role === "admin") return { ok: true, limit: Infinity, remaining: Infinity };
  const limit = GUEST_LIMITS[action];
  const b = buckets.get(`${user}:${action}`);
  const count = !b || now - b.start > WINDOW_MS ? 0 : b.count;
  return { ok: count < limit, limit, remaining: Math.max(0, limit - count) };
}

export function _reset(): void {
  buckets.clear();
}
