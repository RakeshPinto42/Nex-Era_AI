"use client";

import { exportCsv, exportExcel, exportPdfTable, type Column, type Row } from "@/lib/finance-os/export";

// Small Excel / CSV / PDF export button group for any tabular result.

export function ExportMenu({
  filename,
  columns,
  rows,
  title,
  subtitle,
}: {
  filename: string;
  columns: Column[];
  rows: Row[];
  title?: string;
  subtitle?: string[];
}) {
  const disabled = rows.length === 0;
  const btn =
    "rounded-lg border border-fos-border px-3 py-1.5 text-xs font-medium text-fos-text transition-colors hover:bg-fos-surface2 disabled:opacity-40";
  return (
    <div className="flex gap-2">
      <button className={btn} disabled={disabled} onClick={() => exportExcel(filename, columns, rows)}>
        Excel
      </button>
      <button className={btn} disabled={disabled} onClick={() => exportCsv(filename, columns, rows)}>
        CSV
      </button>
      <button
        className={btn}
        disabled={disabled}
        onClick={() => exportPdfTable(filename, columns, rows, { title, subtitle })}
      >
        PDF
      </button>
    </div>
  );
}
