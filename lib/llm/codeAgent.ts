import "server-only";

// Shared coding-agent plumbing: the system prompt the model must obey, the
// JSON-plan shape it returns, and a tolerant extractor for that JSON. Used by
// the stateless /api/code/agent route (client owns the files via the File
// System Access API) and the legacy server-disk /api/workspace/agent route.

export type EditFile = { path: string; content: string; action?: "create" | "edit" };
export type AgentPlan = {
  summary?: string;
  files?: EditFile[];
  deleted?: string[];
  notes?: string;
};

export const CODE_SYSTEM = `You are NEXERA Coder, an autonomous coding agent working INSIDE a user's project folder (like Claude Code / Cursor). You can read the existing files and create or edit files to build what the user asks.

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
export function extractJson(text: string): string | null {
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

// Total chars of file content fed to the model as context.
export const CONTEXT_BUDGET = 90_000;

// Build the folder-context block from a list of {path, content} files.
export function buildFolderContext(files: { path: string; content: string }[]): string {
  if (files.length === 0) return "The project folder is currently EMPTY.";
  let used = 0;
  const contents: string[] = [];
  for (const f of files) {
    if (used >= CONTEXT_BUDGET) {
      contents.push(`\n--- ${f.path} ---\n[omitted — context budget reached]`);
      continue;
    }
    const slice = (f.content ?? "").slice(0, CONTEXT_BUDGET - used);
    used += slice.length;
    contents.push(`\n--- ${f.path} ---\n${slice}`);
  }
  const list = files.map((f) => f.path).join("\n");
  return `Project files (${files.length}):\n${list}\n\nFile contents:${contents.join("\n")}`;
}
