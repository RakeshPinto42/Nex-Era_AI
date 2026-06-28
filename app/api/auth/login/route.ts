import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/users";
import {
  createToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  secretInsecure,
} from "@/lib/auth/session";
import { checkRate, recordFail, recordSuccess } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = (body.username || "").trim();
  const rateKey = `${clientIp(req)}:${username}`;

  const gate = checkRate(rateKey);
  if (gate.limited) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${gate.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec ?? 900) } },
    );
  }

  const acct = authenticate(username, body.password || "");
  if (!acct) {
    const fail = recordFail(rateKey);
    return NextResponse.json(
      {
        error: fail.limited
          ? `Too many attempts. Locked for ${fail.retryAfterSec}s.`
          : "Invalid username or password",
      },
      { status: fail.limited ? 429 : 401 },
    );
  }

  recordSuccess(rateKey);

  // Fail closed in production when no real AUTH_SECRET is set — but return a
  // proper JSON error so the UI can show a useful message instead of a raw
  // network error when the function aborts the connection.
  if (secretInsecure()) {
    return NextResponse.json(
      { error: "Server misconfiguration: AUTH_SECRET is not set." },
      { status: 500 },
    );
  }

  let token: string;
  try {
    token = await createToken({ u: acct.username, r: acct.role });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to create session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const res = NextResponse.json({
    ok: true,
    user: { username: acct.username, role: acct.role },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
