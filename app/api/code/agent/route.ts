import { NextResponse } from "next/server";
import { completeWithFallback } from "@/lib/llm/infer";
import { sessionFromRequest } from "@/lib/auth/session";
import {
  CODE_SYSTEM,
  extractJson,
  buildFolderContext,
  type AgentPlan,
} from "@/lib/llm/codeAgent";
import { withGuard } from "@/lib/security/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stateless coding agent. The client (NEXERA Code, via the File System Access
// API) owns the folder: it sends the file list + contents here, gets back a
// JSON plan, and applies the create/edit/delete operations to disk itself.
// Nothing is read from or written to the server's filesystem.
export const POST = (req: Request) => withGuard(req, "llm", () => handlePOST(req));

async function handlePOST(req: Request) {
  // Any signed-in user may run it (middleware already requires a session for
  // /api/*; this is a belt-and-braces guard).
  const session = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    instruction?: string;
    files?: { path: string; content: string }[];
    providerId?: string;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const instruction = body.instruction?.trim();
  if (!instruction) {
    return NextResponse.json({ error: "instruction required" }, { status: 400 });
  }

  const files = (body.files ?? []).filter(
    (f) => f && typeof f.path === "string" && typeof f.content === "string",
  );
  const folderContext = buildFolderContext(files);
  const userMsg = `${folderContext}\n\n========\nTASK: ${instruction}`;

  const result = await completeWithFallback(
    CODE_SYSTEM,
    [{ role: "user", content: userMsg }],
    { providerId: body.providerId, model: body.model },
    { maxTokens: 16000 },
  );
  if (!result) {
    return NextResponse.json(
      { error: "No model available. Configure a provider in Admin." },
      { status: 503 },
    );
  }

  const json = extractJson(result.text);
  if (!json) {
    return NextResponse.json(
      { error: "Model did not return a valid plan", raw: result.text.slice(0, 800) },
      { status: 422 },
    );
  }

  let plan: AgentPlan;
  try {
    plan = JSON.parse(json) as AgentPlan;
  } catch {
    return NextResponse.json(
      { error: "Plan JSON parse failed", raw: json.slice(0, 800) },
      { status: 422 },
    );
  }

  // Sanitize paths — the client applies these to a real folder.
  const safe = (p: string) =>
    typeof p === "string" &&
    p.length > 0 &&
    !p.startsWith("/") &&
    !p.includes("..") &&
    !/^[a-zA-Z]:/.test(p);

  const filesOut = (plan.files ?? [])
    .filter((f) => safe(f.path) && typeof f.content === "string")
    .map((f) => ({ path: f.path, content: f.content, action: f.action ?? "edit" }));
  const deletedOut = (plan.deleted ?? []).filter(safe);

  return NextResponse.json({
    ok: true,
    summary: plan.summary ?? "",
    notes: plan.notes ?? "",
    files: filesOut,
    deleted: deletedOut,
    provider: result.provider,
    model: result.model,
  });
}
