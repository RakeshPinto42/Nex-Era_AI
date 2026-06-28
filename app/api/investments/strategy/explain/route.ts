import { completeWithFallback, type ChatMsg } from "@/lib/llm/infer";
import type { Strategy } from "@/lib/investments/strategy/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const SYSTEM = `You explain investment strategies in plain language. You receive a strategy's EXPLICIT rules as JSON.
EXPLAIN ONLY what is given. Never invent or add rules. Never give buy/sell advice. Describe what the entry/exit/risk
conditions mean, when they would trigger, and trade-offs. Keep it to a few short paragraphs.`;

function describe(s: Strategy): string {
  const fmt = (label: string, list: Strategy["entryConditions"]) =>
    `${label}: ${list.length ? list.map((c) => `${c.factor}/${c.metric} ${c.operator} ${c.value}${c.value2 != null ? `..${c.value2}` : ""}`).join("; ") : "none"}`;
  return [
    `Name: ${s.name}`,
    `Template: ${s.template}`,
    `Description: ${s.description}`,
    fmt("Entry", s.entryConditions),
    fmt("Exit", s.exitConditions),
    fmt("Risk", s.riskRules),
    `Position size: ${s.positionSizePct}% · Max allocation: ${s.maxAllocationPct}% · Review: ${s.reviewFrequency} · Confidence threshold: ${Math.round(s.confidenceThreshold * 100)}%`,
  ].join("\n");
}

export async function POST(req: Request) {
  let body: { strategy?: Strategy };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400 });
  }
  if (!body.strategy?.name) return Response.json({ error: "strategy required" }, { status: 400 });

  const messages: ChatMsg[] = [{ role: "user", content: describe(body.strategy) }];
  try {
    const routed = await completeWithFallback(SYSTEM, messages, undefined, { maxTokens: 700 });
    if (!routed) {
      return Response.json({
        explanation: "No model configured — connect a provider to get AI explanations. The strategy's rules are shown explicitly above.",
        mode: "fallback",
      });
    }
    return Response.json({ explanation: routed.text.trim(), mode: "ai" });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
