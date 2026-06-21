import { NextResponse } from "next/server";
import { generateImage } from "@/lib/gen/generate";
import { sessionFromRequest } from "@/lib/auth/session";
import { consumeQuota } from "@/lib/auth/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { prompt?: string; width?: number; height?: number };
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
    const q = consumeQuota(session.u, session.r, "image");
    if (!q.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Daily image limit reached (${q.limit}/day for guests). Resets in ~${Math.ceil((q.retryAfterSec ?? 0) / 3600)}h.`,
          mode: "limit",
        },
        { status: 429 },
      );
    }
  }

  const result = await generateImage(prompt, {
    width: body.width,
    height: body.height,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
