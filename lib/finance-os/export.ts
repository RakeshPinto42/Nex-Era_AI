// Export helpers — Excel (xlsx), PDF (jspdf + autotable), CSV (existing). All
// generated client-side; nothing is uploaded.

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toCsv, download, neutralizeFormula } from "@/lib/finance/csv";

export type Column = { header: string; key: string };
export type Row = Record<string, string | number>;

/** Download rows as a single-sheet .xlsx. */
export function exportExcel(filename: string, columns: Column[], rows: Row[], sheet = "Sheet1"): void {
  // Neutralize formula injection in data cells (shared with CSV export).
  const aoa = [columns.map((c) => c.header), ...rows.map((r) => columns.map((c) => neutralizeFormula(r[c.key] ?? "")))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/** Download rows as CSV (reuses the finance CSV helpers). */
export function exportCsv(filename: string, columns: Column[], rows: Row[]): void {
  const text = toCsv(
    columns.map((c) => c.header),
    rows.map((r) => columns.map((c) => r[c.key] ?? "")),
  );
  download(filename.endsWith(".csv") ? filename : `${filename}.csv`, text);
}

/** Download a table as PDF. Optional title + summary lines above the table. */
export function exportPdfTable(
  filename: string,
  columns: Column[],
  rows: Row[],
  opts: { title?: string; subtitle?: string[] } = {},
): void {
  const doc = new jsPDF({ orientation: "landscape" });
  let y = 14;
  if (opts.title) {
    doc.setFontSize(16);
    doc.text(opts.title, 14, y);
    y += 7;
  }
  if (opts.subtitle?.length) {
    doc.setFontSize(10);
    doc.setTextColor(110);
    for (const line of opts.subtitle) {
      doc.text(line, 14, y);
      y += 5;
    }
    doc.setTextColor(0);
  }
  autoTable(doc, {
    startY: y + 2,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/** A multi-page PDF: one page per statement block (used by Statement Factory). */
export function exportStatementsPdf(
  filename: string,
  statements: { title: string; lines: string[]; columns: Column[]; rows: Row[] }[],
): void {
  const doc = new jsPDF();
  statements.forEach((s, i) => {
    if (i > 0) doc.addPage();
    doc.setFontSize(15);
    doc.text(s.title, 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(110);
    s.lines.forEach((l, j) => doc.text(l, 14, 26 + j * 5));
    doc.setTextColor(0);
    autoTable(doc, {
      startY: 28 + s.lines.length * 5,
      head: [s.columns.map((c) => c.header)],
      body: s.rows.map((r) => s.columns.map((c) => String(r[c.key] ?? ""))),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
  });
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
