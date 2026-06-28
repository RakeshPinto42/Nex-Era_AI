"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { NexStatus } from "./tokens";

/**
 * Status primitives — NexBadge, NexStatusDot, NexTag.
 * Small, glowing, semantic. Used for live state across the OS.
 */

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium border whitespace-nowrap leading-none",
  {
    variants: {
      tone: {
        neutral: "text-[var(--nex-text-muted)] bg-[var(--nex-glass-faint)] border-[var(--nex-border)]",
        purple: "text-[var(--nex-purple-300)] bg-[rgba(168,85,247,0.12)] border-[rgba(168,85,247,0.3)]",
        blue: "text-[var(--nex-blue-300)] bg-[rgba(59,130,246,0.12)] border-[rgba(59,130,246,0.3)]",
        cyan: "text-[var(--nex-cyan-300)] bg-[rgba(34,211,238,0.12)] border-[rgba(34,211,238,0.3)]",
        success: "text-[var(--nex-success)] bg-[rgba(52,245,160,0.12)] border-[rgba(52,245,160,0.3)]",
        warning: "text-[var(--nex-warning)] bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.3)]",
        danger: "text-[var(--nex-danger)] bg-[rgba(251,113,133,0.12)] border-[rgba(251,113,133,0.3)]",
      },
      size: {
        sm: "h-5 px-2 text-[0.6875rem]",
        md: "h-6 px-2.5 text-[var(--nex-text-xs)]",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface NexBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {
  dot?: boolean;
}

export function NexBadge({ className, tone, size, dot, children, ...props }: NexBadgeProps) {
  return (
    <span className={cn(badge({ tone, size }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />}
      {children}
    </span>
  );
}

const STATUS: Record<NexStatus, { color: string; label: string; pulse: boolean }> = {
  online: { color: "var(--nex-success)", label: "Online", pulse: true },
  busy: { color: "var(--nex-warning)", label: "Busy", pulse: true },
  idle: { color: "var(--nex-text-faint)", label: "Idle", pulse: false },
  offline: { color: "var(--nex-text-disabled)", label: "Offline", pulse: false },
  error: { color: "var(--nex-danger)", label: "Error", pulse: true },
};

/** Live status dot with an animated pulse ring. */
export function NexStatusDot({ status, label, className }: { status: NexStatus; label?: string; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative inline-flex h-2.5 w-2.5">
        {s.pulse && (
          <span
            className="absolute inset-0 rounded-full animate-[nex-pulse-ring_2.4s_ease-out_infinite]"
            style={{ background: s.color }}
          />
        )}
        <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />
      </span>
      {(label ?? s.label) && <span className="text-[var(--nex-text-sm)] text-[var(--nex-text-muted)]">{label ?? s.label}</span>}
    </span>
  );
}

/** Tag — compact label chip, optionally removable. */
export function NexTag({ children, onRemove, className }: { children: React.ReactNode; onRemove?: () => void; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[var(--nex-radius-sm)] h-7 px-2.5 text-[var(--nex-text-xs)] text-[var(--nex-text-muted)] bg-[var(--nex-glass-faint)] border border-[var(--nex-border)]", className)}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-[var(--nex-text-faint)] hover:text-[var(--nex-text)] transition-colors" aria-label="Remove">
          ✕
        </button>
      )}
    </span>
  );
}
