"use client";

// Bittensor/TAO-flavored "network" section: every model provider is presented
// as a subnet of the mesh. Hard-bordered data panels, mono numbers, intent-
// colored model chips — credibility through data, not glow.

import { motion } from "framer-motion";
import { PRESETS } from "@/lib/llm/providers";
import { INTENTS, type Intent } from "@/lib/brand/intent";

// Typical connect latency per subnet (ms) — illustrative, stable per provider.
const LATENCY: Record<string, number> = {
  openrouter: 1200,
  groq: 280,
  cerebras: 240,
  google: 900,
  deepinfra: 1500,
  anthropic: 1100,
};

const totalModels = PRESETS.reduce((n, p) => n + p.models.length, 0);
const freeCount = PRESETS.filter((p) => p.free).length;

const STATS = [
  { k: String(PRESETS.length), v: "subnets" },
  { k: String(totalModels), v: "models live" },
  { k: `${freeCount}/${PRESETS.length}`, v: "free tier" },
  { k: "∞", v: "fallback routes" },
];

export default function Subnets() {
  return (
    <section id="subnets" className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-navy/80">
          The Network
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-5xl">
          <span className="text-gradient">Every provider is a</span>{" "}
          <span className="text-gradient-emerald">subnet.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-center text-black/55">
          The router treats each platform as an interchangeable subnet of open
          models. Quota out on one, traffic fails over to the next — no lock-in,
          no downtime.
        </p>

        {/* network-at-a-glance — mono, hard-bordered */}
        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-4 overflow-hidden rounded-xl border border-black/10">
          {STATS.map((s, i) => (
            <div
              key={s.v}
              className={`px-3 py-4 text-center ${
                i > 0 ? "border-l border-black/10" : ""
              }`}
            >
              <p className="font-mono text-2xl font-bold text-neutral-900 sm:text-3xl">
                {s.k}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-black/40">
                {s.v}
              </p>
            </div>
          ))}
        </div>

        {/* subnet grid */}
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRESETS.map((p, i) => {
            const intents = Array.from(
              new Set(p.models.map((m) => m.intent as Intent)),
            );
            const latency = LATENCY[p.id] ?? 1000;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
                className="group rounded-xl border border-black/10 bg-black/[0.02] p-4 transition-colors hover:border-black/25 hover:bg-black/[0.04]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-navy/60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-navy" />
                    </span>
                    <span className="font-mono text-sm font-semibold text-neutral-900">
                      {p.name}
                    </span>
                  </div>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                      p.free
                        ? "bg-navy/10 text-navy"
                        : "bg-black/10 text-black/50"
                    }`}
                  >
                    {p.free ? "free" : "paid"}
                  </span>
                </div>

                {/* mono stat row */}
                <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-black/10 font-mono text-[11px]">
                  <div className="bg-black/[0.02] px-2.5 py-1.5">
                    <span className="text-black/40">models </span>
                    <span className="text-neutral-900">{p.models.length}</span>
                  </div>
                  <div className="border-l border-black/10 bg-black/[0.02] px-2.5 py-1.5">
                    <span className="text-black/40">~lat </span>
                    <span className="text-neutral-900">{latency}ms</span>
                  </div>
                </div>

                {/* intent coverage chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {intents.map((intent) => {
                    const it = INTENTS[intent];
                    return (
                      <span
                        key={intent}
                        className="inline-flex items-center gap-1.5 rounded border border-black/10 px-1.5 py-0.5 font-mono text-[10px] text-black/60"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: it.hex }}
                        />
                        {it.label}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
