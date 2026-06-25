"use client";

// Real local folder read/write via the File System Access API (Chrome/Edge).
// The picked directory handle is retained so edits persist to the user's disk.
// PDF/Word/Excel are sent to /api/extract so their text lands in the VFS for
// the model to read. Falls back gracefully where the API is unavailable.

import { langFor, type VFS } from "./vfs";

const TEXT_EXT = new Set([
  "md", "txt", "py", "js", "ts", "tsx", "jsx", "json", "csv", "tsv", "yml",
  "yaml", "toml", "cfg", "ini", "sh", "bash", "html", "htm", "css", "scss",
  "xml", "sql", "go", "rs", "java", "c", "h", "cpp", "rb", "php", "env",
]);
const DOC_EXT = new Set(["pdf", "docx", "xlsx", "xls"]);
const MAX_TEXT_BYTES = 400_000;

// Minimal standalone typing for the parts of the API not in the standard DOM
// lib (entries iterator, permission queries, writable streams).
type FileHandle = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{ write: (d: string) => Promise<void>; close: () => Promise<void> }>;
};
type DirHandle = {
  kind: "directory";
  name: string;
  entries: () => AsyncIterable<[string, DirHandle | FileHandle]>;
  getDirectoryHandle: (name: string, opts?: { create?: boolean }) => Promise<DirHandle>;
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<FileHandle>;
  removeEntry: (name: string, opts?: { recursive?: boolean }) => Promise<void>;
  queryPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
};

export type LoadResult = {
  vfs: VFS;
  handles: Map<string, FileHandle>;
  /** Paths whose content is extracted text, not the raw bytes (read-only). */
  docPaths: Set<string>;
  name: string;
};

export function fsAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickDirectory(): Promise<DirHandle | null> {
  const w = window as unknown as { showDirectoryPicker?: (o?: unknown) => Promise<DirHandle> };
  if (!w.showDirectoryPicker) return null;
  return w.showDirectoryPicker({ mode: "readwrite" });
}

export async function ensureRW(handle: DirHandle): Promise<boolean> {
  if (!handle.queryPermission) return true; // older impls grant on pick
  if ((await handle.queryPermission({ mode: "readwrite" })) === "granted") return true;
  return (await handle.requestPermission?.({ mode: "readwrite" })) === "granted";
}

async function extractDocs(files: { path: string; file: File }[]): Promise<Record<string, string>> {
  if (files.length === 0) return {};
  const form = new FormData();
  files.forEach((f) => form.append("file", f.file, f.path));
  try {
    const res = await fetch("/api/extract", { method: "POST", body: form });
    const data = await res.json();
    const out: Record<string, string> = {};
    (data.files ?? []).forEach((r: { name: string; text: string }, i: number) => {
      out[files[i].path] = r.text ?? "";
    });
    return out;
  } catch {
    return {};
  }
}

// Walk a directory into a VFS + a path→handle map. Document files are queued
// and their text extracted server-side in one batch.
export async function loadDir(root: DirHandle): Promise<LoadResult> {
  const vfs: VFS = {};
  const handles = new Map<string, FileHandle>();
  const docPaths = new Set<string>();
  const docQueue: { path: string; file: File }[] = [];

  const walk = async (dir: DirHandle, prefix: string, depth: number) => {
    if (depth > 6) return;
    for await (const [name, h] of dir.entries()) {
      if (name.startsWith(".") || name === "node_modules") continue;
      const path = prefix ? `${prefix}/${name}` : name;
      if (h.kind === "directory") {
        await walk(h, path, depth + 1);
        continue;
      }
      const fh = h;
      handles.set(path, fh);
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      if (DOC_EXT.has(ext)) {
        const file = await fh.getFile();
        docPaths.add(path);
        vfs[path] = { path, content: "[extracting…]", language: "text" };
        docQueue.push({ path, file });
      } else if (TEXT_EXT.has(ext)) {
        const file = await fh.getFile();
        const content =
          file.size < MAX_TEXT_BYTES
            ? await file.text()
            : `// ${name} — ${(file.size / 1024).toFixed(0)} KB (too large to preview)`;
        vfs[path] = { path, content, language: langFor(path) };
      } else {
        const file = await fh.getFile();
        vfs[path] = { path, content: `// ${name} — ${(file.size / 1024).toFixed(0)} KB (binary)`, language: "text" };
      }
    }
  };

  await walk(root, "", 0);

  const extracted = await extractDocs(docQueue);
  for (const [path, text] of Object.entries(extracted)) {
    if (vfs[path]) vfs[path] = { ...vfs[path], content: text || "[no extractable text]" };
  }

  return { vfs, handles, docPaths, name: root.name };
}

// Write (creating nested directories as needed) and return the new file handle.
export async function writeFile(
  root: DirHandle,
  path: string,
  content: string,
): Promise<FileHandle> {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop()!;
  let dir: DirHandle = root;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  const fh = await dir.getFileHandle(fileName, { create: true });
  const writable = await fh.createWritable();
  await writable.write(content);
  await writable.close();
  return fh;
}

export async function deleteEntry(root: DirHandle, path: string): Promise<void> {
  const parts = path.split("/").filter(Boolean);
  const last = parts.pop()!;
  let dir: DirHandle = root;
  for (const part of parts) dir = await dir.getDirectoryHandle(part);
  await dir.removeEntry(last, { recursive: true });
}

export type { DirHandle, FileHandle };
