import { completeWithFallback } from "@/lib/llm/infer";
import { sessionFromRequest } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

// On-demand "why" for one asset: technical (from the real momentum we pass in),
// fundamental context, and the TYPES of catalysts/news to watch. Free LLM only.
// To avoid fabricated news, the model is told NOT to invent specific headlines.

const SYSTEM = `You explain ONE investment's signal to a retail investor in three short parts. Output STRICT JSON ONLY:
{"technical": string, "fundamental": string, "catalysts": string}
Guidance:
- "technical": interpret the price-momentum numbers provided (trend, strength, where it sits in its range). 1-2 sentences.
- "fundamental": the asset's business model / sector position / valuation-earnings-dividend character in general terms. Do NOT invent exact figures.
- "catalysts": the TYPES of news/events that typically move this asset and what an investor should watch. Do NOT fabricate specific dated headlines, prices or quotes.
Each part <= 40 words, concrete and specific to THIS asset. Educational, not financial advice.`;

export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let b: {
    name?: string;
    symbol?: string;
    kind?: string;
    momentum?: Record<string, number | null>;
    ratings?: Record<string, string>;
  };
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (!b.name) return Response.json({ error: "name required" }, { status: 400 });

  const facts = [
    `Asset: ${b.name}${b.symbol ? ` (${b.symbol})` : ""}`,
    b.kind ? `Category: ${b.kind}` : "",
    b.momentum
      ? `Momentum %: ${Object.entries(b.momentum)
          .filter(([, v]) => v != null)
          .map(([k, v]) => `${k} ${(v as number).toFixed(1)}%`)
          .join(", ")}`
      : "",
    b.ratings
      ? `Computed ratings: ${Object.entries(b.ratings)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await completeWithFallback(
    SYSTEM,
    [{ role: "user", content: `${facts}\n\nExplain the technical picture, the fundamentals, and what catalysts to watch.` }],
    undefined,
    { maxTokens: 500, freeOnly: true },
  );
  if (!res) return Response.json({ error: "No model available." }, { status: 503 });

  const start = res.text.indexOf("{");
  const end = res.text.lastIndexOf("}");
  let out = { technical: "", fundamental: "", catalysts: "" };
  if (start >= 0 && end > start) {
    try {
      const o = JSON.parse(res.text.slice(start, end + 1)) as Partial<typeof out>;
      out = {
        technical: String(o.technical ?? "").trim(),
        fundamental: String(o.fundamental ?? "").trim(),
        catalysts: String(o.catalysts ?? "").trim(),
      };
    } catch {
      /* leave blanks */
    }
  }
  return Response.json({ ...out, model: res.model });
}
