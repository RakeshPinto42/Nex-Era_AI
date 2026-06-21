"use client";

// Themed modal + a small prompt dialog to replace native window.prompt().

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/50 animate-[fos-overlay_0.2s_ease-out]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${width} rounded-2xl border border-fos-border bg-fos-surface p-5 text-fos-text animate-[fos-dialog_0.2s_ease-out]`}
        style={{ boxShadow: "var(--fos-shadow)" }}
      >
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">{title}</h3>
            <button onClick={onClose} className="text-fos-muted hover:text-fos-text" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Inline name-prompt dialog. Resolves via onSubmit; replaces window.prompt. */
export function PromptDialog({
  open,
  title,
  label,
  defaultValue = "",
  submitLabel = "Save",
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  label?: string;
  defaultValue?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        {label && <label className="mb-1 block text-xs font-medium text-fos-muted">{label}</label>}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-fos-border bg-fos-bg px-3 py-2 text-sm text-fos-text outline-none focus:border-brand-600"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-fos-border px-3.5 py-2 text-sm text-fos-muted hover:text-fos-text">
            Cancel
          </button>
          <button type="submit" className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:brightness-95">
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
