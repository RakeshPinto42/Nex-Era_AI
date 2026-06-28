"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * NexInput / NexTextarea / NexSelect — glass form fields.
 *
 * Resting state is a quiet sunken glass slab; focus blooms a neon ring + glow.
 * Wrap with <NexField> to attach a label, hint and error in one consistent
 * layout. Icons sit inside the field via the `icon` / `trailing` slots.
 */

const fieldBase =
  "w-full rounded-[var(--nex-radius-md)] bg-[var(--nex-glass-faint)] text-[var(--nex-text)] " +
  "placeholder:text-[var(--nex-text-faint)] border border-[var(--nex-border)] " +
  "backdrop-blur-[var(--nex-blur-sm)] transition-[border-color,box-shadow,background] " +
  "duration-[var(--nex-dur-base)] ease-[cubic-bezier(0.22,1,0.36,1)] outline-none " +
  "focus:border-[var(--nex-border-glow)] focus:bg-[var(--nex-glass)] focus:shadow-[var(--nex-glow-focus)] " +
  "disabled:opacity-45 disabled:pointer-events-none";

export interface NexInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  invalid?: boolean;
}

export const NexInput = React.forwardRef<HTMLInputElement, NexInputProps>(
  ({ className, icon, trailing, invalid, ...props }, ref) => (
    <div className="relative flex items-center">
      {icon && (
        <span className="pointer-events-none absolute left-4 text-[var(--nex-text-faint)] [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          fieldBase,
          "h-11 px-4 text-[var(--nex-text-base)]",
          icon && "pl-11",
          trailing && "pr-11",
          invalid && "border-[var(--nex-danger)] focus:shadow-[0_0_0_4px_rgba(251,113,133,0.18)]",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {trailing && <span className="absolute right-4 text-[var(--nex-text-faint)]">{trailing}</span>}
    </div>
  ),
);
NexInput.displayName = "NexInput";

export const NexTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldBase, "min-h-[120px] resize-y px-4 py-3 text-[var(--nex-text-base)] leading-relaxed", invalid && "border-[var(--nex-danger)]", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  ),
);
NexTextarea.displayName = "NexTextarea";

export const NexSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(fieldBase, "h-11 appearance-none pl-4 pr-10 text-[var(--nex-text-base)] [&>option]:bg-[var(--nex-bg-raised)] [&>option]:text-[var(--nex-text)]", className)}
        {...props}
      >
        {children}
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--nex-text-faint)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  ),
);
NexSelect.displayName = "NexSelect";

export interface NexFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/** Field wrapper — label + control + hint/error in the standard DS layout. */
export function NexField({ label, hint, error, required, htmlFor, className, children }: NexFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[var(--nex-text-sm)] font-medium text-[var(--nex-text-muted)]">
          {label}
          {required && <span className="ml-1 text-[var(--nex-accent)]">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="text-[var(--nex-text-xs)] text-[var(--nex-danger)]">{error}</span>
      ) : hint ? (
        <span className="text-[var(--nex-text-xs)] text-[var(--nex-text-faint)]">{hint}</span>
      ) : null}
    </div>
  );
}

/** Glass switch / toggle. */
export const NexSwitch = React.forwardRef<HTMLButtonElement, { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }>(
  ({ checked, onChange, disabled, label }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-all duration-[var(--nex-dur-base)] disabled:opacity-45",
        checked
          ? "border-transparent bg-[linear-gradient(120deg,#f2761c,#fb8c6a)] shadow-[var(--nex-glow-purple)]"
          : "border-[var(--nex-border)] bg-[var(--nex-glass-faint)]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-[var(--nex-dur-base)] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  ),
);
NexSwitch.displayName = "NexSwitch";
