"use client";

// Themed module shell: a colored hero band (accent gradient + title + kicker)
// gives each module an instant visual identity. The module ICON lives only in the
// sidebar — the hero uses color + a subtle texture instead, to avoid duplicating
// the same icon in two places. Each module supplies its own bespoke body.

import type { ReactNode } from "react";
import { IDENTITY } from "@/lib/finance-os/identity";

export function ModuleScreen({
  slug,
  title,
  actions,
  children,
  maxWidth = "max-w-6xl",
}: {
  slug: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}) {
  const id = IDENTITY[slug] ?? IDENTITY.commission;
  return (
    <div className="h-full overflow-y-auto bg-fos-bg">
      <header
        className="relative overflow-hidden px-6 py-8 text-white shadow-[0_12px_32px_-14px_rgba(0,0,0,0.45)]"
        style={{ background: `linear-gradient(115deg, ${id.accent}, ${id.accentDark})` }}
      >
        {/* subtle texture (not an icon): soft highlight + faint diagonal sheen */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 88% -30%, rgba(255,255,255,0.22), transparent 55%), repeating-linear-gradient(125deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 22px)",
          }}
        />
        <div className={`relative mx-auto flex items-center gap-4 ${maxWidth}`}>
          {/* accent bar instead of a duplicate icon */}
          <span className="h-11 w-1.5 flex-none rounded-full bg-white/60" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-0.5 text-sm text-white/80">{id.kicker}</p>
          </div>
          {actions}
        </div>
      </header>
      <div className="px-6 py-6">
        <div className={`mx-auto ${maxWidth}`}>{children}</div>
      </div>
    </div>
  );
}
