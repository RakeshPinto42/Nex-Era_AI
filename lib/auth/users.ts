import "server-only";
import { timingSafeEqual } from "crypto";
import type { Role } from "./session";

// Fixed accounts: 1 admin + 2 guests. Credentials come from env in production;
// defaults exist for local dev (CHANGE THEM before any shared deployment).
// Only the admin role may view/edit provider API keys.

export type Account = { username: string; password: string; role: Role };

export const ACCOUNTS: Account[] = [
  {
    username: process.env.ADMIN_USER || "admin",
    password: process.env.ADMIN_PASS || "nexera-admin",
    role: "admin",
  },
  {
    username: process.env.GUEST1_USER || "guest1",
    password: process.env.GUEST1_PASS || "guest-one",
    role: "guest",
  },
  {
    username: process.env.GUEST2_USER || "guest2",
    password: process.env.GUEST2_PASS || "guest-two",
    role: "guest",
  },
];

function constantEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  // timingSafeEqual throws on length mismatch — guard, but still compare to a
  // fixed buffer so the timing doesn't leak which case we hit.
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function authenticate(username: string, password: string): Account | null {
  const acct = ACCOUNTS.find((a) => a.username === username);
  if (!acct) return null;
  return constantEqual(acct.password, password) ? acct : null;
}
