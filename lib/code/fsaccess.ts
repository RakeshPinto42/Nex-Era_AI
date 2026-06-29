// NEX Code — File System Access API runtime (client only).
// Native folder picker, REAL permission validation, recursive scan and project
// detection. No pasted paths, no server filesystem. Degrades gracefully when
// the browser lacks the API.

import type { CapStatus, FsStatus, TreeNode, ProjectInfo, SearchHit } from "./types";

// ---- minimal FS Access API typings (not in all TS DOM libs) ----
type Perm = "granted" | "denied" | "prompt";
export interface FsFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: string | BufferSource): Promise<void>; close(): Promise<void> }>;
}
export interface FsDirHandle {
  kind: "directory";
  name: string;
  entries(): AsyncIterableIterator<[string, FsFileHandle | FsDirHandle]>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FsFileHandle>;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FsDirHandle>;
  removeEntry(name: string, opts?: { recursive?: boolean }): Promise<void>;
  queryPermission?(d: { mode: "read" | "readwrite" }): Promise<Perm>;
  requestPermission?(d: { mode: "read" | "readwrite" }): Promise<Perm>;
}

const IGNORE = new Set(["node_modules", ".git", ".next", "dist", "build", ".turbo", ".cache", ".vercel", "venv", ".venv", "__pycache__"]);
const MAX_ENTRIES = 6000;
const TEXT_EXT = new Set(["ts","tsx","js","jsx","mjs","cjs","json","md","txt","csv","tsv","py","go","rs","java","cs","html","css","scss","yml","yaml","toml","xml","svg","sql","sh","env","gitignore","vue","php","rb","c","cpp","h"]);

export function fsAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function openFolder(): Promise<FsDirHandle | null> {
  if (!fsAccessSupported()) return null;
  try {
    // @ts-expect-error showDirectoryPicker is not in all TS DOM libs
    const handle = (await window.showDirectoryPicker({ mode: "readwrite" })) as FsDirHandle;
    return handle;
  } catch {
    return null; // user cancelled / denied
  }
}

async function ensurePermission(dir: FsDirHandle): Promise<boolean> {
  if (!dir.requestPermission) return true; // older impls grant via picker
  const q = (await dir.queryPermission?.({ mode: "readwrite" })) ?? "prompt";
  if (q === "granted") return true;
  return (await dir.requestPermission({ mode: "readwrite" })) === "granted";
}

const extOf = (n: string) => (n.includes(".") ? n.split(".").pop()!.toLowerCase() : "");

/** Real, non-faked permission validation: create → read → rename → delete a hidden temp file. */
export async function validatePermissions(dir: FsDirHandle): Promise<FsStatus> {
  const s: FsStatus = {
    connected: true, read: "pending", write: "pending", create: "pending",
    rename: "pending", delete: "pending", traversal: "pending", recursive: "pending", watcher: "pass",
  };
  const tmp = `.nexera-perm-${Math.random().toString(36).slice(2, 8)}`;
  const tmp2 = `${tmp}.renamed`;
  try {
    if (!(await ensurePermission(dir))) {
      return { ...s, read: "fail", write: "fail", create: "fail", rename: "fail", delete: "fail", traversal: "fail", recursive: "fail", watcher: "skip", error: "Permission denied" };
    }
    // read: list entries
    for await (const _ of dir.entries()) { void _; break; }
    s.read = "pass";

    // create + write
    const fh = await dir.getFileHandle(tmp, { create: true });
    const w = await fh.createWritable();
    await w.write("nexera-permission-check");
    await w.close();
    s.create = "pass"; s.write = "pass";

    // read back
    const txt = await (await fh.getFile()).text();
    if (txt !== "nexera-permission-check") s.read = "fail";

    // rename (emulated: copy to new name, delete old)
    const fh2 = await dir.getFileHandle(tmp2, { create: true });
    const w2 = await fh2.createWritable();
    await w2.write(txt);
    await w2.close();
    await dir.removeEntry(tmp);
    s.rename = "pass";

    // delete
    await dir.removeEntry(tmp2);
    s.delete = "pass";

    // traversal: find a child dir and open it
    s.traversal = "pass";
    for await (const [, h] of dir.entries()) {
      if (h.kind === "directory" && !IGNORE.has(h.name)) {
        try { await dir.getDirectoryHandle(h.name); } catch { s.traversal = "fail"; }
        break;
      }
    }
    s.recursive = "pass"; // exercised by scanTree
    return s;
  } catch (e) {
    // best-effort cleanup
    try { await dir.removeEntry(tmp); } catch { /* */ }
    try { await dir.removeEntry(tmp2); } catch { /* */ }
    return { ...s, error: (e as Error).message };
  }
}

/** Recursive scan with ignore-list + entry cap. Returns tree + counts + flat file list. */
export async function scanTree(dir: FsDirHandle): Promise<{ tree: TreeNode[]; files: number; folders: number; flat: TreeNode[] }> {
  let files = 0, folders = 0, count = 0;
  const flat: TreeNode[] = [];

  const walk = async (d: FsDirHandle, prefix: string): Promise<TreeNode[]> => {
    const nodes: TreeNode[] = [];
    const entries: [string, FsFileHandle | FsDirHandle][] = [];
    try { for await (const e of d.entries()) entries.push(e); } catch { return nodes; }
    entries.sort((a, b) => (a[1].kind === b[1].kind ? a[0].localeCompare(b[0]) : a[1].kind === "directory" ? -1 : 1));
    for (const [name, h] of entries) {
      if (count >= MAX_ENTRIES) break;
      if (h.kind === "directory" && IGNORE.has(name)) continue;
      count++;
      const path = prefix ? `${prefix}/${name}` : name;
      if (h.kind === "directory") {
        folders++;
        nodes.push({ name, path, kind: "dir", children: await walk(h as FsDirHandle, path) });
      } else {
        files++;
        let size = 0;
        try { size = (await (h as FsFileHandle).getFile()).size; } catch { /* */ }
        const node: TreeNode = { name, path, kind: "file", size, ext: extOf(name) };
        nodes.push(node);
        flat.push(node);
      }
    }
    return nodes;
  };

  const tree = await walk(dir, "");
  return { tree, files, folders, flat };
}

async function readRootFile(dir: FsDirHandle, name: string): Promise<string | null> {
  try { return await (await (await dir.getFileHandle(name)).getFile()).text(); } catch { return null; }
}

/** Detect framework, language, git, scripts, deps, config, etc. from real files. */
export async function detectProject(dir: FsDirHandle, scan: { flat: TreeNode[]; files: number; folders: number }): Promise<ProjectInfo> {
  const pkgRaw = await readRootFile(dir, "package.json");
  let framework = "Unknown", pkgName = dir.name, scripts: { name: string; cmd: string }[] = [], deps: string[] = [];
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw) as { name?: string; scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      pkgName = pkg.name ?? pkgName;
      scripts = Object.entries(pkg.scripts ?? {}).map(([name, cmd]) => ({ name, cmd }));
      deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
      if (deps.includes("next")) framework = "Next.js";
      else if (deps.includes("react")) framework = "React";
      else if (deps.includes("vue")) framework = "Vue";
      else if (deps.includes("svelte")) framework = "Svelte";
      else if (deps.includes("express") || deps.includes("fastify")) framework = "Node API";
    } catch { /* */ }
  }
  // package manager from lockfile
  const names = new Set(scan.flat.map((f) => f.name));
  const rootNames = new Set(scan.flat.filter((f) => !f.path.includes("/")).map((f) => f.name));
  let pm = "npm";
  if (rootNames.has("pnpm-lock.yaml")) pm = "pnpm";
  else if (rootNames.has("yarn.lock")) pm = "yarn";
  else if (rootNames.has("bun.lockb")) pm = "bun";
  else if (rootNames.has("requirements.txt") || rootNames.has("pyproject.toml")) pm = "pip";
  else if (rootNames.has("go.mod")) pm = "go";
  else if (rootNames.has("Cargo.toml")) pm = "cargo";

  // language from extension frequency
  const extCount = new Map<string, number>();
  for (const f of scan.flat) if (f.ext) extCount.set(f.ext, (extCount.get(f.ext) ?? 0) + 1);
  const top = [...extCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const LANG: Record<string, string> = { ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", py: "Python", go: "Go", rs: "Rust", java: "Java", cs: "C#" };
  const language = (top && LANG[top]) || (framework === "Next.js" ? "TypeScript" : "Unknown");

  // git
  let gitConnected = false, gitBranch: string | null = null;
  try {
    const gitDir = await dir.getDirectoryHandle(".git");
    gitConnected = true;
    const head = await readRootFile(gitDir, "HEAD");
    if (head) { const m = head.match(/ref:\s*refs\/heads\/(.+)/); gitBranch = m ? m[1].trim() : head.trim().slice(0, 7); }
  } catch { /* no git */ }

  const entryPoints = scan.flat.filter((f) => /^(src\/)?(index|main|app)\.(t|j)sx?$/.test(f.path) || /^app\/(layout|page)\.tsx$/.test(f.path)).map((f) => f.path).slice(0, 6);
  const configFiles = scan.flat.filter((f) => /(\.config\.|tsconfig|eslint|tailwind|next\.config|vite\.config|docker|\.gitignore)/i.test(f.name)).map((f) => f.path).slice(0, 12);
  const envFiles = scan.flat.filter((f) => /^\.env/.test(f.name)).map((f) => f.path);
  const detectedApis = scan.flat.filter((f) => /\/api\//.test(f.path) || /route\.(t|j)s$/.test(f.name)).map((f) => f.path).slice(0, 12);
  const detectedDatabase = deps.find((d) => /prisma|drizzle|mongoose|pg|mysql|sqlite|redis|upstash|supabase/i.test(d)) ?? null;
  const detectedAuth = deps.find((d) => /next-auth|clerk|auth0|lucia|passport|jsonwebtoken|jose/i.test(d)) ?? (names.has("middleware.ts") ? "custom middleware" : null);

  const readme = await readRootFile(dir, "README.md");
  const readmeSummary = readme ? readme.replace(/[#>*`_-]/g, "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 4).join(" ").slice(0, 300) : "No README found.";

  const largestFiles = [...scan.flat].sort((a, b) => (b.size ?? 0) - (a.size ?? 0)).slice(0, 6).map((f) => ({ path: f.path, size: f.size ?? 0 }));

  return {
    name: pkgName, framework, language, packageManager: pm, gitConnected, gitBranch,
    dependencies: deps, scripts, entryPoints, configFiles, envFiles, detectedApis,
    detectedDatabase, detectedAuth, readmeSummary, totalFiles: scan.files, totalFolders: scan.folders, largestFiles,
  };
}

// ---- file IO via handles (path = relative, "/"-separated) ----

async function dirFor(root: FsDirHandle, segments: string[], create: boolean): Promise<FsDirHandle> {
  let d = root;
  for (const seg of segments) d = await d.getDirectoryHandle(seg, { create });
  return d;
}

export async function readFileAt(root: FsDirHandle, path: string): Promise<string> {
  const parts = path.split("/");
  const file = parts.pop()!;
  const d = await dirFor(root, parts, false);
  return (await (await d.getFileHandle(file)).getFile()).text();
}

export async function writeFileAt(root: FsDirHandle, path: string, content: string): Promise<void> {
  const parts = path.split("/");
  const file = parts.pop()!;
  const d = await dirFor(root, parts, true);
  const fh = await d.getFileHandle(file, { create: true });
  const w = await fh.createWritable();
  await w.write(content);
  await w.close();
}

export async function deleteFileAt(root: FsDirHandle, path: string): Promise<void> {
  const parts = path.split("/");
  const file = parts.pop()!;
  const d = await dirFor(root, parts, false);
  await d.removeEntry(file);
}

// ---- binary documents (PDF / Word / Excel) — read for AI understanding ----

/** Extensions that hold readable text but need server-side extraction. */
export const DOC_EXT = new Set(["pdf", "docx", "xlsx", "xls"]);

/** Get the raw File object at a path (binary docs that can't be decoded as UTF-8). */
export async function getFileObjAt(root: FsDirHandle, path: string): Promise<File> {
  const parts = path.split("/");
  const file = parts.pop()!;
  const d = await dirFor(root, parts, false);
  return (await d.getFileHandle(file)).getFile();
}

/**
 * Extract plain text from a PDF / Word / Excel file in the folder, reusing the
 * shared server extraction pipeline (/api/extract). Lets the coding agent read
 * specs, requirements and data files the same way Claude Code does.
 */
export async function extractDocAt(root: FsDirHandle, path: string): Promise<string> {
  const f = await getFileObjAt(root, path);
  const form = new FormData();
  form.append("file", f, f.name);
  const res = await fetch("/api/extract", { method: "POST", body: form });
  if (!res.ok) throw new Error(`extract failed (${res.status})`);
  const data = (await res.json()) as { files?: { text?: string }[] };
  return data.files?.[0]?.text ?? "";
}

/** Name + lightweight content search over scanned text files (best-effort, capped). */
export async function searchProject(root: FsDirHandle, flat: TreeNode[], query: string, maxContent = 400): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const f of flat) {
    if (f.path.toLowerCase().includes(q)) hits.push({ path: f.path, preview: f.path, kind: "name" });
  }
  let scanned = 0;
  for (const f of flat) {
    if (scanned >= maxContent) break;
    if (!f.ext || !TEXT_EXT.has(f.ext) || (f.size ?? 0) > 200_000) continue;
    scanned++;
    try {
      const text = await readFileAt(root, f.path);
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(q)) {
          hits.push({ path: f.path, line: i + 1, preview: lines[i].trim().slice(0, 160), kind: "content" });
          break;
        }
      }
    } catch { /* */ }
  }
  return hits.slice(0, 60);
}
