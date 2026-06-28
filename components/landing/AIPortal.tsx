"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/**
 * AIPortal — the living AI Core. The centerpiece of Nex-Era.
 *
 * Composited depth layers (back → front):
 *   1. Volumetric light   — stacked radial blooms, soft god-ray feel.
 *   2. Energy rings        — independently-rotating CSS rings + conic halo.
 *   3. Particle field      — canvas: orbiting particles, drifting sparks,
 *                            pulsing neural links, pointer attraction + ripple.
 *   4. Plasma core         — breathing nucleus with holographic shimmer.
 *   5. Satellites          — DOM bodies orbiting on the front plane.
 *
 * The whole core tilts toward the pointer (3D) and particles lean toward it
 * (attraction), so it reads as a physical, alive aperture — never static.
 *
 * Performance: ONE internal rAF drives the particle canvas (DPR-capped, modest
 * counts → 60fps). Rings/glow are pure CSS transforms (GPU). Under
 * prefers-reduced-motion everything freezes to a single calm frame, no rAF,
 * no pointer reactivity. `interactive={false}` also disables pointer work
 * (used by the boot overlay where the core just flies at the camera).
 */

const NEON = ["#f2761c", "#fb8c6a", "#ffb866"] as const;

export default function AIPortal({ size = 460, interactive = true }: { size?: number; interactive?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduce = React.useRef(false);
  // Pointer position in canvas space, shared with the rAF loop via ref.
  const pointerRef = React.useRef({ x: -999, y: -999, active: false });

  // 3D tilt toward pointer
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 110, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 110, damping: 18 });

  React.useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // ---------------------------- particle canvas ----------------------------
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const stop = reduce.current;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const S = size;
    canvas.width = S * dpr;
    canvas.height = S * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = S / 2;
    const cy = S / 2;
    const coreR = S * 0.17;

    type P = { ang: number; rad: number; spd: number; sz: number; hue: number; z: number };
    const orbiters: P[] = Array.from({ length: Math.round(S / 16) }, () => {
      const z = Math.random();
      return {
        ang: Math.random() * Math.PI * 2,
        rad: coreR * 1.25 + Math.random() * (S * 0.32),
        spd: (0.0016 + Math.random() * 0.004) * (Math.random() < 0.4 ? -1 : 1),
        sz: 0.6 + z * 2.1,
        hue: Math.floor(Math.random() * 3),
        z,
      };
    });
    type Spark = { x: number; y: number; vx: number; vy: number; life: number; hue: number };
    let sparks: Spark[] = [];
    type Ripple = { x: number; y: number; r: number; life: number };
    let ripples: Ripple[] = [];

    let raf = 0;
    let last = performance.now();

    function frame(t: number) {
      const dt = Math.min(40, t - last);
      last = t;
      ctx!.clearRect(0, 0, S, S);
      ctx!.globalCompositeOperation = "lighter";

      const ptr = pointerRef.current;
      const pull = interactive && ptr.active;

      // compute screen positions of orbiters (for neural links)
      const pts: { x: number; y: number; hue: number; sz: number; z: number }[] = [];
      for (const p of orbiters) {
        if (!stop) p.ang += p.spd * dt;
        let px = cx + Math.cos(p.ang) * p.rad;
        let py = cy + Math.sin(p.ang) * p.rad;
        if (pull) {
          // slight attraction toward the pointer
          const dx = ptr.x - px;
          const dy = ptr.y - py;
          const d2 = dx * dx + dy * dy;
          const f = Math.min(0.12, 900 / (d2 + 600));
          px += dx * f;
          py += dy * f;
        }
        pts.push({ x: px, y: py, hue: p.hue, sz: p.sz, z: p.z });
        const a = 0.35 + p.z * 0.5;
        ctx!.beginPath();
        ctx!.fillStyle = NEON[p.hue];
        ctx!.globalAlpha = a;
        ctx!.arc(px, py, p.sz, 0, Math.PI * 2);
        ctx!.fill();
      }

      // neural links — faint pulsing lines between near particles
      const TH = S * 0.12;
      ctx!.lineWidth = 0.6;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < TH) {
            const pulse = 0.5 + 0.5 * Math.sin(t * 0.002 + i);
            ctx!.globalAlpha = (1 - d / TH) * 0.18 * pulse;
            ctx!.strokeStyle = NEON[pts[i].hue];
            ctx!.beginPath();
            ctx!.moveTo(pts[i].x, pts[i].y);
            ctx!.lineTo(pts[j].x, pts[j].y);
            ctx!.stroke();
          }
        }
      }

      // emit + draw sparks from the core (floating energy sparks)
      if (!stop && Math.random() < 0.4) {
        const ang = Math.random() * Math.PI * 2;
        sparks.push({ x: cx + Math.cos(ang) * coreR, y: cy + Math.sin(ang) * coreR, vx: Math.cos(ang) * (0.4 + Math.random()), vy: Math.sin(ang) * (0.4 + Math.random()), life: 1, hue: Math.floor(Math.random() * 3) });
      }
      sparks = sparks.filter((s) => s.life > 0);
      for (const s of sparks) {
        if (!stop) { s.x += s.vx; s.y += s.vy; s.life -= 0.012; }
        ctx!.globalAlpha = Math.max(0, s.life) * 0.8;
        ctx!.fillStyle = NEON[s.hue];
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, 1.4 * s.life + 0.3, 0, Math.PI * 2);
        ctx!.fill();
      }

      // pointer ripples
      ripples = ripples.filter((r) => r.life > 0);
      for (const r of ripples) {
        r.r += dt * 0.18;
        r.life -= 0.02;
        ctx!.globalAlpha = Math.max(0, r.life) * 0.5;
        ctx!.lineWidth = 1.2;
        ctx!.strokeStyle = "#f2761c";
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx!.stroke();
      }

      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
      if (!stop) raf = requestAnimationFrame(frame);
    }

    // expose ripple spawner
    (canvas as any).__ripple = (x: number, y: number) => ripples.push({ x, y, r: coreR * 0.4, life: 1 });

    frame(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [size, interactive]);

  // ---------------------------- pointer handlers ----------------------------
  function onMove(e: React.PointerEvent) {
    if (!interactive || reduce.current) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    mx.set(nx);
    my.set(ny);
    pointerRef.current = { x: (e.clientX - r.left) * (size / r.width), y: (e.clientY - r.top) * (size / r.height), active: true };
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
    pointerRef.current.active = false;
  }
  function onClick(e: React.PointerEvent) {
    const r = ref.current?.getBoundingClientRect();
    const c = canvasRef.current as any;
    if (r && c?.__ripple) c.__ripple((e.clientX - r.left) * (size / r.width), (e.clientY - r.top) * (size / r.height));
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onClick}
      className="relative grid place-items-center"
      style={{ width: size, height: size, perspective: 1200 }}
    >
      {/* 1 — volumetric light blooms (layered depth, soft) */}
      <div className="pointer-events-none absolute inset-[-22%] rounded-full opacity-70 blur-[60px] [background:radial-gradient(circle,rgba(255,196,140,0.30),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-[-6%] rounded-full opacity-80 blur-3xl motion-safe:animate-[nex-breathe_4.6s_ease-in-out_infinite] [background:radial-gradient(circle,rgba(242,118,28,0.30),rgba(255,184,102,0.12)_55%,transparent_72%)]" />

      {/* 2a — conic halo */}
      <div
        className="pointer-events-none absolute inset-[-12%] rounded-full opacity-70 blur-2xl motion-safe:animate-[nex-spin_20s_linear_infinite]"
        style={{ background: "conic-gradient(from 0deg, transparent, rgba(242,118,28,0.6), rgba(251,140,106,0.55), rgba(255,184,102,0.6), transparent)" }}
      />

      <motion.div className="relative grid h-full w-full place-items-center" style={{ rotateX: interactive ? rx : 0, rotateY: interactive ? ry : 0, transformStyle: "preserve-3d" }}>
        {/* 2b — independent energy rings */}
        {[
          { s: 1.0, dur: 28, dir: 1, c: "rgba(242,118,28,0.9)", z: 0 },
          { s: 0.82, dur: 19, dir: -1, c: "rgba(251,140,106,0.9)", z: 26 },
          { s: 0.64, dur: 12, dir: 1, c: "rgba(255,184,102,0.95)", z: 52 },
        ].map((r, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full border motion-safe:animate-[nex-spin_var(--d)_linear_infinite]"
            style={{
              width: `${r.s * 100}%`,
              height: `${r.s * 100}%`,
              ["--d" as string]: `${r.dur}s`,
              animationDirection: r.dir < 0 ? "reverse" : "normal",
              borderColor: "rgba(255,255,255,0.06)",
              borderTopColor: r.c,
              borderRightColor: r.c.replace("0.9", "0.25").replace("0.95", "0.25"),
              boxShadow: `0 0 40px -6px ${r.c}`,
              transform: `translateZ(${r.z}px)`,
            }}
          />
        ))}

        {/* 2c — holographic distortion ring (hue-cycling conic, additive) */}
        <div
          className="pointer-events-none absolute rounded-full opacity-40 mix-blend-screen motion-safe:animate-[nex-spin_9s_linear_infinite]"
          style={{ width: "56%", height: "56%", transform: "translateZ(64px)", background: "conic-gradient(from 90deg, transparent, rgba(242,118,28,0.5), rgba(255,184,102,0.5), transparent 60%)", filter: "blur(3px)" }}
        />
        {/* dashed gyro */}
        <div className="pointer-events-none absolute rounded-full motion-safe:animate-[nex-spin_34s_linear_infinite]" style={{ width: "48%", height: "48%", border: "1px dashed rgba(242,118,28,0.28)", transform: "translateZ(72px)" }} />

        {/* 3 — particle field */}
        <canvas ref={canvasRef} className="pointer-events-none absolute" style={{ width: size, height: size, transform: "translateZ(40px)" }} />

        {/* 4 — plasma core */}
        <div className="pointer-events-none absolute grid place-items-center" style={{ width: "34%", height: "34%", transform: "translateZ(96px)" }}>
          <div className="absolute inset-0 rounded-full blur-2xl motion-safe:animate-[nex-breathe_3.4s_ease-in-out_infinite] [background:radial-gradient(circle,#ffd9a8,#f2761c_45%,transparent_72%)]" />
          <div className="absolute inset-[16%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff,#f9a05a_38%,#7a3a0a_85%)] shadow-[0_0_60px_-6px_rgba(242,118,28,0.9),inset_0_0_30px_rgba(255,255,255,0.35)]" />
          {/* holographic shimmer across the core */}
          <div className="absolute inset-[16%] overflow-hidden rounded-full">
            <span className="absolute inset-0 opacity-50 [background:linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.6)_50%,transparent_60%)] [background-size:250%_100%] motion-safe:animate-[nex-shimmer_3.4s_linear_infinite]" />
          </div>
          <svg viewBox="0 0 24 24" className="relative h-1/3 w-1/3 text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] motion-safe:animate-[nex-spin_24s_linear_infinite]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.5-6.5-2 2m-7 7-2 2m11 0-2-2m-7-7-2-2" />
          </svg>
        </div>

        {/* 5 — orbiting satellites with glow */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="pointer-events-none absolute left-1/2 top-1/2 motion-safe:animate-[nex-spin_var(--d)_linear_infinite]"
            style={{ ["--d" as string]: `${11 + i * 7}s`, animationDirection: i % 2 ? "reverse" : "normal", transform: "translateZ(80px)" }}
          >
            <span
              className="absolute block h-2.5 w-2.5 rounded-full"
              style={{ background: NEON[i], boxShadow: `0 0 14px ${NEON[i]}, 0 0 4px #fff`, transform: `translate(-50%,-50%) translateX(${(0.5 - i * 0.085) * size}px)` }}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
