import { runScan } from "@/lib/investments/scanner/scan";
import { MARKET_LABELS, type MarketKey } from "@/lib/investments/scanner/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const VALID = Object.keys(MARKET_LABELS) as MarketKey[];

// AI Market Scanner — discovers candidates and shortlists for the Investment
// Intelligence Agent. Reuses the Market Intelligence Tool + IIA. No advice.
export async function POST(req: Request) {
  let body: { markets?: string[]; holdings?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400 });
  }

  const markets = (body.markets ?? []).filter((m): m is MarketKey => VALID.includes(m as MarketKey));
  if (markets.length === 0) {
    return Response.json({ error: "Select at least one market" }, { status: 400 });
  }

  try {
    const result = await runScan({ markets, holdings: body.holdings });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
