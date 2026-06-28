import { NextResponse } from "next/server";
import { generateVideo } from "@/lib/gen/generate";
import { sessionFromRequest } from "@/lib/auth/session";
import { consumeQuota } from "@/lib/auth/quota";
import { withGuard } from "@/lib/security/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export const POST = (req: Request) => withGuard(req, "media", () => handlePOST(req));

async function handlePOST(req: Request) {
  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const session = await sessionFromRequest(req);
  if (session) {
    const q = consumeQuota(session.u, session.r, "video");
    if (!q.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Daily video limit reached (${q.limit}/day for guests). Resets in ~${Math.ceil((q.retryAfterSec ?? 0) / 3600)}h.`,
          mode: "limit",
        },
        { status: 429 },
      );
    }
  }

  const result = await generateVideo(prompt);
  const status = result.ok ? 200 : result.mode === "needs-key" ? 200 : 502;
  return NextResponse.json(result, { status });
}
