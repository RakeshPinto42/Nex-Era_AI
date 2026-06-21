// Stateless signed-cookie session. HMAC-SHA256 over a tiny JSON payload via the
// Web Crypto API so the SAME verify runs in middleware (edge) and route handlers
// (node). No external deps, no DB.
//
// Token format:  base64url(payload) "." base64url(HMAC(payload))
//   payload = { u: username, r: role, exp: unix-seconds }

export const SESSION_COOKIE = "nexera_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Role = "admin" | "guest";
export type Session = { u: string; r: Role; exp: number };

const DEV_SECRET = "dev-insecure-secret-change-me";
const secret = () => process.env.AUTH_SECRET || DEV_SECRET;

/** True when no real AUTH_SECRET is configured (dev default in use). */
export function secretInsecure(): boolean {
  const s = process.env.AUTH_SECRET;
  return !s || s === DEV_SECRET;
}

// Fail closed: in production, refuse to sign/verify with the dev default so a
// missing AUTH_SECRET can't yield forgeable admin sessions.
const prodInsecure = () =>
  process.env.NODE_ENV === "production" && secretInsecure();

const enc = (s: string) => new TextEncoder().encode(s);

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc(data));
  return b64url(new Uint8Array(sig));
}

// Constant-time string compare (equal length only).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createToken(payload: { u: string; r: Role }): Promise<string> {
  if (prodInsecure()) {
    throw new Error("AUTH_SECRET must be set to a strong value in production");
  }
  const body: Session = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const p = b64url(enc(JSON.stringify(body)));
  const sig = await hmac(p);
  return `${p}.${sig}`;
}

export async function verifyToken(
  token: string | undefined | null,
): Promise<Session | null> {
  if (prodInsecure()) return null; // no valid sessions without a real secret
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const p = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = await hmac(p);
  if (!safeEqual(sig, expect)) return null;
  try {
    const s = JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as Session;
    if (!s || typeof s.exp !== "number" || s.exp * 1000 < Date.now()) return null;
    if (s.r !== "admin" && s.r !== "guest") return null;
    return s;
  } catch {
    return null;
  }
}

/** Parse a named cookie from a raw `Cookie:` header (route handlers). */
export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") || "";
  const m = header.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Verify + return the session for an incoming request (route handlers). */
export async function sessionFromRequest(req: Request): Promise<Session | null> {
  return verifyToken(readCookie(req, SESSION_COOKIE));
}
