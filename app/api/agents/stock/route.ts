import { marketIntelligenceTool } from "@/lib/investments/market-intelligence";
import { analyzeStock } from "@/lib/agents/stock-agent/analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Stock Agent — investment research over normalized market data. Data comes from
// the Market Intelligence Tool (mocked for now); reasoning via the AI Router.
// No direct provider calls. Research only — no buy/sell advice.
async function run(ticker: string) {
  const data = await marketIntelligenceTool.getNormalized(ticker);
  const insights = await analyzeStock(data);
  return { data, insights };
}

export async function GET(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.trim();
  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 });
  try {
    return Response.json(await run(ticker));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { ticker?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400 });
  }
  if (!body.ticker?.trim()) return Response.json({ error: "ticker required" }, { status: 400 });
  try {
    return Response.json(await run(body.ticker.trim()));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
