// Competitor research agent. Web search (OpenRouter web plugin by default, or
// Tavily if a key is set) → LLM extraction of structured products+pricing FROM THE
// SOURCES ONLY (never invents a number), each with the source URL. Verifiable +
// trackable. Needs a configured OpenRouter provider (default) or a Tavily key.

import { NextRequest, NextResponse } from "next/server";
import { runWebAgent } from "@/lib/finance-os/ci/agent/research-core";
import type { CompetitorProduct } from "@/lib/finance-os/ci/agent/types";

// Web search + LLM extraction can run tens of seconds — raise past Vercel's 10s
// default (Hobby max 60s; bump to 300 on Pro).
export const maxDuration = 60;

const EXTRACT_SYSTEM = `You are a competitive-pricing research agent. Using web search, find the competitor's products and pricing, then output them.
Output STRICT JSON ONLY (no prose, no markdown fences):
{"products":[{"product":string,"sku":string|null,"category":string|null,"price":number|null,"currency":string|null,"features":string[],"sourceUrl":string|null,"note":string|null}]}
RULES:
- Use ONLY facts found in the web sources. Do NOT use prior knowledge or guess.
- If a price is not stated in the sources, set "price": null. NEVER invent or estimate a number.
- "price" must be a plain number (no currency symbols/commas). Put the currency in "currency".
- "sourceUrl" must be the URL the fact came from.
- Keep "features" to short phrases. Max 20 products. Skip non-product results.`;

export async function POST(req: NextRequest) {
  let body: { competitor?: string; keywords?: string; region?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const competitor = (body.competitor ?? "").trim();
  if (!competitor) return NextResponse.json({ error: "competitor_required" }, { status: 400 });

  const searchQuery = [competitor, body.keywords?.trim(), body.region?.trim(), "products pricing price list specifications"]
    .filter(Boolean)
    .join(" ");
  const user = `Competitor: ${competitor}\n${body.keywords ? `Focus: ${body.keywords}\n` : ""}${body.region ? `Region: ${body.region}\n` : ""}List this competitor's products with pricing.`;

  const res = await runWebAgent({ system: EXTRACT_SYSTEM, user, searchQuery, maxTokens: 1800 });
  if (!res.ok) return NextResponse.json({ error: res.error, detail: res.detail }, { status: res.status });

  const products = parseProducts(res.text);

  return NextResponse.json({
    competitor,
    products,
    sources: res.sources,
    model: res.model,
    backend: res.backend,
    estimated: res.estimated,
    researchedAt: new Date().toISOString(),
  });
}

function parseProducts(text: string): CompetitorProduct[] {
  const json = text.replace(/```json|```/g, "").trim();
  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  if (start < 0 || end < 0) return [];
  try {
    const obj = JSON.parse(json.slice(start, end + 1)) as { products?: unknown[] };
    if (!Array.isArray(obj.products)) return [];
    return obj.products
      .slice(0, 20)
      .map((raw) => {
        const p = raw as Record<string, unknown>;
        const priceNum = typeof p.price === "number" ? p.price : null;
        return {
          product: String(p.product ?? "").trim() || "—",
          sku: p.sku ? String(p.sku) : null,
          category: p.category ? String(p.category) : null,
          price: Number.isFinite(priceNum as number) ? (priceNum as number) : null,
          currency: p.currency ? String(p.currency) : null,
          features: Array.isArray(p.features) ? p.features.map(String).slice(0, 8) : [],
          sourceUrl: p.sourceUrl ? String(p.sourceUrl) : null,
          note: p.note ? String(p.note) : null,
        } satisfies CompetitorProduct;
      })
      .filter((p) => p.product !== "—");
  } catch {
    return [];
  }
}
