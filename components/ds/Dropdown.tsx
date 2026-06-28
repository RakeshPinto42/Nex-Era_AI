"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * NexDropdown — glass menu anchored to a trigger.
 *
 * Uncontrolled by default: pass a `trigger` element and `items`. Closes on
 * outside click, Escape, or item select. For full custom content use the
 * lower-level <NexMenu> with <NexMenuItem> children.
 */

export interface NexMenuItem {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export function NexDropdown({
  trigger,
  items,
  align = "start",
  className,
}: {
  trigger: React.ReactNode;
  items: NexMenuItem[];
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <span onClick={() => setOpen((v) => !v)}>{trigger}</span>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute z-[300] mt-2 min-w-[200px] overflow-hidden rounded-[var(--nex-radius-lg)] p-1.5",
              "bg-[var(--nex-glass-strong)] backdrop-blur-[var(--nex-blur-xl)] border border-[var(--nex-border-strong)] shadow-[var(--nex-shadow-lg)]",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {items.map((item, i) =>
              item.divider ? (
                <div key={i} className="my-1.5 h-px bg-[var(--nex-border)]" />
              ) : (
                <button
                  key={i}
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onSelect?.();
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[var(--nex-radius-sm)] px-3 py-2 text-left text-[var(--nex-text-sm)] transition-colors duration-[var(--nex-dur-fast)]",
                    "disabled:opacity-40 disabled:pointer-events-none",
                    item.danger
                      ? "text-[var(--nex-danger)] hover:bg-[rgba(251,113,133,0.12)]"
                      : "text-[var(--nex-text-muted)] hover:text-[var(--nex-text)] hover:bg-[var(--nex-glass-hover)]",
                  )}
                >
                  {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4 shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
