"use client";

import { motion } from "framer-motion";
import { INTENTS } from "@/lib/brand/intent";

// Finance OS routes to the reasoning intent — the whole section keys off it.
const it = INTENTS.reasoning;

const capabilities = [
  { title: "Forecasting", desc: "Driver-based projections updated as data lands." },
  { title: "Budgeting", desc: "Rolling budgets with scenario toggles." },
  { title: "Variance Analysis", desc: "Plan vs. actual, explained in plain English." },
  { title: "Commission Calculations", desc: "Tiered rules, clawbacks, accelerators." },
  { title: "KPI Dashboards", desc: "Live boards that build themselves from a prompt." },
];

// Simple sparkline bars for the visual
const bars = [40, 62, 48, 78, 70, 92, 84, 100];

export default function FinanceOS() {
  return (
    <section id="finance" className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: copy + capability list */}
          <div>
            <p
              className="font-mono text-xs uppercase tracking-[0.25em]"
              style={{ color: it.hex }}
            >
              Ledger · Reasoning
            </p>
            <h2 className="heading-lift-gradient mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              <span className="text-gradient">Your finance team,</span>{" "}
              <span className="text-gradient-emerald">on autopilot.</span>
            </h2>
            <p className="mt-5 max-w-md text-black/55">
              Point NEXERA at your spreadsheets and warehouses. It models, reconciles
              and reports — at the speed of a question.
            </p>

            <div className="mt-8 space-y-2">
              {capabilities.map((c, i) => (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.07 }}
                  className="flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-black/10 hover:bg-black/[0.03]"
                >
                  <span
                    className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-md"
                    style={{ background: `rgba(${it.rgb},0.12)`, color: it.hex }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 6 9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{c.title}</p>
                    <p className="text-sm text-black/45">{c.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: mock dashboard card */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="relative rounded-2xl glass-strong p-6 shadow-lift"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-black/40">
                  Q4 Forecast
                </p>
                <p className="mt-1 text-2xl font-semibold text-ink">
                  $4.82M
                </p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 font-mono text-xs"
                style={{ background: `rgba(${it.rgb},0.12)`, color: it.hex }}
              >
                ▲ 18.4%
              </span>
            </div>

            {/* animated bar chart */}
            <div className="mt-6 flex h-40 items-end gap-2.5">
              {bars.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                  className="flex-1 rounded-md"
                  style={{
                    background:
                      i === bars.length - 1
                        ? `linear-gradient(180deg, ${it.hex}, rgba(${it.rgb},0.5))`
                        : "rgba(94,157,255,0.35)",
                  }}
                />
              ))}
            </div>

            {/* footer stats */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { k: "Variance", v: "+2.1%" },
                { k: "Commissions", v: "$612K" },
                { k: "Margin", v: "41.8%" },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2.5"
                >
                  <p className="font-mono text-[11px] uppercase tracking-wider text-black/40">
                    {s.k}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink">{s.v}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
