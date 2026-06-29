import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sessionFromRequest } from "@/lib/auth/session";
import { scaffoldAgent, type AgentSpec } from "@/lib/agents/factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_CONFIG = JSON.stringify({ model: "qwen/qwen3-coder:free", maxFilesPerTarget: 18, targets: [] });

// Admin-only. Returns the artifacts for a NEW self-improving agent (config
// target + executor stub + registry snippet) as a PREVIEW. Nothing is written
// here — you apply it through NEXERA Code or the self-improve PR flow, so a new
// agent is always reviewed before it joins the daily loop.
export async function POST(req: Request) {
  const session = await sessionFromRequest(req);
  if (session?.r !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: { spec?: AgentSpec };
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const spec = body.spec;
  if (!spec?.id || !spec.name || !spec.instruction || !Array.isArray(spec.globs)) {
    return Response.json({ error: "spec requires id, name, instruction, globs[]" }, { status: 400 });
  }

  let configText = FALLBACK_CONFIG;
  try { configText = await readFile(join(process.cwd(), "scripts/self-improve.config.json"), "utf8"); } catch { /* use fallback */ }

  try {
    const scaffold = scaffoldAgent(spec, configText);
    return Response.json({ ok: true, ...scaffold });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
