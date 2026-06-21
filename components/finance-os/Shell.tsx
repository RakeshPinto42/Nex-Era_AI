"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { MODULES, MODULE_GROUPS } from "@/lib/finance-os/modules";
import { IDENTITY } from "@/lib/finance-os/identity";
import { NexeraMark } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { FosThemeProvider, ThemeToggle } from "./system/theme";
import { ToastProvider } from "./system/toast";

// Finance OS shell: themed (dark default), with a desktop module rail and a
// mobile drawer + top bar so the workspace is fully usable on phones/tablets.

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <FosThemeProvider>
      <ToastProvider>
        <ShellInner>{children}</ShellInner>
      </ToastProvider>
    </FosThemeProvider>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-fos-bg text-fos-text">
      <Rail className="hidden w-[248px] flex-none lg:flex" path={path} />

      {/* mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
          <Rail
            className="fixed inset-y-0 left-0 z-50 flex w-[260px] lg:hidden"
            path={path}
            onNavigate={() => setOpen(false)}
            onClose={() => setOpen(false)}
          />
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <div className="flex items-center gap-3 border-b border-fos-border bg-fos-surface px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-fos-muted hover:text-fos-text">
            <Menu size={20} />
          </button>
          <Link href="/ledger" className="flex items-center gap-2">
            <NexeraMark size={22} />
            <span className="text-sm font-semibold">NEXERA Ledger</span>
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function Rail({
  className,
  path,
  onNavigate,
  onClose,
}: {
  className?: string;
  path: string;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  return (
    <aside className={cn("flex-col border-r border-fos-border bg-fos-surface", className)}>
      <div className="flex items-center gap-2.5 px-5 py-4">
        <NexeraMark size={28} />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-fos-text">NEXERA</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">Ledger</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {onClose && (
            <button onClick={onClose} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-lg text-fos-muted hover:text-fos-text lg:hidden">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        {MODULE_GROUPS.map((group) => (
          <div key={group} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 pt-1 font-mono text-[9px] uppercase tracking-widest text-fos-faint">{group}</p>
            {MODULES.filter((m) => m.group === group).map((m) => {
              const active = m.href ? path === m.href || path.startsWith(m.href + "/") : false;
              const id = IDENTITY[m.slug];
              const Icon = id?.icon;
              return m.href ? (
                <Link
                  key={m.slug}
                  href={m.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "text-fos-text" : "text-fos-muted hover:bg-fos-surface2 hover:text-fos-text",
                  )}
                  style={active ? { backgroundColor: `${id.accent}24` } : undefined}
                >
                  {Icon && (
                    <span
                      className="grid h-6 w-6 flex-none place-items-center rounded-md"
                      style={{ backgroundColor: `${id?.accent ?? "#3b82f6"}26`, color: id?.accent ?? "#3b82f6" }}
                    >
                      <Icon size={14} />
                    </span>
                  )}
                  <span className="truncate">{m.name}</span>
                </Link>
              ) : (
                <span key={m.slug} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-fos-faint">
                  <span className="h-6 w-6 flex-none rounded-md bg-fos-surface2" />
                  <span className="truncate">{m.name}</span>
                </span>
              );
            })}
          </div>
        ))}
      </nav>

      <Link href="/dashboard" className="border-t border-fos-border px-5 py-3 text-xs text-fos-muted hover:text-fos-text">
        ← Back to NEXERA
      </Link>
    </aside>
  );
}
