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
        // Brand primary = warm orange, secondary = coral. `navy`/`ice` are kept as
        // aliases so existing bg-navy/from-navy decorative gradients warm up too.
        brand: {
          DEFAULT: "#f2761c",
          600: "#e0670f",
          50: "#fff3ea",
        },
        violet: {
          DEFAULT: "#fb8c6a",
          600: "#f2761c",
        },
        navy: {
          DEFAULT: "#f2761c",
          light: "#fb8c6a",
        },
        ice: {
          DEFAULT: "#fb8c6a",
          soft: "#ffb59a",
        },
        // Warm-white semantic neutrals. Literal hex (single light theme) so Tailwind
        // opacity modifiers (text-ink/70, border-line/50, …) work natively. The
        // matching :root CSS vars mirror these for raw-CSS consumers.
        ink: "#2b2118",
        muted: "#8a7e72",
        faint: "#b4a99b",
        line: "#ebe3d8",
        "line-strong": "#ddd2c4",
        canvas: "#fbf8f4",
        surface: {
          DEFAULT: "#ffffff",
          raised: "#fffdfb",
          2: "#f6f1ea",
          3: "#efe7dd",
        },
        accent: {
          DEFAULT: "#f2761c",
          hover: "#e0670f",
          soft: "#fb8c6a",
          tint: "#fff3ea",
        },
        // Warm decorative ramp + functional status.
        cream: "#fffdfb",
        peach: "#ffe9d6",
        sun: "#ffb866",
        success: "#16a34a",
        warning: "#f59e0b",
        danger: "#ef4444",
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
        // ---- Nex-Era design system tokens (read CSS vars from .nex scope) ----
        // Opt-in: only resolve inside a `.nex` container. Keeps the light app
        // untouched while giving DS components first-class Tailwind utilities.
        nex: {
          bg: "var(--nex-bg)",
          raised: "var(--nex-bg-raised)",
          sunken: "var(--nex-bg-sunken)",
          glass: "var(--nex-glass)",
          "glass-strong": "var(--nex-glass-strong)",
          "glass-hover": "var(--nex-glass-hover)",
          border: "var(--nex-border)",
          "border-strong": "var(--nex-border-strong)",
          text: "var(--nex-text)",
          muted: "var(--nex-text-muted)",
          faint: "var(--nex-text-faint)",
          accent: "var(--nex-accent)",
          "accent-2": "var(--nex-accent-2)",
          "accent-3": "var(--nex-accent-3)",
          purple: "var(--nex-purple-500)",
          blue: "var(--nex-blue-500)",
          cyan: "var(--nex-cyan-400)",
          success: "var(--nex-success)",
          warning: "var(--nex-warning)",
          danger: "var(--nex-danger)",
          info: "var(--nex-info)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "var(--font-geist-sans)", "sans-serif"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to right, rgba(70,50,30,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,50,30,0.04) 1px, transparent 1px)",
        sunrise: "var(--sunrise)",
        "accent-gradient": "var(--accent-gradient)",
      },
      borderRadius: {
        "nex-sm": "var(--nex-radius-sm)",
        "nex-md": "var(--nex-radius-md)",
        "nex-lg": "var(--nex-radius-lg)",
        "nex-xl": "var(--nex-radius-xl)",
        "nex-2xl": "var(--nex-radius-2xl)",
      },
      backdropBlur: {
        "nex-sm": "var(--nex-blur-sm)",
        "nex-md": "var(--nex-blur-md)",
        "nex-lg": "var(--nex-blur-lg)",
        "nex-xl": "var(--nex-blur-xl)",
      },
      boxShadow: {
        "nex-sm": "var(--nex-shadow-sm)",
        "nex-md": "var(--nex-shadow-md)",
        "nex-lg": "var(--nex-shadow-lg)",
        "nex-float": "var(--nex-shadow-float)",
        "nex-glow-purple": "var(--nex-glow-purple)",
        "nex-glow-blue": "var(--nex-glow-blue)",
        "nex-glow-cyan": "var(--nex-glow-cyan)",
        glow: "0 0 40px -10px rgba(242,118,28,0.45)",
        "glow-blue": "0 0 60px -15px rgba(251,140,106,0.4)",
        "glow-accent": "0 0 40px -8px rgba(242,118,28,0.5)",
        // Warm-white elevation scale — soft floating, warm-ink tinted, never raw black.
        // soft = resting card, lift = hover / showpiece panel, pop = popover/menu.
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
        pop: "var(--shadow-pop)",
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
