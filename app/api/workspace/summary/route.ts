import { NextResponse } from "next/server";
import { summarizeWorkspace } from "@/lib/workspace/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Structural project summary for the opened workspace. No LLM, read-only.
export async function GET() {
  try {
    return NextResponse.json({ summary: await summarizeWorkspace() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
