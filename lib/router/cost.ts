// In-memory cost / usage tracker. Free models still accrue compute credits.

import { MODEL_BY_ID } from "./models";

export type UsageRecord = {
  modelId: string;
  requests: number;
  tokens: number;
  credits: number;
};

class CostTracker {
  private usage = new Map<string, UsageRecord>();

  record(modelId: string, tokens: number) {
    const m = MODEL_BY_ID[modelId];
    const credits = m ? (tokens / 1000) * m.creditsPer1k : 0;
    const cur =
      this.usage.get(modelId) ??
      ({ modelId, requests: 0, tokens: 0, credits: 0 } as UsageRecord);
    cur.requests += 1;
    cur.tokens += tokens;
    cur.credits += credits;
    this.usage.set(modelId, cur);
    return credits;
  }

  all(): UsageRecord[] {
    return [...this.usage.values()].sort((a, b) => b.credits - a.credits);
  }

  totals() {
    let requests = 0,
      tokens = 0,
      credits = 0;
    for (const u of this.usage.values()) {
      requests += u.requests;
      tokens += u.tokens;
      credits += u.credits;
    }
    return { requests, tokens, credits };
  }

  reset() {
    this.usage.clear();
  }
}

// Singleton shared across the app.
export const costTracker = new CostTracker();

// Rough token estimate (~4 chars/token).
export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}
