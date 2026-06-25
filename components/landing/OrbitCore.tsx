"use client";

// 3D "intelligence core" — a glowing hub orbited by model nodes on three tilted
// rings, the whole scene slowly rotating and reacting to the pointer (parallax
// tilt). Pure CSS 3D + framer-motion; no WebGL. Reduced-motion freezes it.

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { NexeraMark } from "@/components/Logo";

const RINGS = [
  { size: 360, tilt: 74, dur: "26s", rev: false, color: "#3b82f6", nodes: 3 },
  { size: 264, tilt: 66, dur: "18s", rev: true, color: "#8b5cf6", nodes: 2 },
  { size: 176, tilt: 80, dur: "12s", rev: false, color: "#5e9dff", nodes: 2 },
];

export default function OrbitCore() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotX = useSpring(useTransform(py, [-0.5, 0.5], [14, -14]), { stiffness: 120, damping: 18 });
  const rotY = useSpring(useTransform(px, [-0.5, 0.5], [-18, 18]), { stiffness: 120, damping: 18 });

  const onMove = (e: React.PointerEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div
      ref={wrapRef}
      onPointerMove={onMove}
      onPointerLeave={reset}
      aria-hidden
      className="relative mx-auto grid h-[380px] w-[380px] place-items-center sm:h-[440px] sm:w-[440px]"
      style={{ perspective: 1000 }}
    >
      {/* ambient core glow */}
      <div className="absolute h-56 w-56 rounded-full bg-brand/25 blur-[90px]" />
      <div className="absolute h-40 w-40 rounded-full bg-violet/20 blur-[70px]" />

      <motion.div
        className="scene-3d relative h-full w-full"
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
      >
        {/* slow continuous Y spin lives on an inner layer so it composes with tilt */}
        <div
          className="scene-3d absolute inset-0"
          style={{ transformStyle: "preserve-3d", animation: "spin-y 34s linear infinite" }}
        >
          {RINGS.map((ring, ri) => (
            <div
              key={ri}
              className="absolute left-1/2 top-1/2"
              style={{
                width: ring.size,
                height: ring.size,
                marginLeft: -ring.size / 2,
                marginTop: -ring.size / 2,
                transformStyle: "preserve-3d",
                transform: `rotateX(${ring.tilt}deg)`,
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: `1px solid ${ring.color}55`,
                  boxShadow: `0 0 24px -6px ${ring.color}66, inset 0 0 30px -10px ${ring.color}55`,
                  transformStyle: "preserve-3d",
                  animation: `${ring.rev ? "ring-spin-rev" : "ring-spin"} ${ring.dur} linear infinite`,
                }}
              >
                {Array.from({ length: ring.nodes }).map((_, ni) => {
                  const angle = (360 / ring.nodes) * ni;
                  return (
                    <span
                      key={ni}
                      className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full"
                      style={{
                        marginLeft: -5,
                        marginTop: -5,
                        background: ring.color,
                        boxShadow: `0 0 12px 2px ${ring.color}`,
                        transform: `rotateZ(${angle}deg) translateX(${ring.size / 2}px)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* central hub */}
          <div
            className="absolute left-1/2 top-1/2 grid h-24 w-24 place-items-center rounded-2xl"
            style={{
              marginLeft: -48,
              marginTop: -48,
              transformStyle: "preserve-3d",
              transform: "translateZ(40px)",
              background: "linear-gradient(145deg, rgba(59,130,246,0.20), rgba(139,92,246,0.10))",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 0 60px -10px rgba(59,130,246,0.6), inset 0 1px 0 rgba(255,255,255,0.15)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              className="absolute -z-10 h-24 w-24 rounded-full"
              style={{ background: "radial-gradient(circle,rgba(94,157,255,0.5),transparent 70%)", animation: "core-pulse 3.2s ease-in-out infinite" }}
            />
            <NexeraMark size={48} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
