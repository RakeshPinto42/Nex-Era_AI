// Multi-format, multi-file ingestion. CSV uses the existing browser parser;
// XLSX/XLS use the already-installed `xlsx` lib. Nothing leaves the device.

import * as XLSX from "xlsx";
import { parseCsv, type Table } from "@/lib/finance/csv";
import { uid } from "@/lib/utils";
import type { Dataset, FileRole } from "./types";

/** Convert an array-of-arrays (from XLSX) into our Table shape. */
function aoaToTable(aoa: unknown[][]): Table {
  if (!aoa.length) return { columns: [], rows: [] };
  const [header, ...body] = aoa;
  const columns = header.map((c) => String(c ?? "").trim());
  const rows = body.map((r) => columns.map((_, i) => String(r[i] ?? "")));
  return { columns, rows };
}

/** Read a single File into a Table, picking parser by extension. */
export async function readFileToTable(file: File): Promise<Table> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: false,
      defval: "",
    });
    const table = aoaToTable(aoa);
    if (!table.columns.length) throw new Error("No columns found in sheet");
    return table;
  }
  const text = await file.text();
  const table = parseCsv(text);
  if (!table.columns.length) throw new Error("No columns found");
  return table;
}

/** Read a File and wrap it as a role-tagged Dataset. */
export async function ingestFile(
  file: File,
  role: FileRole = "other",
): Promise<Dataset> {
  const table = await readFileToTable(file);
  return { id: uid("ds"), name: file.name, role, table, addedAt: Date.now() };
}
