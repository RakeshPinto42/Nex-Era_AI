// Signal/Network identity — color ENCODES intent, it is not decoration.
// Every model/task surface keys its color off this single source so the palette
// teaches the router's job: each prompt is classified into one of these intents
// and routed to the model that scores best for it.
//
// `rgb` is a bare "r,g,b" string so it drops straight into canvas fillStyle
// (`rgba(${rgb},0.9)`) and inline styles alike.

export type Intent =
  | "reasoning"
  | "coding"
  | "general"
  | "research"
  | "vision";

export type IntentColor = {
  label: string;
  rgb: string; // "r,g,b" — canvas + rgba() friendly
  hex: string; // Tailwind / SVG friendly
  emoji: string; // ChatGPT-style glyph for the model/LLM identity
};

export const INTENTS: Record<Intent, IntentColor> = {
  reasoning: { label: "Reasoning", rgb: "139,92,246", hex: "#8b5cf6", emoji: "🧠" }, // violet (secondary)
  coding: { label: "Coding", rgb: "59,130,246", hex: "#3b82f6", emoji: "💻" }, // blue (brand)
  general: { label: "General", rgb: "6,182,212", hex: "#06b6d4", emoji: "💬" }, // cyan
  research: { label: "Research", rgb: "245,158,11", hex: "#f59e0b", emoji: "🔎" }, // amber
  vision: { label: "Vision", rgb: "236,72,153", hex: "#ec4899", emoji: "🎨" }, // pink
};

/** Emoji for an intent key (falls back to the NEXERA assistant glyph). */
export function intentEmoji(intent?: string): string {
  return (intent && INTENTS[intent as Intent]?.emoji) || "🤖";
}

export const INTENT_ORDER: Intent[] = [
  "reasoning",
  "coding",
  "general",
  "research",
  "vision",
];

// Weighted spawn distribution for the mesh background — brand hues (coding /
// general) stay dominant so the field still reads as Mesh, the rest accent it.
export const MESH_HUE_WEIGHTS: { intent: Intent; w: number }[] = [
  { intent: "coding", w: 0.34 },
  { intent: "general", w: 0.28 },
  { intent: "reasoning", w: 0.18 },
  { intent: "research", w: 0.1 },
  { intent: "vision", w: 0.1 },
];

/** Pick a weighted-random intent for a mesh node. */
export function sampleIntent(): Intent {
  const r = Math.random();
  let acc = 0;
  for (const { intent, w } of MESH_HUE_WEIGHTS) {
    acc += w;
    if (r <= acc) return intent;
  }
  return "coding";
}
