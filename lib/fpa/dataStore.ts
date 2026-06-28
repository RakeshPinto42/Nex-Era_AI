// Server-side TEMPORARY store for user-uploaded finance data (CSV / JSON).
// Privacy-first (see FINANCE_OS_PRIVACY.md): the dataset is scoped to the
// current SESSION (not a single global file) so one user's financials are never
// readable by another, and it auto-expires after a TTL — "Analyze-Only" is the
// default. Nothing is durably stored unless the user explicitly Saves.

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { SESSION_COOKIE } from "@/lib/auth/session";

export type FinanceDataset = {
  name: string;
  uploadedAt: string;
  columns: string[];
  rows: string[][];
  rowCount: number;
};

const DIR = path.join(process.cwd(), ".rak", "fos-session");
const TTL_MS = 4 * 60 * 60 * 1000; // 4h — temporary by default

// Keep stored/previewed rows bounded so a huge upload can't bloat memory/context.
const MAX_ROWS = 2000;

// Per-session file path, derived from the (hashed) session cookie → per-user
// isolation by construction. Outside a request scope it falls back to "anon".
function sessionFile(): string {
  let token = "anon";
  try {
    token = cookies().get(SESSION_COOKIE)?.value || "anon";
  } catch {
    /* no request scope */
  }
  const id = createHash("sha256").update(token).digest("hex").slice(0, 24);
  return path.join(DIR, `${id}.json`);
}

export async function getDataset(): Promise<FinanceDataset | null> {
  const file = sessionFile();
  try {
    const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs > TTL_MS) {
      await fs.rm(file, { force: true });
      return null;
    }
    return JSON.parse(await fs.readFile(file, "utf8")) as FinanceDataset;
  } catch {
    return null;
  }
}

export async function saveDataset(ds: FinanceDataset): Promise<void> {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(sessionFile(), JSON.stringify(ds, null, 2), "utf8");
}

export async function clearDataset(): Promise<void> {
  await fs.rm(sessionFile(), { force: true });
}

// ---- parsing ----

// Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes ("")
// and commas/newlines inside quotes.
export function parseCsv(text: string): { columns: string[]; rows: string[][] } {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    record.push(field);
    field = "";
  };
  const pushRecord = () => {
    pushField();
    // Skip blank trailing line.
    if (record.length > 1 || record[0] !== "") records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushRecord();
    } else if (ch === "\r") {
      // ignore; \n handles the newline
    } else {
      field += ch;
    }
  }
  if (field !== "" || record.length) pushRecord();

  if (records.length === 0) return { columns: [], rows: [] };
  const [header, ...body] = records;
  return { columns: header.map((c) => c.trim()), rows: body };
}

// Accepts CSV text or a JSON array-of-objects / {columns,rows} and normalizes
// it into a FinanceDataset.
export function buildDataset(name: string, text: string): FinanceDataset {
  const trimmed = text.trim();
  let columns: string[] = [];
  let rows: string[][] = [];

  const looksJson = trimmed.startsWith("[") || trimmed.startsWith("{");
  if (looksJson) {
    const json = JSON.parse(trimmed);
    if (Array.isArray(json) && json.length && typeof json[0] === "object") {
      columns = Array.from(
        json.reduce((set: Set<string>, r: Record<string, unknown>) => {
          Object.keys(r).forEach((k) => set.add(k));
          return set;
        }, new Set<string>()),
      );
      rows = json.map((r: Record<string, unknown>) =>
        columns.map((c) => String(r[c] ?? "")),
      );
    } else if (json && Array.isArray(json.columns) && Array.isArray(json.rows)) {
      columns = json.columns.map(String);
      rows = json.rows.map((r: unknown[]) => r.map((v) => String(v ?? "")));
    } else {
      throw new Error("Unsupported JSON shape (need array of objects or {columns,rows})");
    }
  } else {
    const parsed = parseCsv(text);
    columns = parsed.columns;
    rows = parsed.rows;
  }

  if (columns.length === 0) throw new Error("No columns found");

  const rowCount = rows.length;
  if (rows.length > MAX_ROWS) rows = rows.slice(0, MAX_ROWS);

  return {
    name,
    uploadedAt: new Date().toISOString(),
    columns,
    rows,
    rowCount,
  };
}

// Compact, token-bounded summary of the dataset for the copilot system prompt:
// columns, row count, numeric column min/max/sum/avg, and a few sample rows.
export function datasetContext(ds: FinanceDataset): string {
  const sampleCount = Math.min(ds.rows.length, 15);
  const samples = ds.rows
    .slice(0, sampleCount)
    .map((r) => "  " + r.join(" | "))
    .join("\n");

  // Numeric column stats.
  const numLine = (i: number): string | null => {
    const nums = ds.rows
      .map((r) => Number(String(r[i]).replace(/[$,%\s]/g, "")))
      .filter((n) => Number.isFinite(n));
    if (nums.length < Math.max(2, ds.rows.length * 0.5)) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const avg = sum / nums.length;
    const f = (n: number) =>
      Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : String(Number(n.toFixed(2)));
    return `- ${ds.columns[i]}: min ${f(min)}, max ${f(max)}, avg ${f(avg)}, sum ${f(sum)}`;
  };
  const stats = ds.columns
    .map((_, i) => numLine(i))
    .filter(Boolean)
    .join("\n");

  return [
    `UPLOADED DATASET: "${ds.name}" (${ds.rowCount} rows, ${ds.columns.length} columns).`,
    `Columns: ${ds.columns.join(", ")}`,
    stats ? "\nNumeric column stats:\n" + stats : "",
    `\nSample rows (first ${sampleCount}):`,
    `  ${ds.columns.join(" | ")}`,
    samples,
    ds.rowCount > sampleCount
      ? `\n(${ds.rowCount - sampleCount} more rows not shown — ask to aggregate or filter.)`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
