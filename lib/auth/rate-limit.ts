// In-memory login throttle. Per key (ip+username) it allows MAX failures inside
// WINDOW; exceeding that locks the key for LOCK ms. A success clears the bucket.
//
// NOTE: process-local — fine for a single instance / local + small deploys. For
// multi-instance, back this with Redis (same interface).

type Bucket = { fails: number; firstFail: number; lockedUntil: number };

const buckets = new Map<string, Bucket>();

export const MAX_FAILS = 5;
export const WINDOW_MS = 15 * 60 * 1000; // 15 min rolling window
export const LOCK_MS = 15 * 60 * 1000; // lockout duration

export type RateResult = { limited: boolean; retryAfterSec?: number };

/** Call before authenticating. If locked, returns { limited, retryAfterSec }. */
export function checkRate(key: string, now = Date.now()): RateResult {
  const b = buckets.get(key);
  if (!b) return { limited: false };
  if (b.lockedUntil > now) {
    return { limited: true, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  // Window expired with no lock → stale bucket, drop it.
  if (now - b.firstFail > WINDOW_MS && b.lockedUntil <= now) {
    buckets.delete(key);
  }
  return { limited: false };
}

/** Record a failed attempt; locks the key once MAX_FAILS is reached in-window. */
export function recordFail(key: string, now = Date.now()): RateResult {
  const b = buckets.get(key);
  if (!b || now - b.firstFail > WINDOW_MS) {
    buckets.set(key, { fails: 1, firstFail: now, lockedUntil: 0 });
    return { limited: false };
  }
  b.fails += 1;
  if (b.fails >= MAX_FAILS) {
    b.lockedUntil = now + LOCK_MS;
    return { limited: true, retryAfterSec: Math.ceil(LOCK_MS / 1000) };
  }
  return { limited: false };
}

/** Clear the bucket after a successful login. */
export function recordSuccess(key: string): void {
  buckets.delete(key);
}

/** Test/maintenance helper. */
export function _reset(): void {
  buckets.clear();
}
