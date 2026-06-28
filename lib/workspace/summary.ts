// Workspace Intelligence — structural project analysis (Phase 1B).
//
// Walks the opened workspace folder and computes a summary: file/folder counts,
// total size, languages/file-types, last-modified, important files and recently
// changed files. Reuses the user-selected root from fsStore (getRoot).
//
// STRUCTURAL ONLY — no LLM calls, no editing, no git, no terminal.

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getRoot } from "./fsStore";
import type {
  WorkspaceSummary,
  WorkspaceType,
  LanguageStat,
  ImportantFile,
  ChangedFile,
} from "./model";

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

const MAX_ENTRIES = 8000;

// Extension → friendly language / type label.
const LANG_LABEL: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript (React)", js: "JavaScript", jsx: "JavaScript (React)",
  mjs: "JavaScript", cjs: "JavaScript", py: "Python", go: "Go", rs: "Rust", java: "Java",
  rb: "Ruby", php: "PHP", c: "C", cpp: "C++", h: "C/C++ Header", cs: "C#", swift: "Swift",
  kt: "Kotlin", json: "JSON", md: "Markdown", txt: "Text", csv: "CSV", html: "HTML",
  css: "CSS", scss: "SCSS", yml: "YAML", yaml: "YAML", toml: "TOML", sql: "SQL",
  sh: "Shell", xml: "XML", svg: "SVG", png: "Image", jpg: "Image", jpeg: "Image",
  gif: "Image", webp: "Image", pdf: "PDF", xlsx: "Excel", ipynb: "Jupyter",
};

// Well-known important files → why they matter.
const IMPORTANT: Record<string, string> = {
  "package.json": "Node manifest",
  "package-lock.json": "Dependency lock",
  "tsconfig.json": "TypeScript config",
  "next.config.mjs": "Next.js config",
  "next.config.js": "Next.js config",
  "tailwind.config.ts": "Tailwind config",
  "requirements.txt": "Python deps",
  "pyproject.toml": "Python project",
  "go.mod": "Go module",
  "cargo.toml": "Rust manifest",
  "dockerfile": "Container build",
  "docker-compose.yml": "Compose stack",
  "readme.md": "Project readme",
  ".env": "Environment config",
  ".gitignore": "Git ignore rules",
  "main.py": "Python entrypoint",
  "makefile": "Build tasks",
};

function extOf(name: string): string {
  const base = name.toLowerCase();
  if (!base.includes(".")) return "";
  return base.split(".").pop() ?? "";
}

function guessType(langs: LanguageStat[], important: ImportantFile[]): WorkspaceType {
  const has = (p: string) => important.some((f) => f.path.toLowerCase().endsWith(p));
  const topExts = new Set(langs.slice(0, 4).map((l) => l.ext));
  if (has("package.json") || topExts.has("ts") || topExts.has("tsx") || topExts.has("py") || topExts.has("go"))
    return "code";
  if (topExts.has("csv") || topExts.has("xlsx")) return "finance";
  if (topExts.has("ipynb")) return "research";
  if (topExts.has("md") || topExts.has("pdf") || topExts.has("txt")) return "documents";
  return "unknown";
}

export async function summarizeWorkspace(): Promise<WorkspaceSummary> {
  const root = await getRoot();
  if (!root) throw new Error("No workspace folder opened");

  let totalFiles = 0;
  let totalFolders = 0;
  let totalBytes = 0;
  let lastModified = 0;
  let count = 0;

  const byExt = new Map<string, { count: number; bytes: number }>();
  const importantFiles: ImportantFile[] = [];
  const changed: ChangedFile[] = [];

  const rel = (abs: string) => path.relative(root, abs).split(path.sep).join("/");

  const walk = async (abs: string): Promise<void> => {
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (count >= MAX_ENTRIES) return;
      if (e.isDirectory() && IGNORE_DIRS.has(e.name)) continue;
      count++;
      const childAbs = path.join(abs, e.name);
      if (e.isDirectory()) {
        totalFolders++;
        await walk(childAbs);
        continue;
      }
      totalFiles++;
      let size = 0;
      let mtimeMs = 0;
      try {
        const st = await fs.stat(childAbs);
        size = st.size;
        mtimeMs = st.mtimeMs;
      } catch {
        /* unreadable file — skip stats */
      }
      totalBytes += size;
      if (mtimeMs > lastModified) lastModified = mtimeMs;

      const ext = extOf(e.name);
      const agg = byExt.get(ext) ?? { count: 0, bytes: 0 };
      agg.count++;
      agg.bytes += size;
      byExt.set(ext, agg);

      const reason = IMPORTANT[e.name.toLowerCase()];
      if (reason && importantFiles.length < 24) {
        importantFiles.push({ path: rel(childAbs), reason });
      }
      if (mtimeMs > 0) {
        changed.push({ path: rel(childAbs), modifiedAt: new Date(mtimeMs).toISOString(), bytes: size });
      }
    }
  };

  await walk(root);

  const languages: LanguageStat[] = [...byExt.entries()]
    .filter(([ext]) => ext)
    .map(([ext, v]) => ({ ext, label: LANG_LABEL[ext] ?? ext.toUpperCase(), count: v.count, bytes: v.bytes }))
    .sort((a, b) => b.count - a.count);

  const recentlyChanged = changed
    .sort((a, b) => +new Date(b.modifiedAt) - +new Date(a.modifiedAt))
    .slice(0, 10);

  // Root-level important files first.
  importantFiles.sort((a, b) => a.path.split("/").length - b.path.split("/").length);

  return {
    root,
    name: path.basename(root),
    type: guessType(languages, importantFiles),
    totalFiles,
    totalFolders,
    totalBytes,
    lastModified: lastModified ? new Date(lastModified).toISOString() : null,
    languages,
    importantFiles,
    recentlyChanged,
  };
}
