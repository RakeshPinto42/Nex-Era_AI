// Lightweight keyword + heuristic intent classifier.
// Returns a scored distribution over intents (each 0–1), no ML needed.

import type { Intent } from "./models";

type Signal = { intent: Intent; weight: number; patterns: RegExp[] };

const SIGNALS: Signal[] = [
  {
    intent: "coding",
    weight: 1,
    patterns: [
      /\b(code|coding|function|bug|refactor|debug|compile|api|typescript|python|react|sql|regex|stack ?trace|implement|deploy|class|component)\b/i,
      /```/,
      /\b(npm|pip|git|docker)\b/i,
    ],
  },
  {
    intent: "reasoning",
    weight: 1,
    patterns: [
      /\b(why|prove|reason|logic|step[- ]by[- ]step|derive|explain how|analyze|trade[- ]?off|strategy|think through|solve)\b/i,
      /\b(math|theorem|proof|algorithm complexity)\b/i,
    ],
  },
  {
    intent: "research",
    weight: 1.05,
    patterns: [
      /\b(research|search|latest|news|find sources|cite|citation|paper|study|survey|compare.*market|look up|who is|what happened)\b/i,
      /\b(2024|2025|2026|recent|current)\b/i,
    ],
  },
  {
    intent: "images",
    weight: 1.1,
    patterns: [
      /\b(image|picture|photo|render|illustration|logo|poster|draw|paint|generate.*(image|art|visual)|wallpaper)\b/i,
    ],
  },
  {
    intent: "videos",
    weight: 1.15,
    patterns: [
      /\b(video|clip|animation|animate|film|movie|footage|trailer|reel|generate.*video)\b/i,
    ],
  },
  {
    intent: "vision",
    weight: 1.1,
    patterns: [
      /\b(ocr|read.*(image|screenshot|receipt|invoice)|extract.*text|what(?:'s| is) in this (image|photo)|describe.*(image|photo|screenshot)|scan)\b/i,
    ],
  },
  {
    intent: "general",
    weight: 0.6, // baseline fallback intent
    patterns: [
      /\b(hi|hello|hey|chat|talk|opinion|recommend|help me|tell me|what do you think)\b/i,
    ],
  },
];

export type IntentScore = { intent: Intent; score: number };

export function classifyIntent(prompt: string): {
  top: Intent;
  confidence: number;
  scores: IntentScore[];
} {
  const raw: Record<string, number> = {};

  for (const sig of SIGNALS) {
    let hits = 0;
    for (const re of sig.patterns) if (re.test(prompt)) hits += 1;
    if (hits > 0) raw[sig.intent] = (raw[sig.intent] ?? 0) + hits * sig.weight;
  }

  // Always seed a small general baseline so empty/odd prompts still route.
  raw.general = (raw.general ?? 0) + 0.3;

  const entries = Object.entries(raw) as [Intent, number][];
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;

  const scores: IntentScore[] = entries
    .map(([intent, v]) => ({ intent, score: v / total }))
    .sort((a, b) => b.score - a.score);

  const top = scores[0];
  // Confidence = share of top intent, sharpened by margin over runner-up.
  const margin = top.score - (scores[1]?.score ?? 0);
  const confidence = Math.min(0.99, top.score * 0.7 + margin * 0.6 + 0.15);

  return { top: top.intent, confidence, scores };
}
