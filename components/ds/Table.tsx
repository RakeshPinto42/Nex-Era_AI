"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * NexTable — glass data table. Column-driven, generic over the row type.
 * Sticky header, hover row glow, zebra-free (depth via hairlines only), right-
 * aligned numeric columns. For huge datasets wrap with @tanstack/react-table
 * and feed rows through; this stays the presentational shell.
 */

export interface NexColumn<T> {
  key: keyof T | string;
  header: React.ReactNode;
  align?: "left" | "right" | "center";
  width?: string | number;
  render?: (row: T, index: number) => React.ReactNode;
}

export function NexTable<T extends Record<string, unknown>>({
  columns,
  rows,
  getRowId,
  onRowClick,
  empty = "No data",
  className,
}: {
  columns: NexColumn<T>[];
  rows: T[];
  getRowId?: (row: T, i: number) => string | number;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  className?: string;
}) {
  const alignCls = { left: "text-left", right: "text-right tabular-nums", center: "text-center" };
  return (
    <div className={cn("overflow-hidden rounded-[var(--nex-radius-xl)] border border-[var(--nex-border)] bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-md)]", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[var(--nex-text-sm)]">
          <thead>
            <tr className="border-b border-[var(--nex-border)]">
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  style={{ width: c.width }}
                  className={cn(
                    "sticky top-0 z-10 bg-[var(--nex-glass-strong)] px-4 py-3 font-semibold uppercase tracking-[0.08em] text-[0.6875rem] text-[var(--nex-text-faint)] backdrop-blur-[var(--nex-blur-md)]",
                    alignCls[c.align ?? "left"],
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--nex-text-faint)]">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={getRowId ? getRowId(row, i) : i}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-[var(--nex-border)] last:border-0 transition-colors duration-[var(--nex-dur-fast)]",
                    onRowClick && "cursor-pointer",
                    "hover:bg-[var(--nex-glass-hover)]",
                  )}
                >
                  {columns.map((c) => (
                    <td key={String(c.key)} className={cn("px-4 py-3 text-[var(--nex-text-muted)]", alignCls[c.align ?? "left"])}>
                      {c.render ? c.render(row, i) : (row[c.key as keyof T] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
