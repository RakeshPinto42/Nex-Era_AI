"use client";

/* Processing Personality Engine — live execution timeline. Renders ONLY the
   real stages that occurred (never fabricated). Current step pulses; completed
   steps check off; errors flag. Reduced-motion aware. */

import { useProcessingConfig } from "./config";

export type Stage = { label: string; status: "done" | "running" | "pending" | "error" };

export default function ExecutionTimeline({ stages, className = "" }: { stages: Stage[]; className?: string }) {
  const { cfg } = useProcessingConfig();
  return (
    <ol className={`space-y-1.5 ${className}`}>
      {stages.map((s, i) => {
        const color = s.status === "error" ? "#ef4444" : s.status === "done" ? "#10b981" : s.status === "running" ? "#2563eb" : "#94a3b8";
        return (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            <span className="relative flex h-2 w-2 flex-none">
              {s.status === "running" && !cfg.reducedMotion && <span className="pulse-dot absolute inline-flex h-full w-full rounded-full" style={{ background: `${color}99` }} />}
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
            </span>
            <span style={{ color }}>{s.status === "done" ? "✓" : s.status === "error" ? "✕" : ""}</span>
            <span className={s.status === "pending" ? "text-faint" : "text-ink"}>{s.label}{s.status === "running" ? "…" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}
