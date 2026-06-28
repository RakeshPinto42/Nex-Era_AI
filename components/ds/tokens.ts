/**
 * Nex-Era design tokens — TypeScript mirror of tokens.css.
 *
 * Use these where CSS variables can't reach: chart series colors, canvas
 * drawing, framer-motion values, inline gradients computed in JS. Keep in sync
 * with components/ds/tokens.css (the CSS file is the source of truth for UI).
 */

export const nexColors = {
  // Cosmic neutrals
  space: {
    1000: "#03040c",
    950: "#05060f",
    900: "#080a18",
    850: "#0b0e20",
    800: "#10142b",
    700: "#161b39",
    600: "#1e2547",
    500: "#2a3360",
  },
  // Neon triad
  purple: { 300: "#d8b4fe", 400: "#c084fc", 500: "#a855f7", 600: "#8b5cf6", 700: "#7c3aed" },
  blue: { 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8" },
  cyan: { 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2" },
  // Status
  success: "#34f5a0",
  warning: "#fbbf24",
  danger: "#fb7185",
  info: "#22d3ee",
  // Text
  text: "#f5f7ff",
  muted: "#b4bce0",
  faint: "#8b93b8",
} as const;

/** Ordered palette for chart series — spaced around the neon triad. */
export const nexChartSeries = [
  nexColors.purple[500],
  nexColors.cyan[400],
  nexColors.blue[500],
  nexColors.purple[400],
  nexColors.success,
  nexColors.warning,
  nexColors.blue[300],
  nexColors.danger,
] as const;

export const nexGradient = "linear-gradient(120deg, #a855f7 0%, #3b82f6 52%, #22d3ee 100%)";

/** Motion presets for framer-motion. */
export const nexMotion = {
  ease: [0.22, 1, 0.36, 1] as const,
  easeInOut: [0.65, 0, 0.35, 1] as const,
  spring: { type: "spring", stiffness: 320, damping: 30, mass: 0.8 } as const,
  durations: { fast: 0.14, base: 0.24, slow: 0.42, cine: 0.72 } as const,
  // Cinematic entrance — fade up + slight scale.
  rise: {
    initial: { opacity: 0, y: 16, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  },
  // Stagger container for lists of cards.
  stagger: {
    animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  },
} as const;

export type NexAccent = "purple" | "blue" | "cyan";
export type NexStatus = "online" | "busy" | "idle" | "offline" | "error";
