"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * NexCard — the large floating glass surface that defines the Nex-Era canvas.
 *
 * Variants:
 *   glass   — default translucent panel.
 *   solid   — opaque raised surface (for dense data, tables).
 *   ring    — glass + animated gradient hairline (showpiece / featured).
 *   bare    — no chrome, just radius + padding (for nesting).
 *
 * `float` adds a slow idle levitation; `interactive` adds hover lift + glow and
 * makes the whole card a pointer target. Compose with the Card.* subparts.
 */
const card = cva(
  [
    "relative rounded-[var(--nex-radius-xl)] text-[var(--nex-text)]",
    "transition-[transform,box-shadow,border-color,background] duration-[var(--nex-dur-slow)]",
    "ease-[cubic-bezier(0.22,1,0.36,1)]",
  ],
  {
    variants: {
      variant: {
        glass: [
          "bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-lg)] backdrop-saturate-150",
          "border border-[var(--nex-border)] shadow-[var(--nex-shadow-md)]",
        ],
        solid: ["bg-[var(--nex-bg-raised)] border border-[var(--nex-border)] shadow-[var(--nex-shadow-md)]"],
        ring: [
          "nex-ring bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-lg)]",
          "border border-transparent shadow-[var(--nex-shadow-lg)]",
        ],
        bare: ["bg-transparent"],
      },
      pad: {
        none: "p-0",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
      interactive: {
        true: "cursor-pointer hover:-translate-y-1 hover:border-[var(--nex-border-glow)] hover:shadow-[var(--nex-shadow-float),var(--nex-glow-purple)]",
        false: "",
      },
      float: { true: "nex-anim-float", false: "" },
    },
    defaultVariants: { variant: "glass", pad: "md", interactive: false, float: false },
  },
);

export interface NexCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof card> {
  /** Soft colored spotlight bloom behind the card. */
  glow?: "purple" | "blue" | "cyan" | "none";
}

const glowMap = {
  purple: "before:bg-[radial-gradient(420px_circle_at_30%_-10%,rgba(168,85,247,0.16),transparent_60%)]",
  blue: "before:bg-[radial-gradient(420px_circle_at_30%_-10%,rgba(59,130,246,0.16),transparent_60%)]",
  cyan: "before:bg-[radial-gradient(420px_circle_at_30%_-10%,rgba(34,211,238,0.16),transparent_60%)]",
  none: "",
};

export const NexCard = React.forwardRef<HTMLDivElement, NexCardProps>(
  ({ className, variant, pad, interactive, float, glow = "none", children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        card({ variant, pad, interactive, float }),
        glow !== "none" &&
          cn("before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:-z-10", glowMap[glow]),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
NexCard.displayName = "NexCard";

export function NexCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-4 mb-4", className)} {...props} />;
}

export function NexCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("nex-display text-[var(--nex-text-xl)] font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function NexCardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[var(--nex-text-sm)] text-[var(--nex-text-muted)] leading-relaxed", className)} {...props} />;
}

export function NexCardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-[var(--nex-text-base)] text-[var(--nex-text-muted)]", className)} {...props} />;
}

export function NexCardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex items-center gap-3", className)} {...props} />;
}
