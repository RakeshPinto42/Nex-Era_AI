"use client";

import * as React from "react";

/**
 * CosmicBackground — the living deep-space canvas behind the landing page.
 *
 * Three composited layers:
 *   1. Nebula     — CSS animated galaxy clouds (purple/blue/cyan), slow drift.
 *   2. Starfield  — canvas, 3 parallax depth layers, twinkle + mouse parallax.
 *   3. Particles  — canvas, slow-floating glowing motes (the neon dust).
 *
 * Performance: a single rAF drives both canvas layers; DPR-aware; pauses when
 * the tab is hidden; fully static under prefers-reduced-motion (one paint, no
 * loop, no parallax). Pointer parallax is eased toward a target so it glides.
 *
 * Landing-page only. Does not import or affect any product surface.
 */

type Star = { x: number; y: number; z: number; r: number; tw: number; tp: number };
type Mote = { x: number; y: number; vx: number; vy: number; r: number; hue: number; a: number };

const NEON = ["#f2761c", "#fb8c6a", "#ffb866"];

export default function CosmicBackground({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let motes: Mote[] = [];
    let raf = 0;

    // Eased pointer parallax target (-1..1 around center).
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Star density scales with area but capped for low-end devices.
      const count = Math.min(420, Math.floor((w * h) / 5200));
      stars = Array.from({ length: count }, () => {
        const z = Math.random(); // depth 0..1 → parallax + size
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          r: 0.4 + z * 1.6,
          tw: Math.random() * Math.PI * 2,
          tp: 0.6 + Math.random() * 1.8,
        };
      });

      const moteCount = Math.min(46, Math.floor((w * h) / 42000));
      motes = Array.from({ length: moteCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.08 - Math.random() * 0.22,
        r: 0.8 + Math.random() * 2.4,
        hue: Math.floor(Math.random() * NEON.length),
        a: 0.25 + Math.random() * 0.5,
      }));
    }

    function draw(t: number) {
      ctx!.clearRect(0, 0, w, h);

      // ease pointer toward target
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      // ---- stars (parallax by depth) ----
      for (const s of stars) {
        const px = s.x + pointer.x * (8 + s.z * 34);
        const py = s.y + pointer.y * (8 + s.z * 34);
        const tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.001 * s.tp + s.tw);
        ctx!.globalAlpha = (0.12 + s.z * 0.4) * tw;
        ctx!.fillStyle = s.z > 0.8 ? "#e6a86a" : "#d8c4a8";
        ctx!.beginPath();
        ctx!.arc(px, py, s.r, 0, Math.PI * 2);
        ctx!.fill();
        // brightest stars get a soft bloom
        if (s.z > 0.86) {
          ctx!.globalAlpha = 0.12 * tw;
          ctx!.beginPath();
          ctx!.arc(px, py, s.r * 3.4, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // ---- floating motes ----
      for (const m of motes) {
        if (!reduce) {
          m.x += m.vx;
          m.y += m.vy;
          if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
          if (m.x < -10) m.x = w + 10;
          if (m.x > w + 10) m.x = -10;
        }
        const px = m.x + pointer.x * 22;
        const py = m.y + pointer.y * 22;
        const g = ctx!.createRadialGradient(px, py, 0, px, py, m.r * 6);
        g.addColorStop(0, NEON[m.hue]);
        g.addColorStop(1, "transparent");
        ctx!.globalAlpha = m.a;
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(px, py, m.r * 6, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    }

    function onPointer(e: PointerEvent) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    function onVisibility() {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce) raf = requestAnimationFrame(draw);
    }

    build();
    draw(0);
    if (!reduce) window.addEventListener("pointermove", onPointer, { passive: true });
    const ro = new ResizeObserver(() => build());
    ro.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
    };
  }, []);

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className ?? ""}`}>
      {/* base warm sunrise wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_-10%,#fff7ee_0%,#fdf6ef_45%,#fbf8f4_100%)]" />

      {/* ---- warm clouds (CSS, animated drift) ---- */}
      <div className="absolute left-[8%] top-[-12%] h-[58vw] w-[58vw] rounded-full opacity-70 blur-[120px] [background:radial-gradient(circle,rgba(255,196,140,0.55),transparent_60%)] nex-anim-aurora" />
      <div className="absolute right-[-6%] top-[18%] h-[52vw] w-[52vw] rounded-full opacity-55 blur-[130px] [background:radial-gradient(circle,rgba(251,140,106,0.42),transparent_62%)] nex-anim-aurora [animation-delay:-7s]" />
      <div className="absolute bottom-[-18%] left-[28%] h-[48vw] w-[48vw] rounded-full opacity-45 blur-[140px] [background:radial-gradient(circle,rgba(255,184,102,0.40),transparent_64%)] nex-anim-aurora [animation-delay:-13s]" />

      {/* ---- warm light ribbons (slow cinematic bands) ---- */}
      <div className="absolute left-[-20%] top-[24%] h-[34vh] w-[140%] -rotate-12 opacity-35 blur-[60px] [background:linear-gradient(90deg,transparent,rgba(255,196,140,0.35),rgba(251,140,106,0.28),transparent)] nex-anim-aurora" />
      <div className="absolute left-[-20%] top-[52%] h-[26vh] w-[140%] rotate-6 opacity-25 blur-[70px] [background:linear-gradient(90deg,transparent,rgba(255,184,102,0.28),rgba(242,118,28,0.18),transparent)] nex-anim-aurora [animation-delay:-9s]" />

      {/* ---- starfield + particles + floating dust (canvas) ---- */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* faint warm engineering grid, masked toward center */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(70,50,30,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(70,50,30,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent_85%)]" />

      {/* soft vignette + top warm bloom */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(251,248,244,0.6))]" />
      <div className="absolute inset-x-0 top-0 h-[40vh] bg-[linear-gradient(180deg,rgba(255,196,140,0.18),transparent)]" />
    </div>
  );
}
