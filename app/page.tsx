"use client";

/* ============================================================================
   NEX-ERA — Landing (V2 flagship refinement).
   ----------------------------------------------------------------------------
   Same visual identity + design language as V1 — elevated. The AI Core is the
   hero (text weight reduced); cursor-reactive floating system cards fill the
   space; the CTA is a memorable launch ritual that boots into the OS; an
   immersive "What You Can Do" module gallery tells the story; scroll is
   cinematic (parallax + scale + layered reveals).

   Motion budget (skill QA lens): transforms/opacity only (GPU), one primary
   CTA per view, staggered reveals, spring easing, full reduced-motion support.
   Landing page ONLY.
   ========================================================================== */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import "@/components/ds/tokens.css";
import { NexBadge, NexStatusDot } from "@/components/ds";
import { NexeraMark } from "@/components/Logo";
import CosmicBackground from "@/components/landing/CosmicBackground";
import AIPortal from "@/components/landing/AIPortal";

const EASE = [0.22, 1, 0.36, 1] as const;

/* shared pointer (−0.5..0.5 around viewport center) for parallax depth */
function usePointer() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  React.useEffect(() => {
    const on = (e: PointerEvent) => {
      x.set(e.clientX / window.innerWidth - 0.5);
      y.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [x, y]);
  return { x, y };
}

/* ---- floating system cards content ---- */
const SYSTEM_CARDS = [
  { label: "AI Models", value: "14 online", c: "#a855f7", pos: "left-[1%] top-[14%]", depth: 26 },
  { label: "Tools", value: "120+", c: "#22d3ee", pos: "right-[2%] top-[10%]", depth: 36 },
  { label: "Languages", value: "68", c: "#3b82f6", pos: "left-[3%] top-[54%]", depth: 30 },
  { label: "Investment Hub", value: "live", c: "#34f5a0", pos: "right-[1%] top-[44%]", depth: 22, signal: true },
  { label: "Cloud + Local AI", value: "hybrid", c: "#a855f7", pos: "left-[8%] bottom-[12%]", depth: 18 },
  { label: "Enterprise", value: "ready", c: "#3b82f6", pos: "right-[7%] bottom-[14%]", depth: 40 },
] as const;

const MODULES = [
  { k: "workspace", title: "AI Workspace", body: "Compose agents and ship software on a living canvas.", c: "#a855f7", icon: WorkspaceIcon, preview: "bars" },
  { k: "invest", title: "Investment Hub", body: "Model portfolios; agents rebalance on live market signal.", c: "#34f5a0", icon: InvestIcon, preview: "spark" },
  { k: "tutor", title: "Foreign Language Tutor", body: "An adaptive tutor across 68 languages, at your pace.", c: "#3b82f6", icon: TutorIcon, preview: "orbit" },
  { k: "research", title: "Research Center", body: "Synthesize sources; separate fact from inference.", c: "#22d3ee", icon: ResearchIcon, preview: "scan" },
  { k: "agents", title: "AI Agents", body: "Autonomous operators that plan and execute across subnets.", c: "#a855f7", icon: AgentsIcon, preview: "nodes" },
  { k: "automation", title: "Automation Studio", body: "Chain multi-step workflows with branching logic.", c: "#3b82f6", icon: AutomateIcon, preview: "bars" },
  { k: "media", title: "Media Studio", body: "Generate images, video and worlds from one intention.", c: "#22d3ee", icon: MediaIcon, preview: "spark" },
] as const;

const STATS = [
  { n: "20+", l: "Live models" },
  { n: "6", l: "Provider subnets" },
  { n: "99.9%", l: "Routed uptime" },
  { n: "∞", l: "Scale" },
];

const BOOT_STEPS = ["Establishing neural link", "Synchronizing subnets", "Loading modules", "Entering Nex-Era"];

export default function Home() {
  const router = useRouter();
  const ptr = usePointer();

  // ---- boot ritual (shared by both CTAs) ----
  const [booting, setBooting] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const reduce = React.useRef(false);
  React.useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const launch = React.useCallback(() => {
    if (booting) return;
    setBooting(true);
    const ms = reduce.current ? 90 : 480;
    let i = 0;
    const tick = () => {
      i += 1;
      setStep(i);
      if (i < BOOT_STEPS.length) window.setTimeout(tick, ms);
      else window.setTimeout(() => router.push("/login"), reduce.current ? 120 : 560);
    };
    window.setTimeout(tick, ms);
  }, [booting, router]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="nex nex-canvas relative min-h-screen overflow-x-hidden text-[var(--nex-text)] antialiased">
        <CosmicBackground />
        <TopNav />
        {/* main reacts to boot: subtle darken + zoom (camera push-in) */}
        <motion.main animate={booting ? { scale: 1.06, opacity: 0.35, filter: "blur(4px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: EASE }}>
          <Hero ptr={ptr} onLaunch={launch} booting={booting} />
          <ModulesStory ptr={ptr} />
          <NetworkBand />
          <LaunchCTA onLaunch={launch} />
        </motion.main>
        <Footer />
        <AnimatePresence>{booting && <BootOverlay step={step} />}</AnimatePresence>
      </div>
    </MotionConfig>
  );
}

/* ----------------------------------------------------------------- top nav */

function TopNav() {
  const links = ["Universe", "Modules", "Network"];
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-[var(--nex-radius-xl)] border border-[var(--nex-border)] bg-[var(--nex-glass-strong)] px-4 backdrop-blur-[var(--nex-blur-xl)] shadow-[var(--nex-shadow-md)]">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="Nex-Era home">
          <span className="transition-transform duration-500 group-hover:rotate-[18deg]">
            <NexeraMark size={26} />
          </span>
          <span className="nex-display text-[15px] font-semibold tracking-tight">NEX·ERA</span>
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} className="group relative rounded-[var(--nex-radius-md)] px-3.5 py-2 text-sm text-[var(--nex-text-muted)] transition-colors duration-200 hover:text-[var(--nex-text)]">
              {l}
              <span className="absolute inset-x-3.5 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-brand to-accent-soft transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden text-sm font-medium text-[var(--nex-text-muted)] transition-colors hover:text-[var(--nex-text)] sm:block">
            Sign in
          </Link>
          <Link href="/login" className="inline-flex h-9 items-center rounded-[var(--nex-radius-md)] border border-white/15 bg-brand px-4 text-sm font-semibold text-white shadow-[0_6px_22px_-8px_rgba(242,118,28,0.7)] transition-transform duration-300 hover:scale-[1.04] active:scale-95">
            Launch OS
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* --------------------------------------------------------------------- hero */

function Hero({ ptr, onLaunch, booting }: { ptr: { x: MotionValue<number>; y: MotionValue<number> }; onLaunch: () => void; booting: boolean }) {
  const ref = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const portalScale = useSpring(useTransform(scrollYProgress, [0, 1], [1, 1.45]), { stiffness: 80, damping: 24 });
  const portalOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const portalY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  // headline pointer parallax (gentle — text now sits behind the core in weight)
  const hx = useSpring(useTransform(ptr.x, [-0.5, 0.5], [-12, 12]), { stiffness: 60, damping: 18 });
  const hy = useSpring(useTransform(ptr.y, [-0.5, 0.5], [-8, 8]), { stiffness: 60, damping: 18 });

  const [portalSize, setPortalSize] = React.useState(540);
  React.useEffect(() => {
    const fit = () => setPortalSize(window.innerWidth < 640 ? 340 : window.innerWidth < 1024 ? 460 : 560);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <section ref={ref} id="universe" className="relative grid min-h-[100svh] place-items-center px-5">
      {/* AI Core — the hero. Larger, brighter, reacts to boot. */}
      <motion.div
        style={{ scale: portalScale, opacity: portalOpacity, y: portalY }}
        animate={booting ? { scale: 1.25 } : {}}
        transition={{ duration: 0.9, ease: EASE }}
        className="absolute inset-0 grid place-items-center"
      >
        <AIPortal size={portalSize} />
      </motion.div>

      {/* floating system cards (lg+; cursor-reactive, slow float) */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        {SYSTEM_CARDS.map((c, i) => (
          <SystemCard key={c.label} {...c} ptr={ptr} delay={0.7 + i * 0.12} />
        ))}
      </div>

      {/* headline + CTA — lighter weight so the Core leads */}
      <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <NexBadge tone="purple" dot className="mb-8 backdrop-blur-[var(--nex-blur-md)]">
            The AI Operating System
          </NexBadge>
        </motion.div>

        <motion.h1
          style={{ x: hx, y: hy }}
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.08 }}
          className="nex-display text-[clamp(2.5rem,7.5vw,5.5rem)] font-semibold leading-[1.0] tracking-[-0.03em]"
        >
          <span className="block text-[var(--nex-text)]/90 [text-shadow:0_0_36px_rgba(242,118,28,0.3)]">Enter the</span>
          <span className="nex-text-gradient block [filter:drop-shadow(0_4px_28px_rgba(242,118,28,0.4))]">AI Universe</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.22 }}
          className="mx-auto mt-6 max-w-md text-pretty text-[var(--nex-text-base)] leading-relaxed text-[var(--nex-text-muted)] sm:text-[var(--nex-text-lg)]"
        >
          Build, learn, invest, research, automate and create — every intelligence, one boundless interface.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.34 }} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <LaunchButton onLaunch={onLaunch} disabled={booting} />
          <a href="#modules" className="text-sm font-medium text-[var(--nex-text-muted)] transition-colors hover:text-[var(--nex-text)]">
            Explore the modules ↓
          </a>
        </motion.div>
      </motion.div>

      {/* scroll cue */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: booting ? 0 : 1 }} transition={{ delay: 1.1, duration: 1 }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <span className="grid h-9 w-5 place-items-start rounded-full border border-[var(--nex-border-strong)] p-1">
          <span className="h-1.5 w-1 rounded-full bg-[var(--nex-accent)] motion-safe:animate-[nex-float_1.6s_ease-in-out_infinite]" />
        </span>
      </motion.div>
    </section>
  );
}

/* The launch ritual button — hover: expand + glow + arrow slide + spark burst.
   Click: triggers the boot sequence (handled by parent). One primary CTA. */
function LaunchButton({ onLaunch, disabled }: { onLaunch: () => void; disabled?: boolean }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onLaunch}
      disabled={disabled}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      aria-label="Launch the Nex-Era operating system"
      className="group relative inline-flex min-h-[52px] touch-manipulation items-center disabled:opacity-70"
    >
      {/* rotating conic energy ring; intensifies on hover */}
      <span className={`absolute -inset-2 rounded-[var(--nex-radius-xl)] bg-[conic-gradient(from_0deg,#f2761c,#fb8c6a,#ffb866,#f2761c)] blur-md transition-all duration-500 motion-safe:animate-[nex-spin_6s_linear_infinite] ${hover ? "opacity-100 -inset-3" : "opacity-50"}`} />
      {/* particle burst on hover */}
      {hover &&
        [...Array(8)].map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0.9, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: Math.cos((i / 8) * Math.PI * 2) * 46, y: Math.sin((i / 8) * Math.PI * 2) * 30, scale: 0.2 }}
            transition={{ duration: 0.7, ease: "easeOut", repeat: Infinity, repeatDelay: 0.15 }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 rounded-full"
            style={{ background: ["#f2761c", "#fb8c6a", "#ffb866"][i % 3], boxShadow: "0 0 6px currentColor" }}
          />
        ))}
      <motion.span
        animate={{ scale: hover ? 1.04 : 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="relative inline-flex h-[52px] items-center gap-3 overflow-hidden rounded-[var(--nex-radius-xl)] border border-transparent bg-gradient-to-r from-brand to-accent-soft px-8 text-base font-semibold text-white shadow-[var(--nex-shadow-lg)]"
      >
        <span className="relative z-10 h-2 w-2 rounded-full bg-[var(--nex-success)] shadow-[0_0_10px_var(--nex-success)] motion-safe:animate-[nex-breathe_1.8s_ease-in-out_infinite]" />
        <span className="relative z-10">Launch Operating System</span>
        <svg className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14m0 0-6-6m6 6-6 6" />
        </svg>
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.4)_50%,transparent_70%)] transition-transform duration-700 group-hover:translate-x-full" />
      </motion.span>
    </button>
  );
}

/* floating system status card with pointer parallax + slow float */
function SystemCard({ label, value, c, pos, depth, signal, ptr, delay }: { label: string; value: string; c: string; pos: string; depth: number; signal?: boolean; ptr: { x: MotionValue<number>; y: MotionValue<number> }; delay: number }) {
  const tx = useSpring(useTransform(ptr.x, [-0.5, 0.5], [-depth, depth]), { stiffness: 50, damping: 20 });
  const ty = useSpring(useTransform(ptr.y, [-0.5, 0.5], [-depth * 0.6, depth * 0.6]), { stiffness: 50, damping: 20 });
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: EASE }}
      style={{ x: tx, y: ty }}
      className={`absolute ${pos}`}
    >
      <div className="w-40 rounded-[var(--nex-radius-lg)] border border-[var(--nex-border)] bg-[var(--nex-glass)] p-3 backdrop-blur-[var(--nex-blur-lg)] shadow-[var(--nex-shadow-md)] motion-safe:animate-[nex-float_7s_ease-in-out_infinite]" style={{ animationDelay: `${delay}s` }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--nex-text-faint)]">{label}</span>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
        </div>
        <div className="mt-1 text-sm font-medium text-[var(--nex-text)]">{value}</div>
        {signal && (
          <div className="mt-2 flex items-end gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="w-1 rounded-full motion-safe:animate-[nex-breathe_1.4s_ease-in-out_infinite]" style={{ height: `${5 + i * 3}px`, background: c, animationDelay: `${i * 0.12}s`, boxShadow: `0 0 6px ${c}` }} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* --------------------------------------------------- storytelling modules */

function ModulesStory({ ptr }: { ptr: { x: MotionValue<number>; y: MotionValue<number> } }) {
  return (
    <section id="modules" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-28 sm:py-36">
      <Reveal>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--nex-accent)]">What you can do</span>
          <h2 className="nex-display mt-3 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight">
            Seven worlds. <span className="nex-text-gradient">One intention.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[var(--nex-text-base)] text-[var(--nex-text-muted)] sm:text-[var(--nex-text-lg)]">
            Each module is a room in the operating system — enter any of them from the same prompt.
          </p>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m, i) => (
          <ModuleCard key={m.k} module={m} index={i} />
        ))}
        <Reveal delay={0.1}>
          <a href="/login" className="group flex h-full min-h-[220px] flex-col items-center justify-center rounded-[var(--nex-radius-xl)] border border-dashed border-[var(--nex-border-strong)] bg-[var(--nex-glass-faint)] p-6 text-center transition-colors hover:border-[var(--nex-border-glow)] hover:bg-[var(--nex-glass)]">
            <span className="nex-display text-[var(--nex-text-2xl)] font-semibold">Enter Nex-Era</span>
            <span className="mt-2 text-sm text-[var(--nex-text-muted)]">All seven worlds, one boot →</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function ModuleCard({ module, index }: { module: (typeof MODULES)[number]; index: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 150, damping: 18 });
  const sry = useSpring(ry, { stiffness: 150, damping: 18 });

  function move(e: React.PointerEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 10);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10);
  }
  function leave() {
    rx.set(0);
    ry.set(0);
  }

  const Icon = module.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: EASE, delay: (index % 3) * 0.08 }}
    >
      <motion.div
        ref={ref}
        onPointerMove={move}
        onPointerLeave={leave}
        style={{ rotateX: srx, rotateY: sry, transformPerspective: 900, transformStyle: "preserve-3d" }}
        className="group nex-ring relative h-full overflow-hidden rounded-[var(--nex-radius-xl)] border border-[var(--nex-border)] bg-[var(--nex-glass)] p-5 shadow-[var(--nex-shadow-md)] backdrop-blur-[var(--nex-blur-lg)] transition-[box-shadow,border-color] duration-300 hover:border-[var(--nex-border-glow)] hover:shadow-[var(--nex-shadow-float)]"
      >
        {/* animated preview */}
        <ModulePreview kind={module.preview} c={module.c} />

        <div className="mt-4 flex items-center gap-3" style={{ transform: "translateZ(30px)" }}>
          <span className="grid h-11 w-11 place-items-center rounded-[var(--nex-radius-md)] border transition-transform duration-500 group-hover:rotate-[10deg]" style={{ borderColor: `${module.c}55`, background: `color-mix(in srgb, ${module.c} 14%, transparent)`, color: module.c, boxShadow: `0 0 22px -8px ${module.c}` }}>
            <Icon />
          </span>
          <h3 className="nex-display text-[var(--nex-text-lg)] font-semibold">{module.title}</h3>
        </div>
        <p className="mt-2 text-[var(--nex-text-sm)] leading-relaxed text-[var(--nex-text-muted)]" style={{ transform: "translateZ(20px)" }}>
          {module.body}
        </p>
      </motion.div>
    </motion.div>
  );
}

/* lightweight animated preview scenes — CSS only, GPU transforms */
function ModulePreview({ kind, c }: { kind: string; c: string }) {
  return (
    <div className="relative h-24 overflow-hidden rounded-[var(--nex-radius-md)] border border-[var(--nex-border)] bg-[var(--nex-bg-sunken)]" style={{ transform: "translateZ(14px)" }}>
      <span className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(120px 60px at 30% 0%, ${c}22, transparent 70%)` }} />
      {/* moving light sweep */}
      <span className="absolute inset-0 opacity-40 [background:linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.18)_50%,transparent_60%)] [background-size:250%_100%] motion-safe:animate-[nex-shimmer_4s_linear_infinite]" />
      {kind === "bars" && (
        <div className="absolute inset-x-4 bottom-3 flex items-end gap-1.5">
          {[40, 70, 30, 90, 55, 75, 45].map((h, i) => (
            <span key={i} className="flex-1 rounded-sm motion-safe:animate-[nex-breathe_2.4s_ease-in-out_infinite]" style={{ height: `${h}%`, background: `linear-gradient(180deg, ${c}, transparent)`, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      )}
      {kind === "spark" && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 96" preserveAspectRatio="none">
          <polyline points="0,70 28,55 50,62 80,30 110,44 140,18 170,32 200,12" fill="none" stroke={c} strokeWidth="2" className="motion-safe:animate-[nex-breathe_3s_ease-in-out_infinite]" style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
        </svg>
      )}
      {kind === "orbit" && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 12px ${c}` }} />
          {[18, 30].map((r, i) => (
            <span key={i} className="absolute rounded-full border motion-safe:animate-[nex-spin_var(--d)_linear_infinite]" style={{ width: r * 2, height: r * 2, borderColor: `${c}40`, borderTopColor: c, ["--d" as string]: `${4 + i * 3}s` }} />
          ))}
        </div>
      )}
      {kind === "scan" && (
        <>
          <span className="absolute inset-x-0 h-10 motion-safe:animate-[nex-scan_2.6s_ease-in-out_infinite]" style={{ background: `linear-gradient(180deg, transparent, ${c}33, transparent)` }} />
          <div className="absolute inset-4 grid grid-cols-6 gap-1 opacity-50">
            {[...Array(18)].map((_, i) => (
              <span key={i} className="h-1 rounded-full" style={{ background: i % 3 === 0 ? c : "var(--nex-border-strong)" }} />
            ))}
          </div>
        </>
      )}
      {kind === "nodes" && (
        <svg className="absolute inset-0 h-full w-full opacity-80" viewBox="0 0 200 96">
          {[[40, 30], [100, 20], [160, 40], [70, 70], [140, 72]].map(([x, y], i) => (
            <g key={i}>
              {i < 4 && <line x1={x} y1={y} x2={[100, 160, 140, 140][i]} y2={[20, 40, 72, 72][i]} stroke={`${c}55`} strokeWidth="1" />}
              <circle cx={x} cy={y} r="3" fill={c} className="motion-safe:animate-[nex-breathe_2s_ease-in-out_infinite]" style={{ filter: `drop-shadow(0 0 5px ${c})`, animationDelay: `${i * 0.2}s` }} />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- network */

function NetworkBand() {
  return (
    <section id="network" className="relative mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
      <Reveal>
        <div className="overflow-hidden rounded-[var(--nex-radius-2xl)] border border-[var(--nex-border)] bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-lg)] shadow-[var(--nex-shadow-md)]">
          <div className="grid grid-cols-2 divide-x divide-y divide-[var(--nex-border)] sm:grid-cols-4 sm:divide-y-0">
            {STATS.map((s, i) => (
              <motion.div key={s.l} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }} className="p-8 text-center">
                <div className="nex-display nex-text-gradient text-[clamp(2.2rem,5vw,3.5rem)] font-bold leading-none">{s.n}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--nex-text-faint)]">{s.l}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* -------------------------------------------------------------- final cta */

function LaunchCTA({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section className="relative mx-auto max-w-5xl px-5 py-28 sm:py-36">
      <Reveal>
        <div className="relative overflow-hidden rounded-[var(--nex-radius-2xl)] border border-[var(--nex-border-strong)] bg-[var(--nex-glass-strong)] px-6 py-20 text-center backdrop-blur-[var(--nex-blur-xl)] shadow-[var(--nex-shadow-lg)]">
          <div className="pointer-events-none absolute left-1/2 top-[-30%] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.32),transparent_60%)] blur-[100px] motion-safe:animate-[nex-breathe_5s_ease-in-out_infinite]" />
          <NexStatusDot status="online" label="The network is live" />
          <h2 className="nex-display mx-auto mt-6 max-w-2xl text-[clamp(2.2rem,6vw,4rem)] font-semibold leading-[1.02]">
            Power on your <span className="nex-text-gradient">intelligence.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[var(--nex-text-base)] text-[var(--nex-text-muted)] sm:text-[var(--nex-text-lg)]">
            One boot. Every model, every task, one universe.
          </p>
          <div className="mt-10 flex justify-center">
            <LaunchButton onLaunch={onLaunch} />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* --------------------------------------------------------- boot overlay */

function BootOverlay({ step }: { step: number }) {
  const pct = Math.min(100, Math.round((step / BOOT_STEPS.length) * 100));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="fixed inset-0 z-[999] grid place-items-center bg-[rgba(251,248,244,0.88)] backdrop-blur-xl">
      <motion.div initial={{ scale: 0.7, opacity: 0.4 }} animate={{ scale: [0.7, 1, 2.6], opacity: [0.4, 1, 0] }} transition={{ duration: 2.6, ease: EASE, times: [0, 0.4, 1] }} className="pointer-events-none absolute inset-0 grid place-items-center">
        <AIPortal size={560} interactive={false} />
      </motion.div>
      <div className="relative z-10 w-full max-w-sm px-8 text-center">
        <div className="nex-display mb-8 text-[var(--nex-text-2xl)] font-bold">
          <span className="nex-text-gradient">Entering the universe</span>
        </div>
        <ul className="mb-8 space-y-2.5 text-left">
          {BOOT_STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step - 1;
            return (
              <li key={s} className="flex items-center gap-3 font-mono text-[13px]">
                <span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] transition-all duration-300 ${done ? "border-transparent bg-gradient-to-r from-brand to-accent-soft text-white shadow-[0_0_12px_rgba(242,118,28,0.7)]" : "border-[var(--nex-border)] text-[var(--nex-text-faint)]"}`}>
                  {done ? "✓" : i + 1}
                </span>
                <span className={done ? "text-[var(--nex-text)]" : active ? "text-[var(--nex-text-muted)]" : "text-[var(--nex-text-faint)]"}>
                  {s}
                  {active && <span className="ml-1 inline-block animate-[nex-blink_1s_step-end_infinite]">_</span>}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="h-1.5 w-full overflow-hidden rounded-full border border-[var(--nex-border)] bg-[var(--nex-glass-faint)]">
          <div className="h-full rounded-full bg-gradient-to-r from-brand to-accent-soft shadow-[0_0_16px_rgba(242,118,28,0.7)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--nex-text-faint)]">{pct}% · neural link</div>
      </div>
    </motion.div>
  );
}

/* --------------------------------------------------------------- footer */

function Footer() {
  return (
    <footer className="relative border-t border-[var(--nex-border)] py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <NexeraMark size={24} />
          <span className="nex-display text-sm font-semibold tracking-tight">NEX·ERA</span>
        </div>
        <p className="text-xs text-[var(--nex-text-faint)]">The AI Operating System · one interface, infinite worlds</p>
        <div className="flex items-center gap-5 text-sm text-[var(--nex-text-muted)]">
          <Link href="/login" className="transition-colors hover:text-[var(--nex-text)]">Sign in</Link>
          <a href="#modules" className="transition-colors hover:text-[var(--nex-text)]">Modules</a>
          <a href="#network" className="transition-colors hover:text-[var(--nex-text)]">Network</a>
        </div>
      </div>
    </footer>
  );
}

/* --------------------------------------------------------------- motion */

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------ inline module icons */
function WorkspaceIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18M8 18v3m8-3v3" /></svg>; }
function InvestIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-7" /><path d="M17 8h4v4" /></svg>; }
function TutorIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></svg>; }
function ResearchIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>; }
function AgentsIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="8" width="14" height="11" rx="2" /><path d="M12 8V4m-3 8h.01M15 12h.01" /></svg>; }
function AutomateIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h8l-1 8 10-12h-8z" /></svg>; }
function MediaIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 15-5-5L5 20" /></svg>; }
