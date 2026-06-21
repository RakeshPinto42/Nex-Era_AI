// AI-assist endpoint for the Finance OS. Secondary helper only — column mapping
// and commentary. Receives ONLY headers/summaries (no raw rows) from the client.

import { NextRequest, NextResponse } from "next/server";
import { completeWithFallback } from "@/lib/llm/infer";

const SYSTEMS: Record<string, string> = {
  mapping:
    "You map spreadsheet column headers to canonical finance fields. Reply ONLY with compact JSON: {fieldKey: headerName|null}. No prose.",
  "rule-extraction":
    "You extract structured commission rules from a plain-English description. Reply with concise JSON only.",
  "explain-exceptions":
    "You explain data-validation exceptions to a finance analyst in 1-2 sentences each. Be specific and actionable.",
  commentary:
    "You are an FP&A analyst. Write tight, executive-ready commentary (3-5 sentences) from the numeric summary. No fluff, no markdown headers.",
};

export async function POST(req: NextRequest) {
  let body: { task?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const task = body.task ?? "";
  const system = SYSTEMS[task];
  if (!system) return NextResponse.json({ error: "Unknown task" }, { status: 400 });

  const user = `Task: ${task}\nData: ${JSON.stringify(body.payload ?? {})}`;
  const result = await completeWithFallback(system, [{ role: "user", content: user }], undefined, {
    maxTokens: 700,
  });
  if (!result) return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  return NextResponse.json({ text: result.text, model: result.model });
}
