"use client";

import { useCallback, useState, type ReactNode } from "react";
import { parseCsv, type Table } from "@/lib/finance/csv";

// ---- file upload (CSV, parsed in-browser) ----

export function Dropzone({
  onTable,
  hint = "Drop a CSV here, or click to choose",
}: {
  onTable: (table: Table, name: string) => void;
  hint?: string;
}) {
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handle = useCallback(
    async (file: File) => {
      setErr(null);
      try {
        const text = await file.text();
        const table = parseCsv(text);
        if (table.columns.length === 0) throw new Error("No columns found");
        onTable(table, file.name);
      } catch (e) {
        setErr((e as Error).message || "Could not read file");
      }
    },
    [onTable],
  );

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handle(f);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          over ? "border-navy/50 bg-navy/[0.04]" : "border-black/15 hover:border-black/30 hover:bg-black/[0.02]"
        }`}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-black/40" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <span className="text-sm font-medium text-neutral-900">{hint}</span>
        <span className="font-mono text-[11px] text-black/40">.csv — parsed in your browser</span>
        <input
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
        />
      </label>
      {err && <p className="mt-2 text-xs text-rose-600">✕ {err}</p>}
    </div>
  );
}

// ---- column mapping select ----

export function ColumnSelect({
  table,
  value,
  onChange,
  label,
}: {
  table: Table;
  value: number;
  onChange: (i: number) => void;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-black/55">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer rounded-lg border border-black/10 bg-black/[0.02] px-2.5 py-2 text-sm text-neutral-900 outline-none focus:border-navy/40"
      >
        {table.columns.map((c, i) => (
          <option key={i} value={i}>
            {c || `Column ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

// ---- stat card ----

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-600"
      : tone === "bad"
        ? "text-rose-600"
        : "text-neutral-900";
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-black/40">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-black/45">{sub}</p>}
    </div>
  );
}

// ---- horizontal bar list ----

export function BarList({
  items,
}: {
  items: { label: string; value: number; display: string; color?: string }[];
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-40 flex-none truncate text-sm text-black/70" title={it.label}>
            {it.label}
          </span>
          <div className="relative h-5 flex-1 overflow-hidden rounded bg-black/[0.04]">
            <div
              className="absolute inset-y-0 left-0 rounded"
              style={{
                width: `${(Math.abs(it.value) / max) * 100}%`,
                background: it.color ?? "#3b82f6",
              }}
            />
          </div>
          <span className="w-24 flex-none text-right font-mono text-xs text-neutral-900">
            {it.display}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PrivacyNote() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-600/20 bg-emerald-600/[0.05] px-3 py-2 text-xs text-emerald-700">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </svg>
      Runs entirely in your browser — your data never leaves this device.
    </div>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-5">{children}</div>
  );
}
