"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MODULES } from "@/lib/finance-os/modules";
import { IDENTITY } from "@/lib/finance-os/identity";
import { PrivacyNote } from "@/components/finance/shared";

const FEATURED = ["commission", "pricing", "deal-desk", "forecast", "margin"];

export default function FinanceOsHome() {
  const featured = MODULES.filter((m) => FEATURED.includes(m.slug));
  const rest = MODULES.filter((m) => !FEATURED.includes(m.slug));

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      {/* workspace header */}
      <header className="border-b border-line bg-white px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-brand-600">NEXERA Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">NEXERA Ledger</h1>
          <p className="mt-1 text-base text-muted">Commercial Finance Toolkit</p>
          <div className="mt-4 max-w-xl"><PrivacyNote /></div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* featured modules */}
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Featured modules</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((m, i) => {
            const id = IDENTITY[m.slug];
            const Icon = id.icon;
            return (
              <motion.div
                key={m.slug}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  href={m.href!}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${id.accent}, ${id.accentDark})` }} />
                  <div className="flex flex-1 flex-col p-5">
                    <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${id.accent}1a`, color: id.accent }}>
                      <Icon size={22} />
                    </span>
                    <h3 className="mt-4 font-semibold text-neutral-900">{m.name}</h3>
                    <p className="mt-1 flex-1 text-sm text-muted">{m.desc}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5" style={{ color: id.accent }}>
                      Open →
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* all modules */}
        <p className="mb-3 mt-10 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">More modules</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((m) => {
            const id = IDENTITY[m.slug];
            const Icon = id.icon;
            return (
              <Link
                key={m.slug}
                href={m.href!}
                className="group flex items-center gap-3 rounded-xl border border-line bg-white p-4 transition-colors hover:bg-canvas"
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-lg" style={{ background: `${id.accent}1a`, color: id.accent }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900">{m.name}</p>
                  <p className="truncate text-xs text-muted">{m.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
