// Client-side CSV utilities for the finance tools. Everything runs in the
// browser — uploaded data never touches the server or any model.

export type Table = { columns: string[]; rows: string[][] };

// Minimal RFC-4180-ish parser: quoted fields, escaped quotes, commas/newlines
// inside quotes.
export function parseCsv(text: string): Table {
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
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") pushField();
    else if (ch === "\n") pushRecord();
    else if (ch === "\r") {
      /* ignore */
    } else field += ch;
  }
  if (field !== "" || record.length) pushRecord();

  if (records.length === 0) return { columns: [], rows: [] };
  const [header, ...body] = records;
  return { columns: header.map((c) => c.trim()), rows: body };
}

/** Coerce a cell to a number, tolerating $, %, commas, parens-as-negative. */
export function toNum(v: string | undefined): number {
  if (v == null) return NaN;
  let s = String(v).trim();
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$,%\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : NaN;
}

/** True if at least half of a column's non-empty cells parse as numbers. */
export function isNumericColumn(table: Table, col: number): boolean {
  let nums = 0;
  let nonEmpty = 0;
  for (const r of table.rows) {
    const v = r[col];
    if (v == null || v === "") continue;
    nonEmpty++;
    if (Number.isFinite(toNum(v))) nums++;
  }
  return nonEmpty > 0 && nums >= nonEmpty * 0.5;
}

/** Guess the first numeric column at or after `from` (for default mapping). */
export function firstNumericCol(table: Table, from = 0): number {
  for (let i = from; i < table.columns.length; i++) {
    if (isNumericColumn(table, i)) return i;
  }
  return -1;
}

/** Build CSV text from a header + rows (for export). */
export function toCsv(columns: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

/** Trigger a browser download of text content. */
export function download(filename: string, text: string, type = "text/csv"): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const fmtMoney = (n: number): string =>
  (n < 0 ? "-" : "") +
  "$" +
  Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

export const fmtPct = (n: number): string =>
  (n > 0 ? "+" : "") + n.toFixed(1) + "%";
