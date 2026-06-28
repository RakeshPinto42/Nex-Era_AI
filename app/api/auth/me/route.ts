import { NextResponse } from "next/server";
import { verifyToken, readCookie, SESSION_COOKIE } from "@/lib/auth/session";
import { peekQuota } from "@/lib/auth/quota";
import { profileFor } from "@/lib/auth/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await verifyToken(readCookie(req, SESSION_COOKIE));
  if (!session) return NextResponse.json({ user: null });

  // Guests see their remaining daily allowance; admins are unlimited.
  const quota =
    session.r === "guest"
      ? {
          image: peekQuota(session.u, session.r, "image"),
          video: peekQuota(session.u, session.r, "video"),
          text: peekQuota(session.u, session.r, "text"),
        }
      : null;

  const profile = profileFor(session.u, session.r);
  return NextResponse.json({
    user: { username: session.u, role: session.r, ...profile },
    quota,
  });
}
