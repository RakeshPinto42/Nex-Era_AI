// Live routing over the admin-configured models (from /api/models).
// Reuses the keyword intent classifier; scores real models by intent fit.

import { classifyIntent, type IntentScore } from "./intent";
import { INTENT_LABEL, type Intent } from "./models";

export type LiveModel = {
  providerId: string;
  providerName: string;
  model: string;
  label: string;
  intent: string; // coding | reasoning | general | research | vision
  isDefault: boolean;
};

export type ScoredLive = {
  m: LiveModel;
  score: number;
  available: boolean;
};

export type LiveRoute = {
  intent: Intent;
  intentLabel: string;
  intentConfidence: number;
  intentScores: IntentScore[];
  selected: LiveModel | null;
  reason: string;
  confidence: number;
  ranked: ScoredLive[];
  fallbackChain: LiveModel[];
  usedFallback: boolean;
};

function key(m: LiveModel) {
  return `${m.providerId}:${m.model}`;
}

function intentFit(modelIntent: string, top: Intent): number {
  if (modelIntent === top) return 1;
  // images/videos have no chat model — those route to a general model.
  if (modelIntent === "general") return 0.55;
  if (modelIntent === "reasoning" && (top === "research" || top === "general"))
    return 0.5;
  return 0.25;
}

export function routeLive(
  prompt: string,
  models: LiveModel[],
  down: Record<string, boolean> = {},
): LiveRoute {
  const cls = classifyIntent(prompt);
  const top = cls.top;

  const ranked: ScoredLive[] = models
    .map((m) => {
      const fit = intentFit(m.intent, top);
      const score = fit * 0.75 + (m.isDefault ? 0.15 : 0) + 0.05;
      return { m, score: Math.min(1, score), available: !down[key(m)] };
    })
    .sort((a, b) => b.score - a.score);

  const topOverall = ranked[0] ?? null;
  const firstAvailable = ranked.find((r) => r.available) ?? topOverall;
  const selected = firstAvailable?.m ?? null;
  const usedFallback =
    Boolean(topOverall && firstAvailable && topOverall.m !== firstAvailable.m);

  const next = ranked.find((r) => selected && r.m !== selected);
  const margin = (firstAvailable?.score ?? 0) - (next?.score ?? 0);
  const confidence = Math.min(
    0.99,
    cls.confidence * 0.5 + (firstAvailable?.score ?? 0) * 0.4 + margin * 0.5,
  );

  const fallbackChain = ranked
    .filter((r) => selected && r.m !== selected)
    .map((r) => r.m);

  const label = INTENT_LABEL[top].toLowerCase();
  const reason = !selected
    ? "No models configured. Add a provider key in Admin → Providers."
    : usedFallback
      ? `Intent classified as ${label}. Top match unavailable — failed over to ${selected.label} on ${selected.providerName}.`
      : `Intent classified as ${label}. ${selected.label} (${selected.providerName}) is the best configured match.`;

  return {
    intent: top,
    intentLabel: INTENT_LABEL[top],
    intentConfidence: cls.confidence,
    intentScores: cls.scores,
    selected,
    reason,
    confidence,
    ranked,
    fallbackChain,
    usedFallback,
  };
}

export const liveKey = key;
