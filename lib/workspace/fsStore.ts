// Real on-disk workspace for the coding agent. A single root folder is chosen
// by the user (typed path); all reads/writes are sandboxed inside it. The
// chosen root persists in .rak/workspace.json.
//
// SECURITY: every path is resolved and verified to stay within the root, so the
// agent can never read/write outside the folder the user opened.

import "server-only";
import { promises as fs } from "fs";
import path from "path";

const DIR = path.join(process.cwd(), ".rak");
const CONFIG = path.join(DIR, "workspace.json");

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".rak",
  "dist",
  "build",
  ".venv",
  "venv",
  "__pycache__",
  ".turbo",
  ".cache",
]);

const TEXT_EXT = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "md", "txt", "csv", "py",
  "html", "css", "scss", "yml", "yaml", "toml", "env", "sh", "sql", "go",
  "rs", "java", "rb", "php", "c", "cpp", "h", "xml", "svg", "gitignore",
]);

const MAX_FILE_BYTES = 256 * 1024; // 256 KB per file read
const MAX_TREE_ENTRIES = 4000;

export type WsTreeNode = {
  name: string;
  path: string; // relative to root, forward slashes
  isDir: boolean;
  children?: WsTreeNode[];
};

// ---- root config ----

export async function getRoot(): Promise<string | null> {
  try {
    const raw = await fs.readFile(CONFIG, "utf8");
    return (JSON.parse(raw) as { root?: string }).root ?? null;
  } catch {
    return null;
  }
}

export async function setRoot(root: string): Promise<string> {
  // Windows "Copy as path" wraps the path in double quotes; strip quotes +
  // whitespace so the paste works as-is.
  const cleaned = root.trim().replace(/^["']|["']$/g, "").trim();
  const resolved = path.resolve(cleaned);
  const stat = await fs.stat(resolved); // throws if missing
  if (!stat.isDirectory()) throw new Error("Not a directory");
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(CONFIG, JSON.stringify({ root: resolved }, null, 2), "utf8");
  return resolved;
}

async function requireRoot(): Promise<string> {
  const root = await getRoot();
  if (!root) throw new Error("No workspace folder opened");
  return root;
}

// Resolve a relative path and guarantee it stays inside the root.
function safeJoin(root: string, rel: string): string {
  const clean = rel.replace(/^[/\\]+/, "");
  const abs = path.resolve(root, clean);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (abs !== root && !abs.startsWith(rootWithSep)) {
    throw new Error("Path escapes workspace root");
  }
  return abs;
}

function relPath(root: string, abs: string): string {
  return path.relative(root, abs).split(path.sep).join("/");
}

export function isTextFile(p: string): boolean {
  const base = p.split("/").pop() ?? "";
  if (!base.includes(".")) return true; // Dockerfile, Makefile, etc.
  const ext = base.split(".").pop()!.toLowerCase();
  return TEXT_EXT.has(ext);
}

// ---- tree ----

export async function readTree(): Promise<{ root: string; tree: WsTreeNode[] }> {
  const root = await requireRoot();
  let count = 0;

  const walk = async (abs: string): Promise<WsTreeNode[]> => {
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      return [];
    }
    const nodes: WsTreeNode[] = [];
    // dirs first then files, alphabetical
    entries.sort((a, b) =>
      a.isDirectory() === b.isDirectory()
        ? a.name.localeCompare(b.name)
        : a.isDirectory()
          ? -1
          : 1,
    );
    for (const e of entries) {
      if (count >= MAX_TREE_ENTRIES) break;
      if (e.name.startsWith(".") && e.name !== ".env" && e.name !== ".gitignore") {
        if (IGNORE_DIRS.has(e.name)) continue;
      }
      if (e.isDirectory() && IGNORE_DIRS.has(e.name)) continue;
      count++;
      const childAbs = path.join(abs, e.name);
      const node: WsTreeNode = {
        name: e.name,
        path: relPath(root, childAbs),
        isDir: e.isDirectory(),
      };
      if (e.isDirectory()) node.children = await walk(childAbs);
      nodes.push(node);
    }
    return nodes;
  };

  return { root, tree: await walk(root) };
}

// Flat list of text-file paths (for agent context / globbing).
export async function listFiles(): Promise<string[]> {
  const { tree } = await readTree();
  const out: string[] = [];
  const rec = (nodes: WsTreeNode[]) => {
    for (const n of nodes) {
      if (n.isDir) rec(n.children ?? []);
      else if (isTextFile(n.path)) out.push(n.path);
    }
  };
  rec(tree);
  return out;
}

// ---- file io ----

export async function readFile(rel: string): Promise<string> {
  const root = await requireRoot();
  const abs = safeJoin(root, rel);
  const stat = await fs.stat(abs);
  if (stat.size > MAX_FILE_BYTES) {
    return `[file too large to display: ${(stat.size / 1024).toFixed(0)} KB]`;
  }
  return fs.readFile(abs, "utf8");
}

export async function writeFile(rel: string, content: string): Promise<void> {
  const root = await requireRoot();
  const abs = safeJoin(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");
}

export async function deleteFile(rel: string): Promise<void> {
  const root = await requireRoot();
  const abs = safeJoin(root, rel);
  await fs.rm(abs, { force: true });
}
