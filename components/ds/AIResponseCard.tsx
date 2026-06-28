"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NexDots } from "./Loading";
import { NexBadge } from "./Status";

/**
 * NexAIResponseCard — the soul of the OS. An AI utterance rendered as a
 * floating glass card: glowing model avatar, intent badge, streaming body with
 * a blinking caret, and a hover action bar (copy / regenerate / rate).
 *
 * `streaming` shows the typing dots + caret. `intent` tints the avatar glow to
 * encode the routed task type. Drop arbitrary rich content as children.
 */

const INTENT = {
  reasoning: { color: "#a855f7", label: "Reasoning" },
  coding: { color: "#3b82f6", label: "Coding" },
  general: { color: "#22d3ee", label: "General" },
  research: { color: "#fbbf24", label: "Research" },
  vision: { color: "#ec4899", label: "Vision" },
} as const;

export type NexIntent = keyof typeof INTENT;

export interface NexAIResponseCardProps {
  model?: string;
  intent?: NexIntent;
  streaming?: boolean;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** latency / token meta line shown under the body */
  meta?: React.ReactNode;
  className?: string;
}

export function NexAIResponseCard({ model = "Nex-Era", intent = "general", streaming, children, actions, meta, className }: NexAIResponseCardProps) {
  const tint = INTENT[intent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative rounded-[var(--nex-radius-xl)] p-5 pl-6",
        "bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-lg)] border border-[var(--nex-border)] shadow-[var(--nex-shadow-md)]",
        className,
      )}
    >
      {/* intent accent rail */}
      <span className="absolute left-0 top-5 bottom-5 w-[3px] rounded-full" style={{ background: tint.color, boxShadow: `0 0 12px ${tint.color}` }} />

      <div className="mb-3 flex items-center gap-3">
        {/* glowing AI avatar */}
        <span
          className="relative grid h-9 w-9 place-items-center rounded-[var(--nex-radius-md)] text-white"
          style={{ background: `linear-gradient(135deg, ${tint.color}, rgba(34,211,238,0.9))`, boxShadow: `0 0 22px -4px ${tint.color}` }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.5-6.5-2 2m-7 7-2 2m11 0-2-2m-7-7-2-2" />
          </svg>
          {streaming && <span className="absolute inset-0 rounded-[var(--nex-radius-md)] animate-[nex-breathe_1.8s_ease-in-out_infinite]" style={{ boxShadow: `0 0 18px ${tint.color}` }} />}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--nex-text-sm)] font-semibold text-[var(--nex-text)]">{model}</span>
          <NexBadge size="sm" tone={intent === "reasoning" ? "purple" : intent === "coding" ? "blue" : "cyan"}>
            {tint.label}
          </NexBadge>
        </div>
        {streaming && <NexDots className="ml-1" />}
      </div>

      {/* body */}
      <div className="text-[var(--nex-text-base)] leading-relaxed text-[var(--nex-text-muted)] [&_p]:mb-3 [&_code]:font-mono [&_code]:text-[var(--nex-cyan-300)]">
        {children}
        {streaming && <span className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[2px] bg-[var(--nex-accent)] animate-[nex-blink_1s_step-end_infinite]" />}
      </div>

      {meta && <div className="mt-4 text-[var(--nex-text-xs)] text-[var(--nex-text-faint)]">{meta}</div>}

      {/* hover action bar */}
      {actions && (
        <div className="mt-4 flex items-center gap-1 opacity-0 transition-opacity duration-[var(--nex-dur-base)] group-hover:opacity-100">{actions}</div>
      )}
    </motion.div>
  );
}

/** Compact action button for the AI card bar (copy, regenerate, like…). */
export function NexAIAction({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-[var(--nex-radius-sm)] text-[var(--nex-text-faint)] hover:text-[var(--nex-text)] hover:bg-[var(--nex-glass-hover)] transition-colors [&>svg]:h-4 [&>svg]:w-4"
    >
      {children}
    </button>
  );
}
