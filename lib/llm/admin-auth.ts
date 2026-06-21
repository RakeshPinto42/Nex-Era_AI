import "server-only";

// Admin gate for provider/key APIs — now backed by the signed-cookie session.
// Only a session with role "admin" may read or mutate provider keys. Middleware
// already blocks the /admin page for non-admins; this is the API-level guard.

import { verifyToken, readCookie, SESSION_COOKIE } from "@/lib/auth/session";

export async function checkAdmin(req: Request): Promise<{ ok: boolean }> {
  const session = await verifyToken(readCookie(req, SESSION_COOKIE));
  return { ok: session?.r === "admin" };
}
