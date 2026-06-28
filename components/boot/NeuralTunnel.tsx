"use client";

import * as React from "react";

/**
 * NeuralTunnel — a perspective corridor of light rings rushing toward the
 * camera, with radial speed lines. Pure CSS transforms (translateZ/scale/opacity)
 * inside a 3D perspective container → GPU-composited, 60fps, no canvas.
 *
 * `speed` scales the rush (1 = cruise). Honors prefers-reduced-motion: rings
 * hold a calm static depth, no animation. Decorative → aria-hidden.
 */
export default function NeuralTunnel({ speed = 1, className }: { speed?: number; className?: string }) {
  const RINGS = 14;
  const SPOKES = 28;
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden [perspective:520px] ${className ?? ""}`}>
      {/* depth haze toward the vanishing point */}
      <div className="absolute inset-0 [background:radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.18),transparent_45%)]" />

      {/* rushing rings */}
      <div className="absolute inset-0 [transform-style:preserve-3d]">
        {Array.from({ length: RINGS }).map((_, i) => {
          const hue = ["rgba(168,85,247,0.9)", "rgba(59,130,246,0.9)", "rgba(34,211,238,0.9)"][i % 3];
          return (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 motion-reduce:!animate-none"
              style={{
                borderColor: hue,
                boxShadow: `0 0 60px -10px ${hue}, inset 0 0 60px -20px ${hue}`,
                animation: `nex-tunnel ${4.4 / speed}s linear infinite`,
                animationDelay: `${-(i * (4.4 / speed)) / RINGS}s`,
                opacity: 0.0,
              }}
            />
          );
        })}
      </div>

      {/* radial speed spokes (warp lines) */}
      <div className="absolute inset-0">
        {Array.from({ length: SPOKES }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-[2px] w-[60vmax] origin-left motion-reduce:!animate-none"
            style={{
              ["--r" as string]: `${(360 / SPOKES) * i}deg`,
              transform: `rotate(${(360 / SPOKES) * i}deg) scaleX(0)`,
              background: "linear-gradient(90deg, transparent, rgba(180,200,255,0.5) 60%, transparent)",
              animation: `nex-spoke ${1.6 / speed}s ease-in infinite`,
              animationDelay: `${(i % 6) * 0.12}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes nex-tunnel {
          0% { transform: translate(-50%, -50%) translateZ(-1400px) scale(0.18); opacity: 0; }
          18% { opacity: 0.9; }
          100% { transform: translate(-50%, -50%) translateZ(380px) scale(1.4); opacity: 0; }
        }
        @keyframes nex-spoke {
          0% { transform: rotate(var(--r)) scaleX(0); opacity: 0; }
          40% { opacity: 0.8; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          span { opacity: 0.12 !important; }
        }
      `}</style>
    </div>
  );
}
