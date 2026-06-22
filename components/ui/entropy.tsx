"use client";

import { useEffect, useRef } from "react";

// Order-vs-chaos particle field (adapted from 21st.dev "Entropy").
// Brand-fitted: transparent background, configurable brand color (so it sits on
// NEXERA's light surfaces), hi-DPI aware, and reduced-motion safe. The left half
// is chaotic, the right half snaps to an ordered grid — a visual for the router
// pulling signal out of noise.

interface EntropyProps {
  className?: string;
  size?: number;
  /** 6-digit hex (alpha is appended at runtime). */
  color?: string;
}

export function Entropy({ className = "", size = 320, color = "#3b82f6" }: EntropyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const hex2 = (a: number) =>
      Math.round(Math.max(0, Math.min(1, a)) * 255)
        .toString(16)
        .padStart(2, "0");

    class Particle {
      x: number;
      y: number;
      originalX: number;
      originalY: number;
      size = 2;
      order: boolean;
      velocity = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 };
      influence = 0;
      neighbors: Particle[] = [];

      constructor(x: number, y: number, order: boolean) {
        this.x = x;
        this.y = y;
        this.originalX = x;
        this.originalY = y;
        this.order = order;
      }

      update() {
        if (this.order) {
          const dx = this.originalX - this.x;
          const dy = this.originalY - this.y;
          const chaos = { x: 0, y: 0 };
          this.neighbors.forEach((n) => {
            if (!n.order) {
              const d = Math.hypot(this.x - n.x, this.y - n.y);
              const s = Math.max(0, 1 - d / 100);
              chaos.x += n.velocity.x * s;
              chaos.y += n.velocity.y * s;
              this.influence = Math.max(this.influence, s);
            }
          });
          this.x += dx * 0.05 * (1 - this.influence) + chaos.x * this.influence;
          this.y += dy * 0.05 * (1 - this.influence) + chaos.y * this.influence;
          this.influence *= 0.99;
        } else {
          this.velocity.x += (Math.random() - 0.5) * 0.5;
          this.velocity.y += (Math.random() - 0.5) * 0.5;
          this.velocity.x *= 0.95;
          this.velocity.y *= 0.95;
          this.x += this.velocity.x;
          this.y += this.velocity.y;
          if (this.x < size / 2 || this.x > size) this.velocity.x *= -1;
          if (this.y < 0 || this.y > size) this.velocity.y *= -1;
          this.x = Math.max(size / 2, Math.min(size, this.x));
          this.y = Math.max(0, Math.min(size, this.y));
        }
      }

      draw(c: CanvasRenderingContext2D) {
        const alpha = this.order ? 0.85 - this.influence * 0.5 : 0.85;
        c.fillStyle = `${color}${hex2(alpha)}`;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fill();
      }
    }

    const particles: Particle[] = [];
    const gridSize = 25;
    const spacing = size / gridSize;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = spacing * i + spacing / 2;
        const y = spacing * j + spacing / 2;
        particles.push(new Particle(x, y, x < size / 2));
      }
    }

    const updateNeighbors = () => {
      particles.forEach((p) => {
        p.neighbors = particles.filter(
          (o) => o !== p && Math.hypot(p.x - o.x, p.y - o.y) < 100,
        );
      });
    };

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      particles.forEach((p) => {
        p.draw(ctx);
        p.neighbors.forEach((n) => {
          const d = Math.hypot(p.x - n.x, p.y - n.y);
          if (d < 50) {
            ctx.strokeStyle = `${color}${hex2(0.22 * (1 - d / 50))}`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(n.x, n.y);
            ctx.stroke();
          }
        });
      });
      // center divider — chaos | order
      ctx.strokeStyle = `${color}33`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(size / 2, 0);
      ctx.lineTo(size / 2, size);
      ctx.stroke();
    };

    // Reduced motion: settle to the ordered state and draw one static frame.
    if (reduced) {
      updateNeighbors();
      render();
      return;
    }

    let time = 0;
    let raf: number;
    const animate = () => {
      if (time % 30 === 0) updateNeighbors();
      particles.forEach((p) => p.update());
      render();
      time++;
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(raf);
  }, [size, color]);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}
