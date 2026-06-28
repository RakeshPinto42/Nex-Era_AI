"use client";

import { useState } from "react";
import { SAMPLES, type Dataset } from "@/lib/finance/samples";
import { toCsv, download } from "@/lib/finance/csv";

async function downloadXlsx(key: string, ds: Dataset) {
  // SheetJS is heavy — load it only when the user actually exports Excel.
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([ds.columns, ...ds.rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${key}.xlsx`);
}

export default function SampleData() {
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Dummy datasets to test the tools or use as Excel starters. Generated locally —
        download as CSV or XLSX.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLES.map((s) => (
          <div key={s.key} className="flex flex-col rounded-2xl border border-line bg-surface-2 p-4">
            <p className="text-sm font-semibold text-ink">{s.name}</p>
            <p className="mt-0.5 flex-1 text-xs text-faint">{s.desc}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const ds = s.build();
                  download(`${s.key}.csv`, toCsv(ds.columns, ds.rows));
                }}
                className="flex-1 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
              >
                ↓ CSV
              </button>
              <button
                onClick={async () => {
                  setBusy(s.key);
                  try {
                    await downloadXlsx(s.key, s.build());
                  } finally {
                    setBusy(null);
                  }
                }}
                disabled={busy === s.key}
                className="flex-1 rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                {busy === s.key ? "…" : "↓ XLSX"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
