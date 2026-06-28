"use client";

/* Premium global FX — mounted once in the dashboard Chrome so the whole OS feels
   alive without redesigning any page. All effects gate on prefers-reduced-motion
   and use transform/opacity only (60fps). */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const h = () => setR(m.matches);
    m.addEventListener?.("change", h);
    return () => m.removeEventListener?.("change", h);
  }, []);
  return r;
}

/** Soft bloom that trails the pointer. Skipped on touch / reduced-motion. */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        ref.current?.style.setProperty("--mx", `${e.clientX}px`);
        ref.current?.style.setProperty("--my", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, [reduced]);
  if (reduced) return null;
  return <div ref={ref} className="fx-cursor-glow" aria-hidden />;
}

/** A few slow drifting orbs behind everything — ambient depth. */
export function AmbientField() {
  const reduced = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="fx-orb h-[420px] w-[420px] bg-brand/[0.07]" style={{ left: "8%", top: "-6%", animation: reduced ? undefined : "fx-drift-a 22s ease-in-out infinite" }} />
      <div className="fx-orb h-[380px] w-[380px] bg-violet/[0.07]" style={{ right: "4%", top: "30%", animation: reduced ? undefined : "fx-drift-b 28s ease-in-out infinite" }} />
      <div className="fx-orb h-[320px] w-[320px] bg-ice/[0.05]" style={{ left: "40%", bottom: "-8%", animation: reduced ? undefined : "fx-drift-a 26s ease-in-out infinite" }} />
    </div>
  );
}

/** Fade + lift page transition keyed on the route. */
export function PageTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className="h-full">{children}</div>;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        initial={{ opacity: 0, y: 10, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.997 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Count a number upward when it enters / changes. Instant under reduced-motion. */
export function CountUp({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduced) { setN(value); return; }
    const start = performance.now();
    const a = from.current, b = value, dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(a + (b - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return <span className={className}>{n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}
