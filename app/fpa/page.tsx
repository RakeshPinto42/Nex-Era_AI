"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GROUPS, modulesByGroup } from "@/lib/fpa/modules";

export default function FpaHome() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          FP&amp;A Tools
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-black/50">
          Real tools that compute on your own data — variance, commissions, forecasting and
          margin. Everything runs locally in your browser; your numbers never leave this device.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/25 bg-emerald-600/[0.06] px-3 py-1 text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> 4 live tools
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-black/45">
          more coming soon
        </span>
      </div>

      <div className="space-y-6">
        {GROUPS.map((g) => (
          <div key={g.key}>
            <p className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-black/35">
              {g.label}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modulesByGroup(g.key).map((m, i) => {
                const live = Boolean(m.tool);
                return (
                  <motion.div
                    key={m.slug}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: (i % 3) * 0.05 }}
                  >
                    <Link
                      href={`/fpa/${m.slug}`}
                      className={`group flex h-full flex-col rounded-2xl border p-4 transition-colors ${
                        live
                          ? "border-black/10 bg-white hover:border-navy/30 hover:bg-navy/[0.02]"
                          : "border-dashed border-black/15 bg-black/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">
                          {m.name}
                        </span>
                        {live ? (
                          <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-700">
                            Live
                          </span>
                        ) : (
                          <span className="rounded-full bg-black/[0.06] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-black/40">
                            Soon
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-black/50">
                        {m.blurb}
                      </p>
                      {live && (
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-navy">
                          Open tool
                          <span className="transition-transform group-hover:translate-x-0.5">→</span>
                        </span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
