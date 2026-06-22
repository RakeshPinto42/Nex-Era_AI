"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

// Button/link that drifts toward the cursor while hovered (spring-smoothed),
// snapping back on leave. Renders an <a> when `href` is set, else a <button>.
// Disabled under prefers-reduced-motion.
export function MagneticButton({
  children,
  className = "",
  href,
  strength = 0.4,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 14 });
  const sy = useSpring(y, { stiffness: 220, damping: 14 });

  const handlers = reduced
    ? {}
    : {
        onMouseMove: (e: React.MouseEvent) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          x.set((e.clientX - (r.left + r.width / 2)) * strength);
          y.set((e.clientY - (r.top + r.height / 2)) * strength);
        },
        onMouseLeave: () => {
          x.set(0);
          y.set(0);
        },
      };

  const style = reduced ? undefined : { x: sx, y: sy };

  if (href) {
    return (
      <motion.a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        style={style}
        className={className}
        {...handlers}
      >
        {children}
      </motion.a>
    );
  }
  return (
    <motion.button
      ref={ref as React.RefObject<HTMLButtonElement>}
      style={style}
      className={className}
      {...handlers}
    >
      {children}
    </motion.button>
  );
}
