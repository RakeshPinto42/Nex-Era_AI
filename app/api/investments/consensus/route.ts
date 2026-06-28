import { runConsensus } from "@/lib/investments/consensus/consensus";
import { withGuard } from "@/lib/security/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Multi-Agent Consensus — Hermes orchestrates private specialists above a
// confidence threshold. Reuses Market Intelligence Tool + AI Router. No advice.
export const POST = (req: Request) => withGuard(req, "consensus", () => handlePOST(req));

async function handlePOST(req: Request) {
  let body: { ticker?: string; threshold?: number; holdings?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected JSON" }, { status: 400 });
  }
  if (!body.ticker?.trim()) return Response.json({ error: "ticker required" }, { status: 400 });
  const threshold = typeof body.threshold === "number" ? Math.max(0, Math.min(1, body.threshold)) : 0.6;

  try {
    const result = await runConsensus(body.ticker.trim(), threshold, body.holdings ?? []);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
