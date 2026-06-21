import { NextResponse } from "next/server";
import { listAvailableModels } from "@/lib/llm/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public (no-key) list of configured + enabled models for client UIs.
export async function GET() {
  const data = await listAvailableModels();
  const envFallback = Boolean(process.env.ANTHROPIC_API_KEY);
  return NextResponse.json({
    ...data,
    hasAny: data.models.length > 0 || envFallback,
    envFallback,
  });
}
