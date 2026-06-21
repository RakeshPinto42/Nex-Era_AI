import { NextResponse } from "next/server";
import { refreshFreeModels } from "@/lib/llm/discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called when the chat window opens (and by the admin health button).
//   default      → sync free list + health-check only models with stale results
//   ?force=1     → re-ping every model now (admin / "check now")
//   ?syncOnly=1  → refresh the list without spending any request quota
export async function POST(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const syncOnly = url.searchParams.get("syncOnly") === "1";

  try {
    const report = await refreshFreeModels({
      forceHealth: force,
      runHealth: !syncOnly,
    });
    return NextResponse.json({ ok: true, ...report });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
