import { analyzePortfolio } from "@/lib/investments/portfolio/analyze";
import type { Holding } from "@/lib/investments/portfolio/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Portfolio Intelligence — analyzes holdings. Reuses Market Intelligence Tool +
// Opportunity Engine + AI Router. Analysis only, no trading.
export async function POST(req: Request) {
  let body: { holdings?: Holding[]; watchlist?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400 });
  }
  const holdings = (body.holdings ?? []).filter((h) => h && typeof h.ticker === "string" && Number(h.quantity) > 0)
    .map((h) => ({ ticker: h.ticker.trim().toUpperCase(), quantity: Number(h.quantity), avgCost: h.avgCost ? Number(h.avgCost) : undefined }));
  if (holdings.length === 0) return Response.json({ error: "No holdings provided" }, { status: 400 });

  try {
    return Response.json(await analyzePortfolio(holdings, body.watchlist ?? []));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
