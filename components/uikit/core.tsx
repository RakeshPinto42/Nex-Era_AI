"use client";

/**
 * Command Center UI kit — core primitives.
 * One warm-white design language: cream canvas, off-white cards, orange/coral
 * accent, soft floating shadows, rounded friendly geometry. Every app page
 * composes these so the platform reads as one design library.
 */

import * as React from "react";
import { motion } from "framer-motion";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ Button */

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-sm shadow-brand/25 hover:bg-accent-hover hover:shadow-md hover:shadow-brand/30 active:bg-accent-hover focus-visible:ring-brand/50",
  secondary:
    "bg-surface-2 text-ink border border-line hover:bg-surface-3 hover:border-line-strong focus-visible:ring-brand/40",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink focus-visible:ring-brand/40",
  outline: "border border-line bg-surface text-ink hover:border-brand/40 hover:text-brand hover:bg-accent-tint focus-visible:ring-brand/40",
  danger: "bg-danger text-white shadow-sm shadow-danger/25 hover:brightness-[0.96] focus-visible:ring-danger/50",
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2.5 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block h-[1em] w-[1em] animate-spin rounded-full border-2 border-current border-t-transparent opacity-80",
        className,
      )}
      aria-hidden
    />
  );
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: React.ReactNode;
    iconRight?: React.ReactNode;
    loading?: boolean;
  }
>(function Button(
  { variant = "primary", size = "md", icon, iconRight, loading = false, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex select-none items-center justify-center font-medium transition-all duration-200",
        "outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        BTN_SIZE[size],
        BTN_VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
});

export { Spinner };

/* -------------------------------------------------------------------- Card */

export function Card({
  className,
  hover = false,
  as: As = "div",
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  as?: React.ElementType;
}) {
  return (
    <As
      className={cx(
        "rounded-2xl border border-line bg-surface shadow-soft",
        hover && "hover-lift cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

/* ----------------------------------------------------------------- Section */

export function Section({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cx("mb-8", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            {title && (
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ Widget */
/* A titled card with an optional "open/view all" action — the workhorse panel. */

export function Widget({
  title,
  badge,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cx("flex flex-col p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {title && (
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                {title}
              </h3>
            )}
            {badge}
          </div>
          {action}
        </div>
      )}
      <div className={cx("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </Card>
  );
}

/* --------------------------------------------------------------- Chip/Tag */

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  accent: "bg-brand/10 text-accent-hover",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-[#b27400]",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
};

export function Chip({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_SOFT[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cx(
            "h-1.5 w-1.5 rounded-full",
            tone === "neutral" ? "bg-muted" : "bg-current",
          )}
        />
      )}
      {children}
    </span>
  );
}

export function Badge({
  tone = "accent",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
        TONE_SOFT[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- Avatar */

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name?: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const initials = (name ?? "··")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cx(
        "grid flex-none place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-accent-soft font-semibold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

/* ------------------------------------------------------------------- Stat */

export function Stat({
  label,
  value,
  delta,
  deltaTone,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  deltaTone?: "up" | "down";
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
      {delta != null && (
        <p
          className={cx(
            "mt-0.5 text-xs font-semibold",
            deltaTone === "down" ? "text-danger" : "text-success",
          )}
        >
          {delta}
        </p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Progress */

export function Progress({
  value,
  className,
  tone = "accent",
}: {
  value: number; // 0..100
  className?: string;
  tone?: "accent" | "success";
}) {
  return (
    <div className={cx("h-2 overflow-hidden rounded-full bg-surface-3", className)}>
      <motion.div
        className={cx(
          "h-full rounded-full",
          tone === "success" ? "bg-success" : "bg-gradient-to-r from-brand to-accent-soft",
        )}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 9,
  label,
  sublabel,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <defs>
          <linearGradient id="ring-accent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f2761c" />
            <stop offset="100%" stopColor="#fb8c6a" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-xl font-bold text-ink">{label ?? `${Math.round(pct)}%`}</div>
          {sublabel && <div className="text-[10px] font-medium text-faint">{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Search */

export function Search({
  placeholder = "Search…",
  kbd = "⌘K",
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { kbd?: string }) {
  return (
    <div className={cx("relative flex items-center", className)}>
      <svg
        className="pointer-events-none absolute left-3 text-faint"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-surface-2 py-2.5 pl-9 pr-16 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-brand/50 focus:bg-surface"
        {...rest}
      />
      {kbd && (
        <kbd className="absolute right-3 hidden rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-faint sm:block">
          {kbd}
        </kbd>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- Notification */

export function Notification({
  tone = "info",
  title,
  children,
  onClose,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-soft">
      <span className={cx("mt-1 h-2 w-2 flex-none rounded-full", TONE_SOFT[tone], "!bg-current")} />
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold text-ink">{title}</p>}
        {children && <p className="text-xs text-muted">{children}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="grid h-6 w-6 flex-none place-items-center rounded-md text-faint hover:bg-surface-2 hover:text-ink"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Inputs */
/* One shared field style — used by Input, Textarea and the Select trigger so
   every form control across the app shares spacing and the orange focus ring. */

export const inputBase =
  "w-full rounded-xl border border-line bg-surface-2 text-ink placeholder:text-faint outline-none transition-all duration-200 focus:border-brand/50 focus:bg-surface focus:shadow-[0_0_0_3px_rgba(242,118,28,0.15)] disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputBase, "px-3.5 py-2.5 text-sm", className)} {...rest} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(inputBase, "px-3.5 py-2.5 text-sm leading-relaxed resize-y min-h-[88px]", className)} {...rest} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cx(inputBase, "appearance-none cursor-pointer px-3.5 py-2.5 pr-9 text-sm", className)}
        {...rest}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint"
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
});

/* --------------------------------------------------------------- Skeleton */

export function Skeleton({
  className,
  width,
  height,
  rounded = "rounded-lg",
}: {
  className?: string;
  width?: number | string;
  height?: number | string;
  rounded?: string;
}) {
  return (
    <span
      className={cx("skeleton block", rounded, className)}
      style={{ width, height }}
      aria-hidden
    />
  );
}

/* ------------------------------------------------------------- EmptyState */
/* Premium placeholder for zero-data surfaces — soft icon medallion, title,
   one line of guidance and an optional action. */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8" : "py-16",
        className,
      )}
    >
      {icon != null && (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-gradient-to-br from-accent-tint to-surface-2 text-brand shadow-soft">
          {icon}
        </span>
      )}
      <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export { cx };
