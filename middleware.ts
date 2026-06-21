import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth/session";

// Gates app surfaces AND API routes.
//   public:        / , /login , /api/auth/*
//   any session:   /dashboard, /workspace, /fpa, /api/models|run|chat|fpa|generate…
//   admin only:    /admin, /api/admin/*, /api/workspace/*
//   prod-disabled: /api/workspace/* (server-filesystem access — off in production)

const ADMIN_PREFIXES = ["/admin", "/api/admin", "/api/workspace"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");

  // Auth endpoints are public (login/logout/me set or read the session).
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  // Workspace filesystem tools touch the server's disk — never in production.
  if (
    process.env.NODE_ENV === "production" &&
    pathname.startsWith("/api/workspace")
  ) {
    return NextResponse.json(
      { error: "Workspace file tools are disabled in production." },
      { status: 403 },
    );
  }

  const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  const needsAdmin = ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (needsAdmin && session.r !== "admin") {
    if (isApi) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("denied", "admin");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workspace/:path*",
    "/fpa/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
