"use client";

import { motion } from "framer-motion";
import MeshField from "./MeshField";
import ConnectWallet from "./web3/ConnectWallet";
import { Entropy } from "./ui/entropy";
import { MagneticButton } from "./ui/MagneticButton";
import { INTENT_ORDER, INTENTS } from "@/lib/brand/intent";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const item = {
  hidden: { y: 22, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: [0.21, 0.5, 0.27, 1] } },
};

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-28 text-center">
      {/* aurora — slow drifting brand gradient wash */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="aurora absolute left-1/2 top-1/4 h-[620px] w-[760px] -translate-x-1/2 rounded-full opacity-70 blur-[110px] [background:conic-gradient(from_0deg,rgba(59,130,246,0.20),rgba(139,92,246,0.20),rgba(6,182,212,0.18),rgba(59,130,246,0.20))]" />
      </div>

      {/* mesh network canvas */}
      <MeshField className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent_85%)]" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 flex max-w-4xl flex-col items-center"
      >
        <motion.div
          variants={item}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 font-mono text-xs tracking-wide text-muted shadow-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand pulse-dot" />
          DECENTRALIZED INTELLIGENCE NETWORK
        </motion.div>

        <motion.h1
          variants={item}
          className="heading-lift-gradient text-[3rem] font-bold leading-[1.02] tracking-tight sm:text-[5rem]"
        >
          <span className="block text-gradient">One Interface.</span>
          <span className="block text-gradient-emerald">Infinite Models.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-7 max-w-2xl text-balance text-lg leading-relaxed text-muted sm:text-xl"
        >
          Chat, code, research, generate media and automate workflows through
          decentralized intelligence — one interface routing every prompt across a
          network of open models, with no provider lock-in.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <MagneticButton
            href="/dashboard"
            className="shine group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-brand to-violet px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:shadow-md hover:shadow-brand/30 hover:brightness-105 sm:w-auto"
          >
            Enter NEXERA →
          </MagneticButton>
          <div className="w-full sm:w-auto [&_button]:w-full sm:[&_button]:w-auto [&_button]:justify-center [&_button]:px-6 [&_button]:py-3">
            <ConnectWallet />
          </div>
        </motion.div>

        {/* Intent legend — the color key. Every node, model and route on this
            page is tinted by the intent it serves; this is that map. */}
        <motion.div variants={item} className="mt-14 w-full max-w-2xl">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-black/35">
            color = routed intent
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {INTENT_ORDER.map((key) => {
              const it = INTENTS[key];
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3 py-1.5 font-mono text-[11px] text-black/70"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: it.hex,
                      boxShadow: `0 0 8px ${it.hex}`,
                    }}
                  />
                  {it.label}
                </span>
              );
            })}
          </div>
        </motion.div>

        {/* Entropy showcase — signal forming out of noise (21st.dev, brand-fitted) */}
        <motion.div variants={item} className="mt-14 w-full max-w-sm">
          <div className="relative overflow-hidden rounded-2xl border border-line bg-white/70 p-4 shadow-lift backdrop-blur-sm">
            <Entropy size={300} color="#3b82f6" className="mx-auto" />
            <div className="mt-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              <span>chaos</span>
              <span className="text-brand">order</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
