import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sessionFromRequest } from "@/lib/auth/session";
import { addRun, getRuns, type RunEntry } from "@/lib/evolution/runlog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — any signed-in user reads the self-improve activity log (in-memory runs
// posted by the loop, plus the on-disk log file for local dev).
export async function GET(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let fileRuns: RunEntry[] = [];
  try {
    const raw = await readFile(join(process.cwd(), "scripts/.last-run.json"), "utf8");
    const parsed = JSON.parse(raw) as { at: string; results?: { agent: string; model?: string; summary?: string; risk?: RunEntry["risk"]; paths?: string[]; pr?: string; dryRun?: boolean }[] };
    fileRuns = (parsed.results ?? []).map((r, i) => ({
      id: `file-${i}`, at: parsed.at, agent: r.agent, model: r.model ?? "free-oss",
      summary: r.summary ?? "", risk: r.risk ?? "medium", files: r.paths ?? [], pr: r.pr ?? null, dryRun: r.dryRun,
    }));
  } catch { /* no local file */ }

  // in-memory runs first (most recent live activity), then de-dupe local file
  const mem = getRuns();
  return Response.json({ runs: mem.length ? mem : fileRuns });
}

// POST — the self-improve loop reports a completed change. Authed by CRON_SECRET
// (the GitHub Action sets it) so the live site reflects real runs.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authed = secret && req.headers.get("authorization") === `Bearer ${secret}`;
  const session = await sessionFromRequest(req);
  if (!authed && session?.r !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: Partial<RunEntry>;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.agent || !body.model) return Response.json({ error: "agent + model required" }, { status: 400 });

  const entry = addRun({
    agent: body.agent, model: body.model, summary: body.summary ?? "", risk: body.risk ?? "medium",
    files: body.files ?? [], pr: body.pr ?? null, dryRun: body.dryRun ?? false,
  });
  return Response.json({ ok: true, entry });
}
