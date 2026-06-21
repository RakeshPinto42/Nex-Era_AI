import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#05060a",
          50: "#0b0d14",
          100: "#0e1118",
          200: "#13161f",
        },
        emerald: {
          glow: "#34f5a0",
          DEFAULT: "#10b981",
        },
        // Brand primary = blue, secondary = violet. `navy` is kept as an alias
        // of the blue brand so existing bg-navy/text-navy classes inherit it.
        brand: {
          DEFAULT: "#3b82f6",
          600: "#2563eb",
          50: "#eff6ff",
        },
        violet: {
          DEFAULT: "#8b5cf6",
          600: "#7c3aed",
        },
        navy: {
          DEFAULT: "#3b82f6",
          light: "#8b5cf6",
        },
        ice: {
          DEFAULT: "#5e9dff",
          soft: "#8fc1ff",
        },
        // Semantic neutrals (spec).
        ink: "#0f172a",
        muted: "#64748b",
        line: "#e5e7eb",
        canvas: "#f8fafc",
        // Finance OS theme tokens — read CSS vars set by [data-fos-theme].
        fos: {
          bg: "var(--fos-bg)",
          surface: "var(--fos-surface)",
          surface2: "var(--fos-surface-2)",
          border: "var(--fos-border)",
          text: "var(--fos-text)",
          muted: "var(--fos-muted)",
          faint: "var(--fos-faint)",
        },
        // Intent palette — color encodes the routed task type. Mirrors
        // lib/brand/intent.ts; keep the two in sync.
        intent: {
          reasoning: "#8b5cf6",
          coding: "#3b82f6",
          general: "#06b6d4",
          research: "#f59e0b",
          vision: "#ec4899",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "var(--font-geist-sans)", "sans-serif"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
      },
      boxShadow: {
        glow: "0 0 50px -12px rgba(59,130,246,0.45)",
        "glow-blue": "0 0 60px -15px rgba(139,92,246,0.4)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        "pulse-ring": "pulse-ring 3s ease-out infinite",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [],
};

export default config;
