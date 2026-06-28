# Nex-Era Design System

The visual language for **Nex-Era — the AI Operating System**. Premium, dark,
cosmic, glass-forward. Influences: Apple Vision Pro · Arc · Linear · Nothing OS
· Interstellar · Tron Legacy. **Not** a chatbot UI.

> This package establishes the language only. It does **not** redesign any
> product page. Pages adopt it incrementally.

---

## 1. How it's scoped (important)

The whole system is **opt-in** and lives behind a `.nex` scope so it never
touches the existing light-theme app.

```tsx
import "@/components/ds/tokens.css";        // once, at the route/layout root
import { NexButton, NexCard } from "@/components/ds";

export default function Page() {
  return (
    <div className="nex nex-canvas min-h-screen">
      {/* tokens + cosmic backdrop resolve only inside `.nex` */}
      <NexCard>…</NexCard>
    </div>
  );
}
```

- `.nex` — declares all CSS variables + dark `color-scheme`.
- `.nex-canvas` — adds the deep-space nebula + starfield + grid backdrop.

Live reference gallery: **`/design-system`**.

---

## 2. Token layers

`components/ds/tokens.css` is the source of truth (CSS vars).
`components/ds/tokens.ts` mirrors values for JS-land (charts, canvas, motion).

```
PRIMITIVE   --nex-space-950, --nex-purple-500 …   raw scales, never in UI
SEMANTIC    --nex-bg, --nex-glass, --nex-accent …  use these in components
COMPONENT   per-component knobs reading semantics
```

### Color — the neon triad on deep space
| Token | Value | Use |
|-------|-------|-----|
| `--nex-bg` | `#05060f` | base canvas |
| `--nex-glass` | `rgba(18,22,48,.55)` | default glass surface |
| `--nex-accent` | `#a855f7` | neon purple — primary |
| `--nex-accent-2` | `#3b82f6` | electric blue |
| `--nex-accent-3` | `#22d3ee` | cyan |
| `--nex-gradient` | purple→blue→cyan | CTAs, glows, headings |

Status: `--nex-success #34f5a0` · `--nex-warning #fbbf24` · `--nex-danger #fb7185` · `--nex-info #22d3ee`.

### Type
Display = **Space Grotesk** (`--nex-font-display`, `.nex-display`), body = **Geist**,
mono = **Geist Mono**. Scale `--nex-text-xs … --nex-text-6xl`. Headings tighten
tracking to `-0.03em`.

### Space / radius / blur
4px spacing base (`--nex-space-*`). Generous radii (`--nex-radius-sm 12 … 2xl 36 / pill`).
Glass blur `--nex-blur-sm…xl`.

### Elevation = shadow + glow
Never raw black drops. `--nex-shadow-sm…float` for depth; `--nex-glow-purple/blue/cyan`
for neon halos on hover/focus/active. Focus ring = `--nex-glow-focus`.

### Motion
Cinematic, never linear. `--nex-ease` (expo-out) for UI, `--nex-ease-spring`
for overshoot, `--nex-ease-inout` for big transitions. Durations
`fast 140 / base 240 / slow 420 / cine 720`. All decorative animation freezes
under `prefers-reduced-motion`.

---

## 3. Tailwind utilities

`tailwind.config.ts` exposes the system under a `nex` namespace (resolves only
inside `.nex`): `bg-nex-glass`, `text-nex-muted`, `border-nex-border`,
`shadow-nex-float`, `shadow-nex-glow-purple`, `rounded-nex-xl`, `backdrop-blur-nex-lg`, etc.
The light app's existing tokens are untouched.

CSS helpers (from `tokens.css`): `.nex-glass`, `.nex-glass-strong`,
`.nex-text-gradient`, `.nex-ring`, `.nex-display`, `.nex-anim-float/breathe/aurora`.

---

## 4. Components

`import { … } from "@/components/ds"`

| Group | Exports |
|-------|---------|
| **Buttons** | `NexButton` (primary·glass·outline·ghost·danger · sizes · loading · icons) |
| **Cards** | `NexCard` (glass·solid·ring·bare · float · interactive · glow) + `NexCardHeader/Title/Description/Body/Footer` |
| **Inputs** | `NexInput`, `NexTextarea`, `NexSelect`, `NexField`, `NexSwitch` |
| **Status** | `NexBadge`, `NexStatusDot`, `NexTag` |
| **Progress** | `NexProgress`, `NexRing`, `NexSteps` |
| **Loading** | `NexSpinner`, `NexOrbit`, `NexDots`, `NexSkeleton`, `NexScanLoader` |
| **Overlays** | `NexModal`, `NexDialog` |
| **Menus** | `NexDropdown` |
| **Shell** | `NexSidebar`, `NexNavbar`, `NexTabs` |
| **Data** | `NexTable`, `NexAreaChart`, `NexLineChart`, `NexBarChart`, `NexDonut` |
| **AI** | `NexAIResponseCard`, `NexAIAction` (intent-tinted, streaming caret) |

### Quick examples

```tsx
<NexButton variant="primary" size="lg">Launch OS</NexButton>

<NexCard variant="ring" glow="cyan" interactive>
  <NexCardTitle>Build</NexCardTitle>
  <NexCardBody>Compose agents on a floating glass canvas.</NexCardBody>
</NexCard>

<NexAIResponseCard model="Nex-Era · Orion" intent="reasoning" streaming>
  <p>Routing your request to the reasoning core…</p>
</NexAIResponseCard>
```

---

## 5. Principles

1. **Depth, not flatness** — layered glass over a living cosmic backdrop.
2. **Energy via glow** — neon halos signal state; shadows give weight.
3. **Cinematic motion** — expo/spring easing, fades that rise, never snap.
4. **Minimal but luxurious** — generous spacing, few elements, each premium.
5. **Color encodes meaning** — the triad maps to intent (reasoning/coding/general…).
6. **Accessible** — keyboard focus rings, `aria-*`, reduced-motion honored.
7. **OS, not chatbot** — surfaces feel like spatial panels in a system, not a feed.

---

## 6. Dependencies
Uses what's already installed: `framer-motion` (overlays/AI cards), `recharts`
(charts), `class-variance-authority` + `tailwind-merge` (`cn`), `lucide-react`
(icons in product). No new deps added.
