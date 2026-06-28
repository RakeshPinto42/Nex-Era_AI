import { analyzePortfolio } from "@/lib/investments/portfolio/analyze";
import type { Holding } from "@/lib/investments/portfolio/types";
import { withGuard } from "@/lib/security/throttle";
import { emit } from "@/lib/events/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Portfolio Intelligence — analyzes holdings. Reuses Market Intelligence Tool +
// Opportunity Engine + AI Router. Analysis only, no trading.
export const POST = (req: Request) => withGuard(req, "portfolio", () => handlePOST(req));

async function handlePOST(req: Request) {
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
    const result = await analyzePortfolio(holdings, body.watchlist ?? []);
    emit({ type: "PortfolioImported", source: "portfolio", payload: { holdings: result.holdings.length, value: result.portfolioValue, risk: result.riskScore } });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
