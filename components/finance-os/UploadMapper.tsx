"use client";

// Reusable single-file upload + column-map block for the upload-based modules.
// Holds one dataset + its mapping, auto-maps on load, and reports up via onData.

import { useEffect, useState } from "react";
import type { Table } from "@/lib/finance/csv";
import { FileDrop } from "./FileDrop";
import { ColumnMapper } from "./ColumnMapper";
import { PrivacyNote } from "@/components/finance/shared";
import type { ColumnMapping, Dataset, FieldSpec, FileRole } from "@/lib/finance-os/types";

export function UploadMapper({
  fields,
  onData,
  sample,
  defaultRole = "actuals",
  mapTitle = "Map columns",
}: {
  fields: FieldSpec[];
  onData: (table: Table | null, mapping: ColumnMapping | null) => void;
  sample?: () => Dataset[];
  defaultRole?: FileRole;
  mapTitle?: string;
}) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const table = datasets[0]?.table ?? null;

  useEffect(() => {
    onData(table, mapping);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, mapping]);

  return (
    <div className="space-y-5">
      <PrivacyNote />
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Data</h3>
          {sample && (
            <button
              onClick={() => {
                setDatasets(sample());
                setMapping(null);
              }}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink hover:bg-canvas"
            >
              Load sample data
            </button>
          )}
        </div>
        <FileDrop
          datasets={datasets}
          onChange={(d) => {
            setDatasets(d);
            setMapping(null);
          }}
          defaultRole={defaultRole}
        />
      </div>

      {table && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">{mapTitle}</h3>
          <ColumnMapper table={table} fields={fields} value={mapping} onChange={setMapping} />
        </div>
      )}
    </div>
  );
}
