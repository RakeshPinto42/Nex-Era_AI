"use client";

/* Phase-1 placeholder landing for a Finance OS studio. Routes correctly,
   inherits the shell, and clearly marks where Phase-2 functionality lands.
   No business logic. */

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { FINANCE_APPS } from "@/lib/finance-os/apps";

// Server pages pass only serializable props (slug + planned). The icon/name/
// desc/accent are resolved here, client-side, from the apps registry — so no
// function crosses the server→client boundary.
export function FlagshipPlaceholder({ slug, planned }: { slug: string; planned: string[] }) {
  const app = FINANCE_APPS.find((a) => a.slug === slug) ?? FINANCE_APPS[0];
  const { name, desc, accent, icon: Icon } = app;
  return (
    <div className="relative h-full overflow-y-auto">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64"
        style={{ background: `radial-gradient(700px 240px at 30% -40%, ${accent}22, transparent 70%)` }}
      />
      <div className="mx-auto w-full max-w-3xl px-6 py-14 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <span
            className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl text-white shadow-soft"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
          >
            <Icon size={28} />
          </span>
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-medium text-muted shadow-soft">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} /> Finance OS · arriving in Phase 2
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{name}</h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{desc}</p>
        </motion.div>

        <div className="mx-auto mt-9 max-w-xl rounded-2xl border border-line bg-surface p-6 text-left shadow-soft">
          <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <Sparkles size={13} className="text-brand" /> Planned in this studio
          </p>
          <ul className="space-y-2">
            {planned.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[13.5px] text-ink">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: accent }} />
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-[12.5px] text-muted">
            The shell around this page — top bar, context panel, upload, export, history, approvals — is already live and shared by every studio. Only this workspace changes when the studio ships.
          </p>
        </div>
      </div>
    </div>
  );
}
