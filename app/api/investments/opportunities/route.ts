import { rankOpportunities } from "@/lib/investments/opportunity/rank";
import { MARKET_LABELS, type MarketKey } from "@/lib/investments/scanner/types";
import { withGuard } from "@/lib/security/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VALID = Object.keys(MARKET_LABELS) as MarketKey[];

// Opportunity Ranking Engine — ranks by conviction (multi-factor), not price.
// Reuses the Market Intelligence Tool. No advice.
export const POST = (req: Request) => withGuard(req, "opportunities", () => handlePOST(req));

async function handlePOST(req: Request) {
  let body: { markets?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400 });
  }
  const markets = (body.markets ?? []).filter((m): m is MarketKey => VALID.includes(m as MarketKey));
  if (markets.length === 0) return Response.json({ error: "Select at least one market" }, { status: 400 });

  try {
    return Response.json(await rankOpportunities(markets));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
