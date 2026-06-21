"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PageShell, { GridReveal } from "@/components/dashboard/PageShell";

type Dataset = {
  name: string;
  uploadedAt: string;
  columns: string[];
  rowCount: number;
  rows: string[][];
};

export default function FilesPage() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/fpa/data");
    const data = await res.json();
    setDataset(data.dataset);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/fpa/data", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        setDataset(data.dataset);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const clear = useCallback(async () => {
    await fetch("/api/fpa/data", { method: "DELETE" });
    setDataset(null);
    setError(null);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <PageShell
      title="Data Upload"
      subtitle="Upload a CSV or JSON dataset — Ledger reads it live."
      action={
        dataset ? (
          <button
            onClick={clear}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm text-black/70 hover:border-[#ff8a8a]/40 hover:text-[#ff8a8a]"
          >
            Clear dataset
          </button>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
          >
            ↑ Upload
          </button>
        )
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />

      {/* dropzone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mb-6 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed py-10 text-center transition-colors ${
          dragOver
            ? "border-navy/60 bg-navy/[0.06]"
            : "border-black/15 bg-black/[0.02] hover:border-navy/40"
        }`}
      >
        <p className="text-sm text-black/60">
          {busy ? (
            "Parsing…"
          ) : (
            <>
              Drag &amp; drop a file, or{" "}
              <span className="text-navy">browse</span>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-black/35">
          CSV or JSON (array of objects, or {"{columns, rows}"})
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-[#ff8a8a]/30 bg-[#ff8a8a]/[0.06] px-4 py-3 text-sm text-[#ff8a8a]">
          ✕ {error}
        </div>
      )}

      {dataset ? (
        <GridReveal>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-navy/30 bg-navy/[0.06] px-4 py-3 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-navy" />
            <span className="font-medium text-navy">{dataset.name}</span>
            <span className="text-black/55">
              {dataset.rowCount.toLocaleString()} rows · {dataset.columns.length} columns
            </span>
            <span className="ml-auto text-xs text-black/40">
              Ledger is grounded on this dataset. Ask it about “my data”.
            </span>
          </div>

          <div className="overflow-auto rounded-2xl border border-black/10">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-black/[0.03] text-left">
                  {dataset.columns.map((c) => (
                    <th
                      key={c}
                      className="whitespace-nowrap border-b border-black/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-black/50"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.rows.map((r, ri) => (
                  <tr key={ri} className="border-b border-black/5 last:border-0 hover:bg-black/[0.03]">
                    {dataset.columns.map((_, ci) => (
                      <td key={ci} className="whitespace-nowrap px-3 py-1.5 text-black/75">
                        {r[ci] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dataset.rowCount > dataset.rows.length && (
            <p className="mt-2 text-center text-xs text-black/35">
              Showing first {dataset.rows.length} of {dataset.rowCount.toLocaleString()} rows.
            </p>
          )}
        </GridReveal>
      ) : (
        <p className="text-center text-sm text-black/35">
          No dataset loaded. Upload one to ground Ledger on your own numbers.
        </p>
      )}
    </PageShell>
  );
}
