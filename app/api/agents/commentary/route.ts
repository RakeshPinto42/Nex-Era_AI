import { generateCommentary } from "@/lib/agents/commentary-agent/generate";
import {
  AUDIENCE_PROFILES,
  COMMENTARY_TONES,
  OUTPUT_FORMATS,
  type AudienceProfile,
  type CommentaryTone,
  type OutputFormat,
} from "@/lib/agents/commentary-agent/types";
import type { FinanceInsights } from "@/lib/agents/finance-agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Commentary Agent — consumes FinanceInsights JSON and writes narrative.
// Never re-reads files. Reuses the AI Router.
export async function POST(req: Request) {
  let body: {
    insights?: FinanceInsights;
    audience?: AudienceProfile;
    tone?: CommentaryTone;
    format?: OutputFormat;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400 });
  }

  if (!body.insights || typeof body.insights.financialSummary !== "string") {
    return Response.json({ error: "FinanceInsights required" }, { status: 400 });
  }

  const audience = AUDIENCE_PROFILES.includes(body.audience as AudienceProfile)
    ? (body.audience as AudienceProfile)
    : "Chief Financial Officer";
  const tone = COMMENTARY_TONES.includes(body.tone as CommentaryTone)
    ? (body.tone as CommentaryTone)
    : "Executive";
  const format = OUTPUT_FORMATS.includes(body.format as OutputFormat)
    ? (body.format as OutputFormat)
    : "Monthly Business Review";

  try {
    const commentary = await generateCommentary(body.insights, { audience, tone, format });
    return Response.json({ commentary });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
