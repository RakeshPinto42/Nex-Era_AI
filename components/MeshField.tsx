"use client";

// Animated decentralized-mesh background: drifting nodes, proximity edges, and
// signal pulses that travel along edges — a visual metaphor for requests being
// routed across a mesh of open models. Canvas + rAF, DPR-aware, and it freezes
// to a single static frame when the user prefers reduced motion.

import { useEffect, useRef } from "react";
import { INTENTS, sampleIntent } from "@/lib/brand/intent";

type Node = { x: number; y: number; vx: number; vy: number; r: number; rgb: string };
type Pulse = { a: number; b: number; t: number; speed: number; rgb: string };

// Neutral signal wire — lets the intent-colored nodes carry all the meaning.
const WIRE = "180,200,230";

export default function MeshField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    const mouse = { x: -9999, y: -9999 };

    const LINK_DIST = 150;

    const seed = () => {
      const area = w * h;
      const count = Math.max(22, Math.min(64, Math.round(area / 26000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.6 + 1.1,
        rgb: INTENTS[sampleIntent()].rgb,
      }));
      pulses = [];
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const spawnPulse = () => {
      if (pulses.length > 14 || nodes.length < 2) return;
      const a = (Math.random() * nodes.length) | 0;
      // pick a nearby node as the destination
      let best = -1;
      let bestD = LINK_DIST * LINK_DIST;
      for (let i = 0; i < nodes.length; i++) {
        if (i === a) continue;
        const dx = nodes[a].x - nodes[i].x;
        const dy = nodes[a].y - nodes[i].y;
        const d = dx * dx + dy * dy;
        if (d < bestD && Math.random() < 0.5) {
          bestD = d;
          best = i;
        }
      }
      if (best === -1) return;
      pulses.push({
        a,
        b: best,
        t: 0,
        speed: 0.006 + Math.random() * 0.01,
        rgb: nodes[a].rgb,
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // edges
      for (let i = 0; i < nodes.length; i++) {
        const ni = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const nj = nodes[j];
          const dx = ni.x - nj.x;
          const dy = ni.y - nj.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            const o = (1 - dist / LINK_DIST) * 0.16;
            ctx.strokeStyle = `rgba(${WIRE},${o})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ni.x, ni.y);
            ctx.lineTo(nj.x, nj.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.rgb},0.9)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${n.rgb},0.7)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // pulses travelling along edges
      for (const p of pulses) {
        const a = nodes[p.a];
        const b = nodes[p.b];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.rgb},1)`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = `rgba(${p.rgb},0.95)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const step = () => {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        // gentle repel from cursor
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14000) {
          const f = (14000 - d2) / 14000;
          n.x += (dx / Math.sqrt(d2 || 1)) * f * 0.8;
          n.y += (dy / Math.sqrt(d2 || 1)) * f * 0.8;
        }
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        pulses[i].t += pulses[i].speed;
        if (pulses[i].t >= 1) pulses.splice(i, 1);
      }
      if (Math.random() < 0.08) spawnPulse();
      draw();
      raf = requestAnimationFrame(step);
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);

    if (reduce) draw();
    else raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
