import { runCycle } from "@/lib/evolution/director";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily evolution tick. Vercel Cron hits this (it sends the `x-vercel-cron`
// header); a manual call must carry `Authorization: Bearer $CRON_SECRET`.
//
// NOTE: this runs the OBSERVE → PROPOSE → SCORE cycle only. It never writes
// code or deploys — the actual codegen + PR pipeline runs in the GitHub Action
// (scripts/self-improve.mjs), which has the repo checked out and a writable FS.
// Vercel functions are read-only and cannot git push, by design.
export async function GET(req: Request) {
  const isCron = req.headers.get("x-vercel-cron") !== null;
  const secret = process.env.CRON_SECRET;
  const authed = secret && req.headers.get("authorization") === `Bearer ${secret}`;
  if (!isCron && !authed) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = runCycle();
  return Response.json({
    ok: true,
    ranAt: new Date().toISOString(),
    summary: report.summary,
    proposals: report.proposals.length,
    note: "Proposals refreshed. Code changes ship via the GitHub Action (PR-gated).",
  });
}
