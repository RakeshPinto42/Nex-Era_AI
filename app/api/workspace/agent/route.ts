import { NextResponse } from "next/server";
import { completeWithFallback } from "@/lib/llm/infer";
import { listFiles, readFile, writeFile, deleteFile } from "@/lib/workspace/fsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Total chars of existing file content fed to the model as context.
const CONTEXT_BUDGET = 90_000;

type EditFile = { path: string; content: string; action?: "create" | "edit" };
type AgentPlan = {
  summary?: string;
  files?: EditFile[];
  deleted?: string[];
  notes?: string;
};

const SYSTEM = `You are Mesh Coder, an autonomous coding agent working INSIDE a user's project folder (like Cursor). You can read the existing files and create or edit files to build what the user asks.

You MUST respond with ONE JSON object and nothing else — no prose, no markdown fences. Schema:
{
  "summary": "one sentence on what you did",
  "files": [ { "path": "relative/path.ext", "action": "create" | "edit", "content": "FULL new file content" } ],
  "deleted": [ "relative/path/to/remove.ext" ],
  "notes": "anything the user should know / how to run it"
}

Rules:
- Paths are relative to the project root. Use forward slashes. Never use absolute paths or "..".
- "content" must be the COMPLETE file, not a diff or snippet.
- Only include files you actually create or change. Keep edits minimal and consistent with the existing code style you see.
- If the folder is empty, scaffold a sensible minimal project for the request.
- Prefer few, focused files. Do not touch node_modules, .git, lockfiles.
- Output valid JSON. Escape newlines in "content" as \\n.`;

// Pull the first balanced JSON object out of a model response (tolerates fences
// or stray prose around it).
function extractJson(text: string): string | null {
  // Only unwrap a fence if the WHOLE response is fenced — otherwise ``` inside
  // a JSON string value (e.g. a README's code block) would corrupt extraction.
  const trimmed = text.trim();
  let body = text;
  if (trimmed.startsWith("```")) {
    const m = trimmed.match(/```(?:json)?\s*([\s\S]*?)```\s*$/);
    if (m) body = m[1];
  }
  const start = body.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return body.slice(start, i + 1);
    }
  }
  return null;
}

export async function POST(req: Request) {
  let body: { instruction?: string; providerId?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const instruction = body.instruction?.trim();
  if (!instruction) {
    return NextResponse.json({ error: "instruction required" }, { status: 400 });
  }

  // Build folder context: file list + contents within budget.
  let files: string[];
  try {
    files = await listFiles();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  let used = 0;
  const contents: string[] = [];
  for (const f of files) {
    if (used >= CONTEXT_BUDGET) {
      contents.push(`\n--- ${f} ---\n[omitted — context budget reached]`);
      continue;
    }
    const c = await readFile(f).catch(() => "");
    const slice = c.slice(0, CONTEXT_BUDGET - used);
    used += slice.length;
    contents.push(`\n--- ${f} ---\n${slice}`);
  }

  const folderContext =
    files.length === 0
      ? "The project folder is currently EMPTY."
      : `Project files (${files.length}):\n${files.join("\n")}\n\nFile contents:${contents.join("\n")}`;

  const userMsg = `${folderContext}\n\n========\nTASK: ${instruction}`;

  const result = await completeWithFallback(
    SYSTEM,
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

  // Apply to disk.
  const applied: { path: string; action: string }[] = [];
  const errors: { path: string; error: string }[] = [];

  for (const f of plan.files ?? []) {
    if (!f.path || typeof f.content !== "string") continue;
    try {
      await writeFile(f.path, f.content);
      applied.push({ path: f.path, action: f.action ?? "edit" });
    } catch (e) {
      errors.push({ path: f.path, error: (e as Error).message });
    }
  }
  for (const p of plan.deleted ?? []) {
    try {
      await deleteFile(p);
      applied.push({ path: p, action: "delete" });
    } catch (e) {
      errors.push({ path: p, error: (e as Error).message });
    }
  }

  return NextResponse.json({
    ok: true,
    summary: plan.summary ?? "",
    notes: plan.notes ?? "",
    applied,
    errors,
    provider: result.provider,
    model: result.model,
  });
}
