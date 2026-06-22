"use client";

import { motion } from "framer-motion";
import { INTENTS, type Intent } from "@/lib/brand/intent";

// Each candidate model carries the intent it serves; its color comes from the
// shared intent palette. `selected` is the model this prompt routes to.
const MODELS: { name: string; intent: Intent; selected?: boolean }[] = [
  { name: "DeepSeek R1", intent: "reasoning", selected: true },
  { name: "Claude Opus", intent: "coding" },
  { name: "GPT-5", intent: "general" },
  { name: "Llama 4", intent: "general" },
  { name: "Flux / Veo", intent: "vision" },
];

export default function AIRouter() {
  return (
    <section id="router" className="relative px-6 py-28">
      <div className="mx-auto max-w-5xl">
        <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-navy/80">
          AI Router
        </p>
        <h2 className="heading-lift-gradient mx-auto mt-4 max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-5xl">
          <span className="text-gradient">One prompt routes to the</span>{" "}
          <span className="text-gradient-emerald">optimal model.</span>
        </h2>

        <div className="mt-16 grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
          {/* Left: source prompt */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl glass-strong p-5"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-black/40">
              Incoming
            </p>
            <p className="mt-3 font-mono text-sm text-ink">
              <span className="text-navy">{">"}</span> Analyze Q3
              commissions &amp; forecast Q4
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["reasoning", "finance", "tabular"].map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-black/10 bg-black/5 px-2.5 py-0.5 font-mono text-[11px] text-black/60"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Center: router core */}
          <div className="relative grid place-items-center py-6">
            <motion.div
              className="conic-glow absolute h-32 w-32 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative grid h-20 w-20 place-items-center rounded-2xl glass-strong shadow-glow">
              <motion.span
                className="font-mono text-xs font-bold text-gradient-emerald"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ROUTE
              </motion.span>
            </div>
          </div>

          {/* Right: model list with animated routing */}
          <div className="space-y-2.5">
            {MODELS.map((m, i) => {
              const it = INTENTS[m.intent];
              return (
                <motion.div
                  key={m.name}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`relative flex items-center justify-between overflow-hidden rounded-xl px-4 py-3 transition-colors ${
                    m.selected ? "glass-strong" : "glass"
                  }`}
                  style={
                    m.selected
                      ? { boxShadow: `inset 0 0 0 1px ${it.hex}, 0 0 28px -12px ${it.hex}` }
                      : undefined
                  }
                >
                  {/* left bar — solid for the routed model, pulsing for candidates */}
                  {m.selected ? (
                    <span
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ background: it.hex }}
                    />
                  ) : (
                    <motion.span
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ background: it.hex }}
                      animate={{ opacity: [0.15, 0.6, 0.15] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4 }}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: it.hex,
                        boxShadow: m.selected ? `0 0 10px ${it.hex}` : undefined,
                      }}
                    />
                    <span className="text-sm font-medium text-ink">{m.name}</span>
                  </div>
                  <span className="flex items-center gap-2">
                    {m.selected && (
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
                        style={{ background: `${it.hex}1f`, color: it.hex }}
                      >
                        routed
                      </span>
                    )}
                    <span className="font-mono text-[11px] uppercase tracking-wider text-black/40">
                      {it.label}
                    </span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-xl text-center text-sm text-black/45">
          The router scores latency, cost and capability per request — picking
          the best model so you never have to.
        </p>
      </div>
    </section>
  );
}
