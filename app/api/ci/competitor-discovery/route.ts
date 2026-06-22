// Competitor discovery agent. Given a company (e.g. "Sonny's Enterprises") and a
// region, web-searches and extracts the list of that company's COMPETITORS — real
// named companies from the sources only. The user then researches each for pricing.

import { NextRequest, NextResponse } from "next/server";
import { runWebAgent } from "@/lib/finance-os/ci/agent/research-core";

// Web search + LLM extraction can run tens of seconds — raise past Vercel's 10s
// default (Hobby max 60s; bump to 300 on Pro).
export const maxDuration = 60;

const SYSTEM = `You identify a company's competitors using web search.
Output STRICT JSON ONLY (no prose, no markdown): {"competitors":[{"name":string,"descriptor":string,"region":string|null,"url":string|null}]}
RULES:
- List only real, named competitor COMPANIES found in the web sources.
- Exclude the target company itself. No duplicates. Max 15.
- "descriptor" = a 3-8 word summary of what they make.
- "region" = where they primarily operate if known (e.g. "US", "Europe"), else null.
- "url" = the company's website or the source URL.
- Do NOT invent companies. Use only what the sources support.`;

type Competitor = { name: string; descriptor: string; region: string | null; url: string | null };

export async function POST(req: NextRequest) {
  let body: { company?: string; region?: string; keywords?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const company = (body.company ?? "").trim();
  if (!company) return NextResponse.json({ error: "company_required" }, { status: 400 });

  const region = body.region?.trim();
  const searchQuery = [company, "competitors", region, body.keywords?.trim(), "companies list"].filter(Boolean).join(" ");
  const user = `Target company: ${company}\nRegion focus: ${region || "any"}\n${body.keywords ? `Industry: ${body.keywords}\n` : ""}List this company's competitors.`;

  const res = await runWebAgent({ system: SYSTEM, user, searchQuery, maxTokens: 1400 });
  if (!res.ok) return NextResponse.json({ error: res.error, detail: res.detail }, { status: res.status });

  return NextResponse.json({ company, competitors: parse(res.text), sources: res.sources, model: res.model, backend: res.backend });
}

function parse(text: string): Competitor[] {
  const json = text.replace(/```json|```/g, "").trim();
  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  if (start < 0 || end < 0) return [];
  try {
    const obj = JSON.parse(json.slice(start, end + 1)) as { competitors?: unknown[] };
    if (!Array.isArray(obj.competitors)) return [];
    return obj.competitors
      .slice(0, 15)
      .map((raw) => {
        const c = raw as Record<string, unknown>;
        return {
          name: String(c.name ?? "").trim(),
          descriptor: String(c.descriptor ?? "").trim(),
          region: c.region ? String(c.region) : null,
          url: c.url ? String(c.url) : null,
        };
      })
      .filter((c) => c.name);
  } catch {
    return [];
  }
}
