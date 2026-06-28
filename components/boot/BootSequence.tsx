"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import "@/components/ds/tokens.css";
import AIPortal from "@/components/landing/AIPortal";
import NeuralTunnel from "./NeuralTunnel";

/**
 * BootSequence — the cinematic moment of entering the Nex-Era OS.
 *
 * Phases (camera narrative, not a loading bar):
 *   expand  → the AI Core swells, glow blooms, camera pushes in
 *   warp    → camera enters the core; space stretches; neural tunnel rushes
 *   logs    → the OS reports itself online (timed boot log, exact script)
 *   welcome → "Welcome back. NEX is online."
 *   done    → onComplete() — caller reveals the dashboard assembling
 *
 * GPU only (transform/opacity), Framer-driven, no canvas libraries / Lottie /
 * video. Reusable + accessible: aria-live status, Esc / Skip escape-route,
 * full prefers-reduced-motion fast path (collapses to a brief, calm welcome).
 *
 * Reusable: <BootSequence onComplete={...} /> anywhere an OS-entry is needed.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

type Block = {
  id: string;
  title: string;
  color?: string;
  items?: string[];
  status?: string;
};

const MODELS = ["Claude", "GPT", "Gemini", "Qwen", "DeepSeek"];
const AGENTS = ["Research", "Developer", "Investment", "Language", "Media", "Automation"];

export default function BootSequence({ onComplete }: { onComplete: () => void }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = React.useState<"expand" | "warp" | "logs" | "welcome" | "done">("expand");
  const [blocks, setBlocks] = React.useState<Block[]>([]);
  const [live, setLive] = React.useState("Initializing Nex Core");
  const done = React.useRef(false);

  const finish = React.useCallback(() => {
    if (done.current) return;
    done.current = true;
    onComplete();
  }, [onComplete]);

  React.useEffect(() => {
    const k = reduce ? 0.26 : 1; // reduced motion → compress timeline
    const push = (b: Block, announce?: string) => {
      setBlocks((prev) => [...prev, b]);
      if (announce) setLive(announce);
    };
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms * k));

    at(500, () => setPhase("warp"));
    at(1200, () => {
      setPhase("logs");
      push({ id: "core", title: "INITIALIZING NEX CORE", color: "#a855f7", status: "Loading Neural Engine" }, "Initializing Nex Core. Loading neural engine.");
    });
    at(1800, () => push({ id: "mem", title: "CONNECTING MEMORY", color: "#3b82f6", status: "Memory Synced" }, "Connecting memory. Memory synced."));
    at(2200, () => push({ id: "models", title: "CONNECTING AI MODELS", color: "#22d3ee", items: MODELS, status: "Connected" }, "Connecting AI models. Connected."));
    at(2800, () => push({ id: "agents", title: "ACTIVATING AI AGENTS", color: "#a855f7", items: AGENTS, status: "Online" }, "Activating AI agents."));
    at(3500, () => push({ id: "ws", title: "PREPARING WORKSPACE", color: "#3b82f6", status: "Loading Dashboard" }, "Preparing workspace. Loading dashboard."));
    at(4000, () => {
      setPhase("welcome");
      setLive("Welcome back. NEX is online.");
    });
    at(4900, finish);

    return () => timers.forEach(clearTimeout);
  }, [reduce, finish]);

  // Esc / Skip → jump straight to the OS.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  const showTunnel = phase === "warp" || phase === "logs" || phase === "welcome";

  return (
    <motion.div
      className="nex fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-[#03040c] text-[var(--nex-text)]"
      role="dialog"
      aria-label="Entering Nex-Era"
      aria-busy="true"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {/* deep-space base */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(120%_100%_at_50%_30%,#0a0d22,#05060f_55%,#03040c)]" />

      {/* neural tunnel — appears as the camera enters the core */}
      <AnimatePresence>
        {showTunnel && (
          <motion.div
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="absolute inset-0"
          >
            <NeuralTunnel speed={phase === "warp" ? 1.7 : 1} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Core — expands, then the camera flies through it (scale past, fade) */}
      <AnimatePresence>
        {(phase === "expand" || phase === "warp") && (
          <motion.div
            className="pointer-events-none absolute"
            initial={{ scale: 0.7, opacity: 0.6, filter: "blur(0px)" }}
            animate={phase === "warp" ? { scale: 4.6, opacity: 0, filter: "blur(6px)" } : { scale: 1.15, opacity: 1 }}
            transition={{ duration: phase === "warp" ? 0.9 : 0.6, ease: EASE }}
          >
            <AIPortal size={reduce ? 360 : 520} interactive={false} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* warp flash as we cross the threshold */}
      <AnimatePresence>
        {phase === "warp" && (
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* ---- boot log console ---- */}
      <AnimatePresence>
        {phase === "logs" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative z-10 w-full max-w-md px-7"
          >
            <div className="mb-5 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--nex-text-faint)]">
              <span className="h-2 w-2 rounded-full bg-[var(--nex-accent)] motion-safe:animate-[nex-breathe_1.4s_ease-in-out_infinite]" />
              Nex-Era · boot
            </div>
            <ul className="space-y-3">
              {blocks.map((b) => (
                <BootLine key={b.id} block={b} />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- welcome ---- */}
      <AnimatePresence>
        {phase === "welcome" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative z-10 text-center"
          >
            <div className="grid place-items-center">
              <span className="mb-7 inline-grid h-16 w-16 place-items-center rounded-full bg-[var(--nex-glass)] shadow-[0_0_50px_-6px_rgba(168,85,247,0.8)] motion-safe:animate-[nex-breathe_2.4s_ease-in-out_infinite]">
                <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--nex-accent-3)]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.5-6.5-2 2m-7 7-2 2m11 0-2-2m-7-7-2-2" /></svg>
              </span>
            </div>
            <h2 className="nex-display text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-tight">Welcome back.</h2>
            <p className="nex-text-gradient nex-display mt-1 text-[clamp(1.4rem,4vw,2.2rem)] font-semibold">NEX is online.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* skip — escape-route + a11y. Not a primary control; quiet. */}
      <button
        onClick={finish}
        className="absolute bottom-6 right-6 z-20 rounded-[var(--nex-radius-md)] border border-[var(--nex-border)] bg-[var(--nex-glass)] px-3.5 py-2 text-xs font-medium text-[var(--nex-text-muted)] backdrop-blur-[var(--nex-blur-md)] transition-colors hover:text-[var(--nex-text)] focus-visible:outline-none"
      >
        Skip intro
      </button>

      {/* screen-reader narration */}
      <p className="sr-only" role="status" aria-live="polite">{live}</p>
    </motion.div>
  );
}

/* a single boot-log block — header + status, plus staggered chips */
function BootLine({ block }: { block: Block }) {
  return (
    <motion.li initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: EASE }} className="font-mono">
      <div className="flex items-center gap-2.5 text-[13px]">
        <span className="grid h-4 w-4 place-items-center">
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: block.color }}
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        </span>
        <span className="font-semibold tracking-wide" style={{ color: block.color }}>{block.title}</span>
      </div>

      {block.items && (
        <div className="ml-6 mt-2 flex flex-wrap gap-1.5">
          {block.items.map((it, i) => (
            <motion.span
              key={it}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 + i * 0.08, duration: 0.3, ease: EASE }}
              className="rounded-full border px-2.5 py-0.5 text-[11px]"
              style={{ borderColor: `${block.color}55`, background: `color-mix(in srgb, ${block.color} 12%, transparent)`, color: block.color }}
            >
              {it}
            </motion.span>
          ))}
        </div>
      )}

      {block.status && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: block.items ? 0.12 + block.items.length * 0.08 + 0.1 : 0.25 }}
          className="ml-6 mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--nex-success)]"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
          {block.status}
        </motion.div>
      )}
    </motion.li>
  );
}
