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

// ---- credential policy (production hardening) ----

const MIN_ADMIN_PASSWORD = 16;

// Built-in dev fallbacks + obvious defaults — never allowed in production.
const DEFAULT_PASSWORDS = new Set(
  ["nexera-admin", "guest-one", "guest-two", "admin", "changeme", "default"].map((s) => s.toLowerCase()),
);

// A small deny-list of common/weak passwords (lowercased).
const WEAK_PASSWORDS = new Set(
  [
    "password", "password1", "password123", "123456", "12345678", "123456789",
    "qwerty", "qwerty123", "letmein", "welcome", "admin123", "iloveyou",
    "nexera", "nexera123", "test1234", "abc123", "00000000", "11111111",
  ].map((s) => s.toLowerCase()),
);

/** Count distinct character classes (lower/upper/digit/symbol). */
function charClasses(pw: string): number {
  let n = 0;
  if (/[a-z]/.test(pw)) n++;
  if (/[A-Z]/.test(pw)) n++;
  if (/[0-9]/.test(pw)) n++;
  if (/[^a-zA-Z0-9]/.test(pw)) n++;
  return n;
}

/**
 * Validate a password against policy. Returns a short, secret-free reason code
 * (never the password itself) or null when acceptable.
 */
export function passwordPolicyError(pw: string | undefined | null, min = MIN_ADMIN_PASSWORD): string | null {
  if (!pw) return "missing";
  if (pw.length < min) return `too short (min ${min})`;
  const lower = pw.toLowerCase();
  if (DEFAULT_PASSWORDS.has(lower)) return "is a built-in default";
  if (WEAK_PASSWORDS.has(lower)) return "is a known weak password";
  if (/^(.)\1+$/.test(pw)) return "is a single repeated character";
  if (charClasses(pw) < 3 && pw.length < 20) return "lacks complexity (need 3+ character classes or 20+ chars)";
  return null;
}

/**
 * Returns a non-secret reason string if the deployment's credentials violate
 * policy, else null. Enforced only in production — local dev keeps working with
 * the fallback defaults. Never includes any credential value.
 */
export function credentialConfigError(): string | null {
  if (process.env.NODE_ENV !== "production") return null;

  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    return "ADMIN_USER and ADMIN_PASS must be set in production";
  }
  const adminPw = passwordPolicyError(process.env.ADMIN_PASS);
  if (adminPw) return `ADMIN_PASS policy violation: ${adminPw}`;

  // Guests need not meet the 16-char rule, but must not use public defaults.
  for (const [label, pw] of [["GUEST1_PASS", process.env.GUEST1_PASS], ["GUEST2_PASS", process.env.GUEST2_PASS]] as const) {
    if (!pw) continue; // a guest account may be left unset
    if (DEFAULT_PASSWORDS.has(pw.toLowerCase()) || WEAK_PASSWORDS.has(pw.toLowerCase())) {
      return `${label} uses a default/weak password`;
    }
  }
  return null;
}
