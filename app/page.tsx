"use client";

// NEXERA — landing page. Dark "intelligence network" redesign: deep obsidian
// canvas, electric blue→violet accent, glass panels, restrained motion.
// Self-contained (own nav + sections); respects prefers-reduced-motion.

import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";
import { NexeraMark } from "@/components/Logo";
import OrbitCore from "@/components/landing/OrbitCore";
import TiltCard from "@/components/landing/TiltCard";

const PROVIDERS = ["OpenRouter", "Groq", "Cerebras", "Google AI", "ZenMux", "Anthropic"];

const NAV = [
  { label: "Capabilities", href: "#capabilities" },
  { label: "Routing", href: "#routing" },
  { label: "Network", href: "#network" },
  { label: "Finance OS", href: "#finance" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-hidden bg-obsidian text-white antialiased">
        <Backdrop />
        <NavBar />
        <main>
          <Hero />
          <Marquee />
          <Capabilities />
          <Routing />
          <Network />
          <FinanceTeaser />
          <CTA />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}

/* ---------------------------------------------------------------- backdrop */

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* technical grid, faded toward edges */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent_80%)]" />
      {/* two signal glows */}
      <div className="absolute left-1/2 top-[-18%] h-[640px] w-[920px] -translate-x-1/2 rounded-full bg-brand/20 blur-[160px]" />
      <div className="absolute right-[-10%] top-[30%] h-[520px] w-[620px] rounded-full bg-violet/15 blur-[150px]" />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(5,6,10,0.9))]" />
    </div>
  );
}

/* --------------------------------------------------------------------- nav */

function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-obsidian/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="NEXERA home">
          <NexeraMark size={30} />
          <span className="font-display text-[17px] font-semibold tracking-tight">NEXERA</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              {n.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-white/70 transition-colors hover:text-white sm:block"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="group relative rounded-lg bg-white px-4 py-2 text-sm font-semibold text-obsidian transition-transform hover:scale-[1.03] active:scale-95"
          >
            Enter NEXERA
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-16 pt-16 sm:pt-24 lg:grid-cols-2 lg:gap-6">
      <div className="text-center lg:text-left">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/70"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-glow opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-glow" />
          </span>
          Decentralized intelligence network
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl"
        >
          One interface.
          <br />
          <span className="bg-gradient-to-r from-ice via-brand to-violet bg-clip-text text-transparent">
            Infinite models.
          </span>
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/55 sm:text-lg lg:mx-0"
        >
          Chat, code, research, generate media and automate workflows — one prompt
          routed across a live network of open models, with no provider lock-in.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
        >
          <Link
            href="/login"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-violet px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
          >
            Enter NEXERA
            <ArrowIcon />
          </Link>
          <a
            href="#capabilities"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/25 hover:text-white sm:w-auto"
          >
            See capabilities
          </a>
        </motion.div>
      </div>

      {/* 3D animated intelligence core */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.21, 0.5, 0.27, 1] }}
        className="relative"
      >
        <OrbitCore />
      </motion.div>
    </section>
  );
}

/* ---------------------------------------------------------------- marquee */

function Marquee() {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.015] py-6">
      <div className="mx-auto max-w-6xl px-5">
        <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">
          Routing across the open-model network
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {PROVIDERS.map((p) => (
            <span key={p} className="font-display text-base font-semibold text-white/45">
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- capabilities */

const CAPS = [
  { k: "coding", title: "Code", body: "Plan, write, review and ship code with a senior-engineer agent that reasons across files.", icon: CodeIcon, span: "md:col-span-2" },
  { k: "general", title: "Chat", body: "One conversation, every model — auto-routed to the best fit for each turn.", icon: ChatIcon, span: "" },
  { k: "research", title: "Research", body: "Synthesize sources, separate fact from inference, never fabricate citations.", icon: SearchIcon, span: "" },
  { k: "reasoning", title: "Automate", body: "Compose multi-step workflows that run across specialized model subnets.", icon: BoltIcon, span: "md:col-span-2" },
] as const;

function Capabilities() {
  return (
    <Section id="capabilities" eyebrow="Capabilities" title="Build, analyze and automate" sub="Specialized workspaces, one surface.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {CAPS.map((c, i) => {
          const hex = INTENT[c.k];
          return (
            <motion.div
              key={c.k}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className={c.span}
            >
              <TiltCard className="group h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 transition-colors hover:border-white/15">
                <div
                  className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-3xl transition-opacity group-hover:opacity-50"
                  style={{ background: hex }}
                />
                <div
                  className="mb-4 grid h-11 w-11 place-items-center rounded-xl border"
                  style={{ borderColor: hex, background: `color-mix(in srgb, ${hex} 12%, transparent)`, color: hex }}
                >
                  <c.icon />
                </div>
                <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/55">{c.body}</p>
              </TiltCard>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- routing */

const ROUTES = [
  { k: "coding", label: "Refactor this module", model: "Qwen3 Coder" },
  { k: "research", label: "Summarize these papers", model: "Llama 3.3 70B" },
  { k: "reasoning", label: "Plan a 3-step workflow", model: "DeepSeek R1" },
];

function Routing() {
  return (
    <Section id="routing" eyebrow="Routing" title="One prompt, the optimal model" sub="NEXERA classifies intent and routes each request to the model that scores best for the task.">
      <div className="mx-auto max-w-2xl space-y-3">
        {ROUTES.map((r, i) => (
          <motion.div
            key={r.k}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5 sm:gap-4"
          >
            <span className="flex-1 truncate text-sm text-white/75">{r.label}</span>
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none" className="flex-none text-white/30">
              <path d="M1 7h18m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span
              className="flex flex-none items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: `color-mix(in srgb, ${INTENT[r.k]} 14%, transparent)`, color: INTENT[r.k] }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: INTENT[r.k] }} />
              {r.model}
            </span>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- network */

const STATS = [
  { n: "20+", l: "Live models" },
  { n: "6", l: "Providers" },
  { n: "99.9%", l: "Routed uptime" },
  { n: "∞", l: "Scale" },
];

function Network() {
  return (
    <Section id="network" eyebrow="The network" title="Every provider is a subnet" sub="An interchangeable mesh of open models — capacity routes around any single failure.">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.l} className="bg-obsidian p-7 text-center">
            <div className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">{s.n}</div>
            <div className="mt-1.5 text-xs uppercase tracking-wider text-white/45">{s.l}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- finance */

function FinanceTeaser() {
  return (
    <Section id="finance" eyebrow="Finance OS" title="Your finance team, on autopilot" sub="From spreadsheets to reconciled reports — commissions, forecasts, margins and variance at the speed of a question.">
      <div className="grid gap-3 sm:grid-cols-3">
        {["Commission engine", "Forecast studio", "Margin & variance"].map((t, i) => (
          <motion.div
            key={t}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-6"
          >
            <div className="font-display text-base font-semibold text-white">{t}</div>
            <div className="mt-4 h-20 rounded-lg bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(139,92,246,0.06))] ring-1 ring-inset ring-white/[0.06]" />
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ cta */

function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.01] px-6 py-16 text-center">
        <div className="absolute left-1/2 top-0 h-64 w-[680px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
        <h2 className="relative font-display text-3xl font-bold tracking-tight sm:text-5xl">
          Run your work on{" "}
          <span className="bg-gradient-to-r from-ice to-violet bg-clip-text text-transparent">
            autonomous intelligence
          </span>
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-white/55">
          One interface for every model and every task. Start free.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-obsidian transition-transform hover:scale-[1.03] active:scale-95 sm:w-auto"
          >
            Enter NEXERA
            <ArrowIcon />
          </Link>
          <a
            href="#capabilities"
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 px-6 py-3.5 text-sm font-semibold text-white/80 transition-colors hover:text-white sm:w-auto"
          >
            Talk to sales
          </a>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- footer */

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <NexeraMark size={26} />
          <span className="font-display text-sm font-semibold tracking-tight">NEXERA</span>
        </div>
        <p className="text-xs text-white/40">
          Decentralized AI · one interface, infinite models
        </p>
        <div className="flex items-center gap-5 text-sm text-white/55">
          <Link href="/login" className="transition-colors hover:text-white">Sign in</Link>
          <a href="#capabilities" className="transition-colors hover:text-white">Capabilities</a>
          <a href="#network" className="transition-colors hover:text-white">Network</a>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------- helpers */

const INTENT: Record<string, string> = {
  reasoning: "#8b5cf6",
  coding: "#3b82f6",
  general: "#06b6d4",
  research: "#f59e0b",
  vision: "#ec4899",
};

function Section({
  id,
  eyebrow,
  title,
  sub,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="mb-10 max-w-2xl"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</span>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        {sub && <p className="mt-3 text-base leading-relaxed text-white/55">{sub}</p>}
      </motion.div>
      {children}
    </section>
  );
}

/* ----- inline icons (no emoji, single stroke language) ----- */

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14m0 0-6-6m6 6-6 6" />
    </svg>
  );
}
function CodeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m8 6-6 6 6 6m8-12 6 6-6 6" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 2 3 14h8l-1 8 10-12h-8z" />
    </svg>
  );
}
