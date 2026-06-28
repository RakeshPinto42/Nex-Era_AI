// Analytics Studio — deterministic workbook profiling (browser-only). Parses an
// uploaded spreadsheet, then classifies every column's TYPE (date / currency /
// percent / number / text) and ROLE (measure / dimension / date / id), and
// infers business entities + the dominant currency. AI is NOT required here —
// profiling is exact and instant; AI only enriches downstream steps.

import type { Column, ColRole, ColType, Profile, Table } from "./types";

const MAX_ROWS = 5000;
const CURRENCY_SYMBOLS = ["$", "₹", "€", "£", "¥"];
const MEASURE_HINT = /(amount|amt|revenue|sales|cost|price|margin|profit|qty|quantity|units|total|value|payout|commission|spend|budget|actual|forecast|gmv|arr|mrr|ebitda|opex|gross|net)/i;
// Money-specific subset — only these imply a CURRENCY type without a symbol.
const MONEY_HINT = /(amount|amt|revenue|sales|cost|price|margin|profit|total|value|payout|commission|spend|budget|actual|forecast|gmv|arr|mrr|ebitda|opex|gross|net)/i;
const DATE_HINT = /(date|month|period|year|quarter|day|time|posted|created|fy)/i;
const ID_HINT = /(^id$|_id$|code|number|sku|key|ref)/i;
const DIM_HINT = /(customer|client|account|product|sku|region|country|segment|category|channel|rep|owner|team|department|dept|vendor|supplier|industry|stage|status|type|name)/i;

export async function parseWorkbook(file: File): Promise<Table[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: false });
  const tables: Table[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false, raw: false });
    if (!aoa.length) continue;
    const header = (aoa[0] || []).map((c) => (c == null ? "" : String(c).trim()));
    if (!header.some(Boolean)) continue;
    const body = aoa.slice(1, MAX_ROWS + 1).map((r) => header.map((_, i) => (r?.[i] == null ? "" : String(r[i]))));
    tables.push(profileTable(name, header, body));
  }
  return tables;
}

function profileTable(name: string, header: string[], rows: string[][]): Table {
  const columns: Column[] = header.map((h, i) => classifyColumn(h || `Column ${i + 1}`, i, rows.map((r) => r[i] ?? "")));
  return { name, columns, rows, rowCount: rows.length };
}

const num = (s: string): number | null => {
  if (s == null) return null;
  const t = s.replace(/[$₹€£¥,%\s]/g, "");
  if (t === "" || isNaN(Number(t))) return null;
  return Number(t);
};

function classifyColumn(name: string, index: number, values: string[]): Column {
  const nonEmpty = values.filter((v) => v !== "" && v != null);
  const nullPct = values.length ? Math.round(((values.length - nonEmpty.length) / values.length) * 100) : 0;
  const distinct = new Set(nonEmpty).size;
  const sample = nonEmpty.slice(0, 4);

  const numericShare = nonEmpty.length ? nonEmpty.filter((v) => num(v) != null).length / nonEmpty.length : 0;
  const currencySym = CURRENCY_SYMBOLS.find((sym) => nonEmpty.some((v) => v.trim().startsWith(sym)));
  const percentShare = nonEmpty.length ? nonEmpty.filter((v) => v.trim().endsWith("%")).length / nonEmpty.length : 0;
  const looksDate = DATE_HINT.test(name) || (nonEmpty.length > 0 && nonEmpty.filter((v) => isDateish(v)).length / nonEmpty.length > 0.7);

  let type: ColType;
  let role: ColRole;

  if (looksDate && numericShare < 0.95) {
    type = "date"; role = "date";
  } else if (percentShare > 0.6) {
    type = "percent"; role = "measure";
  } else if (currencySym || (numericShare > 0.8 && MONEY_HINT.test(name))) {
    type = "currency"; role = "measure";
  } else if (numericShare > 0.85) {
    // numeric: measure unless it's clearly an id/year dimension
    type = "number";
    role = ID_HINT.test(name) ? "id" : MEASURE_HINT.test(name) || distinct > Math.max(8, nonEmpty.length * 0.2) ? "measure" : "dimension";
  } else {
    type = "text";
    role = ID_HINT.test(name) && distinct > nonEmpty.length * 0.8 ? "id" : "dimension";
  }

  return { name, index, type, role, currency: currencySym, nullPct, distinct, sample };
}

function isDateish(v: string): boolean {
  const t = v.trim();
  if (/^\d{4}-\d{1,2}(-\d{1,2})?$/.test(t)) return true;     // 2025-06 / 2025-06-27
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(t)) return true;    // 06/27/2025
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(t)) return true;
  return false;
}

export function profileWorkbook(tables: Table[]): Profile {
  const primary = [...tables].sort((a, b) => b.columns.length * b.rowCount - a.columns.length * a.rowCount)[0];
  const ref = (t: Table, c: Column) => `${t.name}.${c.name}`;

  const dateColumns: string[] = [];
  const measureColumns: string[] = [];
  const dimensionColumns: string[] = [];
  const entities = new Set<string>();
  const currencies = new Map<string, number>();

  for (const t of tables) {
    for (const c of t.columns) {
      if (c.role === "date") dateColumns.push(ref(t, c));
      else if (c.role === "measure") measureColumns.push(ref(t, c));
      else if (c.role === "dimension") {
        dimensionColumns.push(ref(t, c));
        if (DIM_HINT.test(c.name)) entities.add(titleCase(c.name));
      }
      if (c.currency) currencies.set(c.currency, (currencies.get(c.currency) ?? 0) + 1);
    }
  }

  const currency = [...currencies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    tables,
    primaryTable: primary?.name ?? "",
    dateColumns,
    measureColumns,
    dimensionColumns,
    entities: [...entities].slice(0, 8),
    currency,
  };
}

function titleCase(s: string): string {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()).trim();
}

// ---- aggregation over the parsed rows (used to compute live KPI values) ----
export function columnValues(table: Table, columnName: string): number[] {
  const col = table.columns.find((c) => c.name === columnName);
  if (!col) return [];
  return table.rows.map((r) => num(r[col.index] ?? "")).filter((n): n is number => n != null);
}

export { num as parseNumber };
