"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Loading & skeleton primitives.
 *   NexSpinner   — orbital ring spinner.
 *   NexOrbit     — AI "thinking" core: a pulsing nucleus with orbiting particles.
 *   NexDots      — three-dot typing indicator (AI is responding).
 *   NexSkeleton  — shimmering glass placeholder.
 */

export function NexSpinner({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-block rounded-full border-2 border-[var(--nex-border)] border-t-[var(--nex-accent)] animate-[nex-spin_0.7s_linear_infinite]", className)}
      style={{ width: size, height: size, filter: "drop-shadow(0 0 6px rgba(168,85,247,0.5))" }}
      role="status"
      aria-label="Loading"
    />
  );
}

/** AI thinking core — nucleus + orbiting electrons. The signature loader. */
export function NexOrbit({ size = 72, label = "Thinking", className }: { size?: number; label?: string; className?: string }) {
  return (
    <div className={cn("inline-flex flex-col items-center gap-3", className)} role="status" aria-label={label}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* nucleus */}
        <span className="absolute inset-0 m-auto h-3 w-3 rounded-full bg-[linear-gradient(120deg,#f2761c,#fb8c6a)] shadow-[0_0_20px_rgba(242,118,28,0.9)] animate-[nex-breathe_1.8s_ease-in-out_infinite]" />
        {/* orbit rings */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-full border border-[var(--nex-border-strong)]"
            style={{
              animation: `nex-spin ${2 + i * 0.8}s linear infinite${i % 2 ? " reverse" : ""}`,
              transform: `rotate(${i * 60}deg)`,
              borderTopColor: ["#f2761c", "#f2761c", "#fb8c6a"][i],
            }}
          />
        ))}
      </div>
      {label && <span className="text-[var(--nex-text-sm)] text-[var(--nex-text-muted)]">{label}…</span>}
    </div>
  );
}

/** Typing dots — used inside AI response cards while streaming. */
export function NexDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} role="status" aria-label="Generating">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--nex-accent)] animate-[nex-breathe_1.2s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

/** Shimmering skeleton block. */
export function NexSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--nex-radius-sm)] bg-[var(--nex-glass-faint)] overflow-hidden relative",
        "after:absolute after:inset-0 after:bg-[linear-gradient(90deg,transparent,rgba(180,188,224,0.12),transparent)] after:[background-size:200%_100%] after:animate-[nex-shimmer_1.6s_linear_infinite]",
        className,
      )}
    />
  );
}

/** Full-surface loading overlay with scanline sweep. */
export function NexScanLoader({ label = "Initializing", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("relative grid place-items-center gap-4 rounded-[var(--nex-radius-xl)] overflow-hidden p-12", className)}>
      <span className="pointer-events-none absolute inset-x-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(34,211,238,0.12),transparent)] animate-[nex-scan_2.4s_ease-in-out_infinite]" />
      <NexOrbit label={label} />
    </div>
  );
}
