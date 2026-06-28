"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * NexNavbar — floating top command bar. Sticky glass strip holding the brand,
 * center nav links, and trailing actions. Pairs with NexSidebar.
 *
 * NexTabs — segmented pill tabs with a sliding neon highlight, for in-page
 * section switching.
 */

export function NexNavbar({
  brand,
  links,
  actions,
  className,
}: {
  brand?: React.ReactNode;
  links?: { label: string; active?: boolean; onClick?: () => void }[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-4 z-[200] mx-auto flex h-16 w-full items-center gap-4 rounded-[var(--nex-radius-xl)] px-4",
        "bg-[var(--nex-glass-strong)] backdrop-blur-[var(--nex-blur-xl)] border border-[var(--nex-border)] shadow-[var(--nex-shadow-md)]",
        className,
      )}
    >
      {brand && <div className="flex items-center gap-2 font-semibold">{brand}</div>}
      {links && (
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={l.onClick}
              aria-current={l.active ? "page" : undefined}
              className={cn(
                "rounded-[var(--nex-radius-md)] px-3.5 py-2 text-[var(--nex-text-sm)] font-medium transition-colors duration-[var(--nex-dur-base)]",
                l.active ? "text-[var(--nex-text)] bg-[var(--nex-glass-faint)]" : "text-[var(--nex-text-muted)] hover:text-[var(--nex-text)]",
              )}
            >
              {l.label}
            </button>
          ))}
        </nav>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function NexTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: string; label: React.ReactNode }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--nex-radius-lg)] p-1 bg-[var(--nex-glass-faint)] border border-[var(--nex-border)]",
        className,
      )}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative rounded-[var(--nex-radius-md)] px-4 py-2 text-[var(--nex-text-sm)] font-medium transition-colors duration-[var(--nex-dur-base)]",
              active ? "text-white" : "text-[var(--nex-text-muted)] hover:text-[var(--nex-text)]",
            )}
          >
            {active && (
              <span className="absolute inset-0 -z-0 rounded-[var(--nex-radius-md)] bg-[linear-gradient(120deg,rgba(168,85,247,0.9),rgba(34,211,238,0.85))] shadow-[var(--nex-glow-purple)]" />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
