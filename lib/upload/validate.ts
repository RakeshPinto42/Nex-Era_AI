// Shared upload validation layer. Every upload endpoint (/api/extract,
// /api/agents/file, /api/agents/finance, …) uses THIS — no duplicated logic.
// Enforces size, count, extension + MIME allowlists, executable/archive
// rejection, and provides parse-timeout + workbook-limit helpers used by the
// shared extraction pipeline.

import "server-only";

const MB = 1024 * 1024;

export const UPLOAD_LIMITS = {
  maxFileBytes: 15 * MB,
  maxFiles: 20,
  maxTotalBytes: 40 * MB,
  /** Cap on decompressed/parsed output (chars) — enforced in extraction. */
  maxDecompressedBytes: 50 * MB,
  maxSheets: 50,
  maxRows: 100_000,
  parseTimeoutMs: 20_000,
} as const;

// Documents + spreadsheets + text/code + images. Mirrors the existing accept
// lists so current workflows are unchanged.
const ALLOWED_EXT = new Set([
  "pdf", "docx", "xlsx", "xls", "csv", "tsv", "txt", "md", "markdown", "json",
  "log", "xml", "yaml", "yml", "html", "htm", "rtf",
  "js", "jsx", "ts", "tsx", "py", "java", "c", "h", "cpp", "cc", "cs", "go",
  "rs", "rb", "php", "swift", "kt", "sh", "bash", "sql", "css", "scss", "vue",
  "toml", "ini", "env", "dockerfile", "gradle",
  "png", "jpg", "jpeg", "gif", "webp",
]);

// Hard-blocked executable / installer / packaged-binary formats.
const BLOCKED_EXT = new Set([
  "exe", "dll", "so", "dylib", "bin", "com", "msi", "scr", "cpl", "drv",
  "jar", "apk", "app", "dmg", "pkg", "deb", "rpm", "iso",
  "bat", "cmd", "ps1", "vbs", "vbe", "wsf", "lnk", "msc", "gadget",
]);

const EXEC_MIME = new Set([
  "application/x-msdownload", "application/x-msdos-program", "application/x-executable",
  "application/vnd.microsoft.portable-executable", "application/x-sh", "application/x-bat",
  "application/java-archive", "application/vnd.android.package-archive", "application/x-apple-diskimage",
]);

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export type UploadCheck = { ok: true } | { ok: false; error: string; status: number };

/** Validate a batch of uploaded files. Shared by every upload endpoint. */
export function validateUploadFiles(files: File[]): UploadCheck {
  if (files.length === 0) return { ok: false, error: "No files uploaded", status: 400 };
  if (files.length > UPLOAD_LIMITS.maxFiles) {
    return { ok: false, error: `Too many files (max ${UPLOAD_LIMITS.maxFiles})`, status: 413 };
  }

  let total = 0;
  for (const f of files) {
    const ext = extOf(f.name);
    const type = (f.type || "").toLowerCase();

    if (BLOCKED_EXT.has(ext) || EXEC_MIME.has(type)) {
      return { ok: false, error: `Executable/binary files are not allowed (${f.name})`, status: 415 };
    }
    if (!ALLOWED_EXT.has(ext)) {
      return { ok: false, error: `Unsupported file type: .${ext || "?"} (${f.name})`, status: 415 };
    }
    // MIME allowlist (lenient: many browsers send "" or octet-stream).
    const mimeOk =
      type === "" ||
      type === "application/octet-stream" ||
      type.startsWith("text/") ||
      type.startsWith("image/") ||
      type === "application/pdf" ||
      type === "application/json" ||
      type === "application/xml" ||
      type.includes("spreadsheet") ||
      type.includes("excel") ||
      type.includes("wordprocessing") ||
      type.includes("officedocument") ||
      type.includes("msword");
    if (!mimeOk) {
      return { ok: false, error: `Unsupported content type for ${f.name}`, status: 415 };
    }
    if (f.size > UPLOAD_LIMITS.maxFileBytes) {
      return { ok: false, error: `${f.name} exceeds ${UPLOAD_LIMITS.maxFileBytes / MB}MB`, status: 413 };
    }
    total += f.size;
  }
  if (total > UPLOAD_LIMITS.maxTotalBytes) {
    return { ok: false, error: `Upload exceeds ${UPLOAD_LIMITS.maxTotalBytes / MB}MB total`, status: 413 };
  }
  return { ok: true };
}

/** Reject parses that run too long (catastrophic inputs / decompression bombs). */
export function withTimeout<T>(p: Promise<T>, ms = UPLOAD_LIMITS.parseTimeoutMs, label = "parse"): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

/** True if a buffer begins with the ZIP magic (PK) — xlsx/docx are ZIP. */
export function isZip(buf: Buffer): boolean {
  return buf.length > 3 && buf[0] === 0x50 && buf[1] === 0x4b;
}

/** Cap the sheet list a workbook is allowed to expose. */
export function limitSheets(names: string[]): string[] {
  return names.slice(0, UPLOAD_LIMITS.maxSheets);
}
