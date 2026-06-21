"use client";

// Shown by an engine when no catalogs have been researched yet. Points the user to
// the Research tab to build Sonny's + competitor catalogs first.

import { Database } from "lucide-react";

export function EngineEmpty({ note }: { note?: string }) {
  return (
    <div className="grid h-full place-items-center py-20 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
          <Database size={22} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-fos-text">No catalogs yet</h3>
        <p className="mt-1 text-sm text-fos-muted">{note ?? "Open the Research tab and research Sonny's + your competitors. This engine computes from those web-sourced catalogs."}</p>
      </div>
    </div>
  );
}
