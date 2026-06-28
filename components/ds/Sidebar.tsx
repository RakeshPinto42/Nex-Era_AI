"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * NexSidebar — the OS rail. A floating glass column with grouped nav items,
 * an active-item neon indicator, and a collapse toggle. Designed to dock left
 * of the workspace. Keyboard + aria-current aware.
 */

export interface NexNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface NexNavGroup {
  label?: string;
  items: NexNavItem[];
}

export function NexSidebar({
  groups,
  activeId,
  onSelect,
  header,
  footer,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  className,
}: {
  groups: NexNavGroup[];
  activeId?: string;
  onSelect?: (id: string) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
  className?: string;
}) {
  const [internal, setInternal] = React.useState(false);
  const collapsed = controlledCollapsed ?? internal;
  const setCollapsed = (v: boolean) => (onCollapsedChange ? onCollapsedChange(v) : setInternal(v));

  return (
    <nav
      className={cn(
        "flex h-full flex-col gap-2 rounded-[var(--nex-radius-2xl)] p-3",
        "bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-lg)] border border-[var(--nex-border)] shadow-[var(--nex-shadow-md)]",
        "transition-[width] duration-[var(--nex-dur-slow)] ease-[cubic-bezier(0.22,1,0.36,1)]",
        collapsed ? "w-[76px]" : "w-[256px]",
        className,
      )}
      aria-label="Primary"
    >
      {header && <div className="px-2 py-3">{header}</div>}

      <div className="flex-1 overflow-y-auto">
        {groups.map((group, gi) => (
          <div key={gi} className="mb-4">
            {group.label && !collapsed && (
              <div className="px-3 pb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--nex-text-faint)]">{group.label}</div>
            )}
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = item.id === activeId;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSelect?.(item.id)}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-[var(--nex-radius-md)] px-3 py-2.5 text-[var(--nex-text-sm)] font-medium transition-all duration-[var(--nex-dur-base)]",
                        collapsed && "justify-center",
                        active
                          ? "text-[var(--nex-text)] bg-[var(--nex-glass-hover)] shadow-[var(--nex-glow-purple)]"
                          : "text-[var(--nex-text-muted)] hover:text-[var(--nex-text)] hover:bg-[var(--nex-glass-faint)]",
                      )}
                    >
                      {/* active neon rail */}
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,#f2761c,#fb8c6a)] transition-opacity duration-[var(--nex-dur-base)]",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {item.icon && <span className="shrink-0 [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>}
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.badge && <span className="ml-auto">{item.badge}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {footer && <div className="border-t border-[var(--nex-border)] pt-3">{footer}</div>}

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mt-1 grid h-9 place-items-center rounded-[var(--nex-radius-md)] text-[var(--nex-text-faint)] hover:text-[var(--nex-text)] hover:bg-[var(--nex-glass-faint)] transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg className={cn("h-4 w-4 transition-transform duration-[var(--nex-dur-base)]", collapsed && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
    </nav>
  );
}
