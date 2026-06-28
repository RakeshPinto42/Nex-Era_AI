"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NexButton } from "./Button";

/**
 * Overlay primitives — NexModal (generic) and NexDialog (confirm/alert).
 *
 * Backdrop is a blurred cosmic scrim; the panel rises with a cinematic
 * fade+scale. Closes on Escape and backdrop click. Body scroll locks while
 * open. Rendered through a portal to <body>.
 */

function useLockScroll(open: boolean) {
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

export interface NexModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** max width preset */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** click backdrop / Esc closes (default true) */
  dismissable?: boolean;
}

const sizeMap = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export function NexModal({ open, onClose, title, description, children, footer, size = "md", className, dismissable = true }: NexModalProps) {
  const [mounted, setMounted] = React.useState(false);
  useLockScroll(open);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissable, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="nex fixed inset-0 grid place-items-center p-4" style={{ zIndex: 500 }} role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-[rgba(3,4,12,0.6)] backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={() => dismissable && onClose()}
          />
          <motion.div
            className={cn(
              "relative w-full rounded-[var(--nex-radius-2xl)] bg-[var(--nex-glass-strong)] backdrop-blur-[var(--nex-blur-xl)] border border-[var(--nex-border-strong)] shadow-[var(--nex-shadow-lg)] p-7",
              sizeMap[size],
              className,
            )}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* top hairline gradient */}
            <span className="pointer-events-none absolute inset-x-7 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(168,85,247,0.6),rgba(34,211,238,0.6),transparent)]" />
            {(title || dismissable) && (
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  {title && <h2 className="nex-display text-[var(--nex-text-2xl)] font-semibold">{title}</h2>}
                  {description && <p className="mt-1 text-[var(--nex-text-sm)] text-[var(--nex-text-muted)]">{description}</p>}
                </div>
                {dismissable && (
                  <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-[var(--nex-text-faint)] hover:text-[var(--nex-text)] hover:bg-[var(--nex-glass-faint)] transition-colors">
                    ✕
                  </button>
                )}
              </div>
            )}
            {children && <div className="mt-4 text-[var(--nex-text-muted)]">{children}</div>}
            {footer && <div className="mt-7 flex items-center justify-end gap-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export interface NexDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  loading?: boolean;
}

/** Confirm / alert dialog built on NexModal. */
export function NexDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "default", loading }: NexDialogProps) {
  return (
    <NexModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <NexButton variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </NexButton>
          <NexButton variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </NexButton>
        </>
      }
    />
  );
}
