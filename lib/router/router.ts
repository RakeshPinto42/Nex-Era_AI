// Mesh Router — selects the best free model for a prompt.
// Pipeline: classify intent → score candidates → apply availability/fallback
// → estimate latency → track cost.

import {
  MODELS,
  MODEL_BY_ID,
  ROUTING_RULES,
  INTENT_LABEL,
  type Intent,
  type ModelDef,
} from "./models";
import { classifyIntent, type IntentScore } from "./intent";
import { costTracker, estimateTokens } from "./cost";

export type ScoredModel = {
  model: ModelDef;
  score: number; // 0–1 composite fit
  breakdown: {
    capability: number;
    rulePrior: number;
    latency: number;
    cost: number;
  };
  available: boolean;
};

export type RouteResult = {
  intent: Intent;
  intentLabel: string;
  intentConfidence: number;
  intentScores: IntentScore[];

  selected: ModelDef;
  reason: string;
  confidence: number; // final routing confidence 0–1
  estLatencyMs: number;
  estTokens: number;
  estCredits: number;
  usedFallback: boolean;

  ranked: ScoredModel[];
  fallbackChain: ModelDef[];
};

const WEIGHTS = {
  capability: 0.55,
  rulePrior: 0.25,
  latency: 0.1,
  cost: 0.1,
};

// Normalize latency/cost to a 0–1 "goodness" (lower is better).
function latencyScore(ms: number) {
  return Math.max(0, 1 - ms / 7000);
}
function costScore(creditsPer1k: number) {
  return Math.max(0, 1 - creditsPer1k / 5);
}

export type RouteOptions = {
  /** modelId → available? Defaults to all available. Drives fallback. */
  availability?: Record<string, boolean>;
  /** Override classified intent (manual mode). */
  forceIntent?: Intent;
};

export function route(prompt: string, opts: RouteOptions = {}): RouteResult {
  const cls = classifyIntent(prompt);
  const intent = opts.forceIntent ?? cls.top;
  const rulePref = ROUTING_RULES[intent] ?? [];

  // Candidate = any model capable of this intent.
  const candidates = MODELS.filter((m) => m.capability[intent] != null);

  const ranked: ScoredModel[] = candidates
    .map((model) => {
      const cap = model.capability[intent] ?? 0;
      const ruleIdx = rulePref.indexOf(model.id);
      // Earlier in the routing rule = higher prior. Not listed = small base.
      const rulePrior =
        ruleIdx === -1 ? 0.3 : 1 - ruleIdx / Math.max(1, rulePref.length);
      const lat = latencyScore(model.baseLatencyMs);
      const cst = costScore(model.creditsPer1k);

      const score =
        cap * WEIGHTS.capability +
        rulePrior * WEIGHTS.rulePrior +
        lat * WEIGHTS.latency +
        cst * WEIGHTS.cost;

      const available = opts.availability
        ? opts.availability[model.id] !== false
        : true;

      return {
        model,
        score,
        breakdown: { capability: cap, rulePrior, latency: lat, cost: cst },
        available,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Selection: highest-scoring AVAILABLE model.
  const topOverall = ranked[0];
  const firstAvailable = ranked.find((r) => r.available) ?? topOverall;
  const usedFallback = firstAvailable.model.id !== topOverall.model.id;

  const selected = firstAvailable.model;
  const estTokens = estimateTokens(prompt);
  const estCredits = costTracker.record(selected.id, estTokens);

  // Jitter latency a touch so repeated calls feel live.
  const estLatencyMs = Math.round(
    selected.baseLatencyMs * (0.85 + Math.random() * 0.3),
  );

  // Final confidence blends intent confidence with the selected model's fit
  // and its margin over the next candidate.
  const next = ranked.find((r) => r.model.id !== selected.id);
  const margin = firstAvailable.score - (next?.score ?? 0);
  const confidence = clamp01(
    cls.confidence * 0.5 + firstAvailable.score * 0.4 + margin * 0.5,
  );

  const fallbackChain = ranked
    .filter((r) => r.model.id !== selected.id)
    .map((r) => r.model);

  const reason = buildReason({
    intent,
    selected,
    usedFallback,
    topOverall: topOverall.model,
    confidence,
  });

  return {
    intent,
    intentLabel: INTENT_LABEL[intent],
    intentConfidence: cls.confidence,
    intentScores: cls.scores,
    selected,
    reason,
    confidence,
    estLatencyMs,
    estTokens,
    estCredits,
    usedFallback,
    ranked,
    fallbackChain,
  };
}

function buildReason(a: {
  intent: Intent;
  selected: ModelDef;
  usedFallback: boolean;
  topOverall: ModelDef;
  confidence: number;
}): string {
  const label = INTENT_LABEL[a.intent].toLowerCase();
  const tools = a.selected.tools?.length
    ? ` with ${a.selected.tools.join(" + ")}`
    : "";
  if (a.usedFallback) {
    return `Intent classified as ${label}. Primary ${a.topOverall.name} unavailable — failed over to ${a.selected.name}${tools}.`;
  }
  return `Intent classified as ${label}. ${a.selected.name}${tools} is the highest-scoring free model for this task.`;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(0.99, n));
}

export { MODEL_BY_ID };
