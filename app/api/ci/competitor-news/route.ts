// Commercial News Center agent. Web-searches recent news for a competitor (product
// launches, M&A, dealer/territory expansion, tech, partnerships, exec changes, trade
// shows, service programs) and returns items with a threat/opportunity assessment and
// a recommended Sonny's response. Sources only — no fabricated news.

import { NextRequest, NextResponse } from "next/server";
import { runWebAgent } from "@/lib/finance-os/ci/agent/research-core";

const SYSTEM = `You monitor a competitor for commercial news using web search.
Find RECENT news: product launches, acquisitions/M&A, dealer or territory expansion, technology releases, partnerships, executive changes, trade-show announcements, new service programs.
Output STRICT JSON ONLY (no prose, no markdown): {"news":[{"headline":string,"type":string,"date":string|null,"summary":string,"url":string|null,"assessment":"Threat"|"Opportunity"|"Neutral","response":string}]}
RULES:
- Only real items found in the web sources. Do NOT invent news. Max 12, most recent first.
- "type" = one of: Product Launch, Acquisition, Dealer Expansion, Technology, Partnership, Executive Change, Trade Show, Service Program, Other.
- "assessment" = Threat / Opportunity / Neutral, from the perspective of Sonny's (a car-wash equipment maker).
- "response" = a short recommended action for Sonny's.`;

type NewsItem = { headline: string; type: string; date: string | null; summary: string; url: string | null; assessment: "Threat" | "Opportunity" | "Neutral"; response: string };

export async function POST(req: NextRequest) {
  let body: { competitor?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const competitor = (body.competitor ?? "").trim();
  if (!competitor) return NextResponse.json({ error: "competitor_required" }, { status: 400 });

  const searchQuery = `${competitor} news 2026 product launch acquisition expansion partnership`;
  const user = `Competitor: ${competitor}\nFind recent commercial news about this company.`;

  const res = await runWebAgent({ system: SYSTEM, user, searchQuery, maxTokens: 1800 });
  if (!res.ok) return NextResponse.json({ error: res.error, detail: res.detail }, { status: res.status });

  return NextResponse.json({ competitor, news: parse(res.text), sources: res.sources, model: res.model, backend: res.backend, fetchedAt: new Date().toISOString() });
}

function parse(text: string): NewsItem[] {
  const json = text.replace(/```json|```/g, "").trim();
  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  if (start < 0 || end < 0) return [];
  try {
    const obj = JSON.parse(json.slice(start, end + 1)) as { news?: unknown[] };
    if (!Array.isArray(obj.news)) return [];
    return obj.news.slice(0, 12).map((raw) => {
      const n = raw as Record<string, unknown>;
      const a = String(n.assessment ?? "Neutral");
      return {
        headline: String(n.headline ?? "").trim(),
        type: String(n.type ?? "Other"),
        date: n.date ? String(n.date) : null,
        summary: String(n.summary ?? "").trim(),
        url: n.url ? String(n.url) : null,
        assessment: a === "Threat" || a === "Opportunity" ? a : "Neutral",
        response: String(n.response ?? "").trim(),
      } as NewsItem;
    }).filter((n) => n.headline);
  } catch {
    return [];
  }
}
