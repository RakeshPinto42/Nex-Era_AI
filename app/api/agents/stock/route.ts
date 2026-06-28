import { marketIntelligenceTool } from "@/lib/investments/market-intelligence";
import { analyzeStock } from "@/lib/agents/stock-agent/analyze";
import { withGuard } from "@/lib/security/throttle";
import { upsertKnowledge } from "@/lib/knowledge/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Stock Agent — investment research over normalized market data. Data comes from
// the Market Intelligence Tool (mocked for now); reasoning via the AI Router.
// No direct provider calls. Research only — no buy/sell advice.
async function run(ticker: string) {
  const data = await marketIntelligenceTool.getNormalized(ticker);
  const insights = await analyzeStock(data);

  // Authorized write to the Knowledge Layer (Investment Intelligence Agent).
  // Best-effort — never break the response on a knowledge write.
  try {
    upsertKnowledge("market", {
      id: `company:${data.ticker}`,
      type: "company",
      title: `${data.company} (${data.ticker})`,
      summary: insights.companySummary,
      tags: [data.sector, data.industry, data.exchange].filter(Boolean),
      sources: data.news.map((n) => ({ title: n.title, kind: "news" })),
      confidence: insights.confidence,
      owner: "market",
      aiInsights: [{ text: insights.investmentThesis, by: "market", confidence: insights.confidence, at: new Date().toISOString() }],
      event: { kind: "thesis_updated", detail: "Investment Intelligence updated the thesis" },
    });
  } catch {
    /* knowledge write is best-effort */
  }

  return { data, insights };
}

export const GET = (req: Request) => withGuard(req, "investment", () => handleGET(req));

async function handleGET(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.trim();
  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 });
  try {
    return Response.json(await run(ticker));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export const POST = (req: Request) => withGuard(req, "investment", () => handlePOST(req));

async function handlePOST(req: Request) {
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
