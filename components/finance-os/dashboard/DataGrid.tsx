"use client";

// Headless TanStack grid: sortable columns + click-to-drilldown row detail.
// Styled with the existing Tailwind tokens (no AG Grid).

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";

export function DataGrid<T extends object>({
  columns,
  data,
  renderDetail,
  maxHeight = "28rem",
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  renderDetail?: (row: T) => React.ReactNode;
  maxHeight?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [open, setOpen] = useState<number | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-auto rounded-xl border border-fos-border bg-fos-surface" style={{ maxHeight }}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-fos-surface2">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  className={cn(
                    "border-b border-fos-border px-3 py-2 text-left font-medium text-fos-muted",
                    h.column.getCanSort() && "cursor-pointer select-none hover:text-fos-text",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: "▲", desc: "▼" }[h.column.getIsSorted() as string] ?? ""}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <FragmentRow
              key={row.id}
              cells={row.getVisibleCells().map((c) => (
                <td key={c.id} className="border-b border-fos-border px-3 py-1.5 text-fos-text tabular-nums">
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
              expandable={!!renderDetail}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
              detail={renderDetail?.(row.original)}
              colSpan={columns.length}
            />
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-fos-muted">
                No rows.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({
  cells,
  expandable,
  isOpen,
  onToggle,
  detail,
  colSpan,
}: {
  cells: React.ReactNode;
  expandable: boolean;
  isOpen: boolean;
  onToggle: () => void;
  detail: React.ReactNode;
  colSpan: number;
}) {
  return (
    <>
      <tr
        onClick={expandable ? onToggle : undefined}
        className={cn(expandable && "cursor-pointer hover:bg-fos-surface2", isOpen && "bg-fos-surface2")}
      >
        {cells}
      </tr>
      {expandable && isOpen && (
        <tr>
          <td colSpan={colSpan} className="border-b border-fos-border bg-fos-surface2 px-3 py-3">
            {detail}
          </td>
        </tr>
      )}
    </>
  );
}
