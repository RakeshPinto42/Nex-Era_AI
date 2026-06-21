"use client";

// Multi-file uploader with per-file role tagging. Parses CSV/XLSX in-browser via
// lib/finance-os/ingest and hands Datasets up. Nothing is uploaded anywhere.

import { useCallback, useRef, useState } from "react";
import { ingestFile } from "@/lib/finance-os/ingest";
import { FILE_ROLES, type Dataset, type FileRole } from "@/lib/finance-os/types";
import { cn } from "@/lib/utils";

export function FileDrop({
  datasets,
  onChange,
  defaultRole = "sales",
}: {
  datasets: Dataset[];
  onChange: (datasets: Dataset[]) => void;
  defaultRole?: FileRole;
}) {
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      setErr(null);
      const added: Dataset[] = [];
      for (const f of Array.from(files)) {
        try {
          added.push(await ingestFile(f, defaultRole));
        } catch (e) {
          setErr(`${f.name}: ${(e as Error).message}`);
        }
      }
      if (added.length) onChange([...datasets, ...added]);
    },
    [datasets, onChange, defaultRole],
  );

  const setRole = (id: string, role: FileRole) =>
    onChange(datasets.map((d) => (d.id === id ? { ...d, role } : d)));
  const remove = (id: string) => onChange(datasets.filter((d) => d.id !== id));

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          over ? "border-brand-600/50 bg-brand-50" : "border-fos-border hover:border-muted hover:bg-canvas",
        )}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <span className="text-sm font-medium text-neutral-900">Drop CSV / XLSX files, or click</span>
        <span className="font-mono text-[11px] text-muted">parsed in your browser — never uploaded</span>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv"
          multiple
          hidden
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </label>
      {err && <p className="text-xs text-rose-600">✕ {err}</p>}

      {datasets.length > 0 && (
        <ul className="space-y-1.5">
          {datasets.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-lg border border-fos-border bg-white px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ink" title={d.name}>
                {d.name}
                <span className="ml-2 font-mono text-[11px] text-muted">{d.table.rows.length} rows</span>
              </span>
              <select
                value={d.role}
                onChange={(e) => setRole(d.id, e.target.value as FileRole)}
                className="cursor-pointer rounded-lg border border-fos-border bg-canvas px-2 py-1 text-xs text-ink outline-none focus:border-brand-600/40"
              >
                {FILE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => remove(d.id)}
                className="grid h-7 w-7 flex-none place-items-center rounded text-muted hover:bg-black/5 hover:text-ink"
                aria-label="Remove file"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
