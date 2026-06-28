"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * NexButton — the primary action primitive.
 *
 * Variants encode intent, not just looks:
 *   primary   — the signature neon-gradient CTA (one per view, ideally).
 *   glass     — translucent glass action, the everyday button.
 *   outline   — luminous hairline, secondary actions.
 *   ghost     — text-only, tertiary / toolbar actions.
 *   danger    — destructive.
 *
 * Hover lifts + intensifies the glow; active settles. All motion is CSS so the
 * button stays a server-cheap, dependency-light primitive.
 */
const button = cva(
  [
    "relative inline-flex items-center justify-center gap-2 select-none whitespace-nowrap",
    "font-medium tracking-tight rounded-[var(--nex-radius-md)]",
    "transition-[transform,box-shadow,background,border-color] duration-[var(--nex-dur-base)]",
    "ease-[cubic-bezier(0.22,1,0.36,1)] outline-none",
    "disabled:pointer-events-none disabled:opacity-45",
    "active:translate-y-0 active:scale-[0.98]",
  ],
  {
    variants: {
      variant: {
        primary: [
          "text-white border border-white/10",
          "bg-[linear-gradient(120deg,#f2761c_0%,#f2761c_52%,#fb8c6a_100%)]",
          "shadow-[0_8px_30px_-10px_rgba(242,118,28,0.6)]",
          "hover:-translate-y-0.5 hover:shadow-[0_14px_44px_-12px_rgba(242,118,28,0.8)]",
        ],
        glass: [
          "text-[var(--nex-text)] border border-[var(--nex-border-strong)]",
          "bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-md)]",
          "hover:bg-[var(--nex-glass-hover)] hover:-translate-y-0.5",
          "hover:shadow-[var(--nex-glow-purple)] hover:border-[var(--nex-border-glow)]",
        ],
        outline: [
          "text-[var(--nex-text)] bg-transparent border border-[var(--nex-border-strong)]",
          "hover:border-[var(--nex-border-glow)] hover:shadow-[var(--nex-glow-blue)] hover:-translate-y-0.5",
        ],
        ghost: [
          "text-[var(--nex-text-muted)] bg-transparent border border-transparent",
          "hover:text-[var(--nex-text)] hover:bg-[var(--nex-glass-faint)]",
        ],
        danger: [
          "text-white border border-rose-300/20",
          "bg-[linear-gradient(120deg,#fb7185_0%,#e11d48_100%)]",
          "shadow-[0_8px_30px_-10px_rgba(244,63,94,0.55)]",
          "hover:-translate-y-0.5 hover:shadow-[0_14px_44px_-12px_rgba(244,63,94,0.75)]",
        ],
      },
      size: {
        sm: "h-9 px-4 text-[var(--nex-text-sm)]",
        md: "h-11 px-5 text-[var(--nex-text-base)]",
        lg: "h-13 px-7 text-[var(--nex-text-lg)] [height:3.25rem]",
        icon: "h-11 w-11 p-0",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "glass", size: "md", block: false },
  },
);

export interface NexButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const NexButton = React.forwardRef<HTMLButtonElement, NexButtonProps>(
  ({ className, variant, size, block, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(button({ variant, size, block }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-r-transparent border-b-transparent opacity-90 animate-[nex-spin_0.7s_linear_infinite]"
          />
        )}
        {!loading && leftIcon}
        {children && <span className="truncate">{children}</span>}
        {!loading && rightIcon}
      </button>
    );
  },
);
NexButton.displayName = "NexButton";
