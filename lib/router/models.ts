// Model catalog for the Mesh Router.
// All models are free-tier; cost is tracked in notional compute credits
// so usage is still measurable even at $0 spend.

export type Intent =
  | "coding"
  | "reasoning"
  | "general"
  | "research"
  | "images"
  | "videos"
  | "vision";

export const INTENT_LABEL: Record<Intent, string> = {
  coding: "Coding",
  reasoning: "Reasoning",
  general: "General Chat",
  research: "Research",
  images: "Image Generation",
  videos: "Video Generation",
  vision: "Vision / OCR",
};

export type ModelDef = {
  id: string;
  name: string;
  provider: string;
  /** Per-intent capability score, 0–1. Absent intent = not capable. */
  capability: Partial<Record<Intent, number>>;
  /** Typical first-token latency, ms. */
  baseLatencyMs: number;
  /** Notional credits per 1K tokens (free models still consume credits). */
  creditsPer1k: number;
  free: boolean;
  /** Extra tools the model is paired with. */
  tools?: string[];
};

export const MODELS: ModelDef[] = [
  {
    id: "deepseek-coder",
    name: "DeepSeek Coder",
    provider: "DeepSeek",
    capability: { coding: 0.96, reasoning: 0.7, general: 0.55 },
    baseLatencyMs: 420,
    creditsPer1k: 0.8,
    free: true,
  },
  {
    id: "qwen-coder",
    name: "Qwen Coder",
    provider: "Alibaba",
    capability: { coding: 0.9, reasoning: 0.62, general: 0.5 },
    baseLatencyMs: 380,
    creditsPer1k: 0.7,
    free: true,
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    capability: { reasoning: 0.97, coding: 0.8, general: 0.6 },
    baseLatencyMs: 900,
    creditsPer1k: 1.2,
    free: true,
  },
  {
    id: "kimi-k2",
    name: "Kimi K2",
    provider: "Moonshot",
    capability: { general: 0.95, research: 0.78, reasoning: 0.7 },
    baseLatencyMs: 350,
    creditsPer1k: 0.6,
    free: true,
  },
  {
    id: "kimi-search",
    name: "Kimi + Search",
    provider: "Moonshot",
    capability: { research: 0.96, general: 0.8 },
    baseLatencyMs: 1400,
    creditsPer1k: 1.0,
    free: true,
    tools: ["web-search"],
  },
  {
    id: "flux-schnell",
    name: "Flux Schnell",
    provider: "Black Forest Labs",
    capability: { images: 0.95 },
    baseLatencyMs: 1200,
    creditsPer1k: 2.0,
    free: true,
  },
  {
    id: "wan-video",
    name: "Wan Video",
    provider: "Alibaba",
    capability: { videos: 0.93 },
    baseLatencyMs: 6500,
    creditsPer1k: 5.0,
    free: true,
  },
  {
    id: "qwen-vl",
    name: "Qwen VL",
    provider: "Alibaba",
    capability: { vision: 0.94, general: 0.6 },
    baseLatencyMs: 520,
    creditsPer1k: 0.9,
    free: true,
    tools: ["ocr"],
  },
];

export const MODEL_BY_ID = Object.fromEntries(
  MODELS.map((m) => [m.id, m]),
) as Record<string, ModelDef>;

// Ordered preference per routing rule. First available wins.
export const ROUTING_RULES: Record<Intent, string[]> = {
  coding: ["deepseek-coder", "qwen-coder"],
  reasoning: ["deepseek-r1", "deepseek-coder"],
  general: ["kimi-k2", "deepseek-r1"],
  research: ["kimi-search", "kimi-k2"],
  images: ["flux-schnell"],
  videos: ["wan-video"],
  vision: ["qwen-vl"],
};
