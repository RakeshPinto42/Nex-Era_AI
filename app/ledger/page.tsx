"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { MODULES, MODULE_GROUPS } from "@/lib/finance-os/modules";
import { IDENTITY } from "@/lib/finance-os/identity";
import { TiltCard } from "@/components/ui/TiltCard";

// Flagship first (spans two columns), then the most-used modules.
const FEATURED = [
  "commercial-intelligence",
  "commission",
  "forecast",
  "margin",
  "profitability",
  "variance",
];

const STATS = [
  { k: String(MODULES.length), v: "modules" },
  { k: String(MODULE_GROUPS.length), v: "suites" },
  { k: "100%", v: "local-first" },
];

export default function FinanceOsHome() {
  const featured = FEATURED.map((s) => MODULES.find((m) => m.slug === s)).filter(
    (m): m is (typeof MODULES)[number] => Boolean(m),
  );
  const rest = MODULES.filter((m) => !FEATURED.includes(m.slug));

  return (
    <div className="h-full overflow-y-auto bg-fos-bg text-fos-text">
      {/* ---- hero header ---- */}
      <header className="relative overflow-hidden border-b border-fos-border bg-fos-surface">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="aurora absolute -top-28 left-1/3 h-72 w-[640px] rounded-full opacity-40 blur-[120px] [background:conic-gradient(from_0deg,rgba(59,130,246,0.40),rgba(139,92,246,0.40),rgba(6,182,212,0.35),rgba(59,130,246,0.40))]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 py-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-brand-600">
            NEXERA Workspace
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-brand to-violet bg-clip-text text-transparent">
              NEXERA Ledger
            </span>
          </h1>
          <p className="mt-2 max-w-xl text-base text-fos-muted">
            Commercial finance toolkit — pricing, forecasting, commissions and
            reporting, computed locally on your own data.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-fos-border bg-fos-surface2 px-3 py-1.5 text-xs text-fos-muted">
            <ShieldCheck size={13} className="text-brand-600" />
            Local-first · your data never leaves this device
          </div>

          <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
            {STATS.map((s) => (
              <div
                key={s.v}
                className="rounded-xl border border-fos-border bg-fos-surface2 px-4 py-3 shadow-[var(--fos-shadow)]"
              >
                <p className="text-2xl font-semibold tabular-nums text-fos-text">{s.k}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">
                  {s.v}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* ---- featured modules ---- */}
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fos-muted">
          Featured modules
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((m, i) => {
            const id = IDENTITY[m.slug];
            const Icon = id.icon;
            const spotlight = m.slug === "commercial-intelligence";
            return (
              <motion.div
                key={m.slug}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className={spotlight ? "sm:col-span-2 lg:col-span-2" : ""}
              >
                <TiltCard max={6} className="h-full">
                  <Link
                    href={m.href!}
                    className="shine group relative flex h-full flex-col overflow-hidden rounded-2xl border border-fos-border bg-fos-surface shadow-[var(--fos-shadow)] transition-shadow duration-300 hover:shadow-lift"
                  >
                    <span
                      className="h-1.5 w-full flex-none"
                      style={{ background: `linear-gradient(90deg, ${id.accent}, ${id.accentDark})` }}
                    />
                    {/* accent glow on hover */}
                    <div
                      className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                      style={{ background: `${id.accent}33` }}
                    />
                    <div
                      className="flex flex-1 flex-col p-5"
                      style={{ transform: "translateZ(34px)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="grid h-11 w-11 place-items-center rounded-xl"
                          style={{
                            background: `${id.accent}1f`,
                            color: id.accent,
                            boxShadow: `inset 0 0 0 1px ${id.accent}33`,
                          }}
                        >
                          <Icon size={22} />
                        </span>
                        {spotlight && (
                          <span
                            className="rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider"
                            style={{ background: `${id.accent}1f`, color: id.accent }}
                          >
                            Flagship
                          </span>
                        )}
                      </div>
                      <h3 className="mt-4 font-semibold text-fos-text">{m.name}</h3>
                      <p className="mt-1 flex-1 text-sm text-fos-muted">{m.desc}</p>
                      <span
                        className="mt-3 inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5"
                        style={{ color: id.accent }}
                      >
                        Open →
                      </span>
                    </div>
                  </Link>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>

        {/* ---- all modules ---- */}
        <p className="mb-3 mt-10 font-mono text-[11px] uppercase tracking-[0.18em] text-fos-muted">
          More modules
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((m) => {
            const id = IDENTITY[m.slug];
            const Icon = id.icon;
            return (
              <Link
                key={m.slug}
                href={m.href!}
                className="shine group flex items-center gap-3 rounded-xl border border-fos-border bg-fos-surface p-4 shadow-[var(--fos-shadow)] transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span
                  className="grid h-9 w-9 flex-none place-items-center rounded-lg"
                  style={{
                    background: `${id.accent}1f`,
                    color: id.accent,
                    boxShadow: `inset 0 0 0 1px ${id.accent}33`,
                  }}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fos-text">{m.name}</p>
                  <p className="truncate text-xs text-fos-muted">{m.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
