"use client";

import { countBySeverity, type Exception } from "@/lib/finance-os/validate";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  error: "border-rose-300 bg-rose-50 text-rose-700",
  warning: "border-amber-300 bg-amber-50 text-amber-700",
  info: "border-sky-300 bg-sky-50 text-sky-700",
};

export function ExceptionPanel({ exceptions }: { exceptions: Exception[] }) {
  const counts = countBySeverity(exceptions);

  if (!exceptions.length) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        ✓ No validation exceptions.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-xs">
        {(["error", "warning", "info"] as const).map((s) =>
          counts[s] ? (
            <span key={s} className={cn("rounded-full border px-2.5 py-0.5 font-medium capitalize", TONE[s])}>
              {counts[s]} {s}
            </span>
          ) : null,
        )}
      </div>
      <div className="max-h-56 overflow-auto rounded-xl border border-fos-border bg-fos-surface">
        <table className="w-full text-sm">
          <tbody>
            {exceptions.slice(0, 500).map((e) => (
              <tr key={e.id} className="border-b border-line/60 last:border-0">
                <td className="w-20 px-3 py-1.5">
                  <span className={cn("rounded px-1.5 py-0.5 text-[11px] capitalize", TONE[e.severity])}>
                    {e.severity}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-fos-text">{e.message}</td>
                <td className="w-24 px-3 py-1.5 text-right font-mono text-[11px] text-fos-muted">
                  {e.row != null ? `row ${e.row + 1}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
