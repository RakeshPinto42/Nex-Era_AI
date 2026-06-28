// Model Intelligence Engine — benchmark store + ranking. Open-source models are
// the fuel: discover, benchmark, rank, deprecate. Never hardcode a preferred
// model — the AI Router consumes ranking() per capability. (Live benchmarking
// runs are a follow-up; this is the store + ranking the Router reads.)

import "server-only";
import type { BenchmarkCategory, ModelRecord } from "./types";

export const BENCHMARK_CATEGORIES: BenchmarkCategory[] = [
  "coding", "reasoning", "vision", "finance", "research", "summarization",
  "translation", "document", "investment", "tool_calling", "long_context", "speed", "reliability",
];

type State = { models: Map<string, ModelRecord> };
const g = globalThis as unknown as { __nexeraModels?: State };
const state: State = g.__nexeraModels ?? (g.__nexeraModels = { models: new Map() });

/** Register a discovered model (no scores yet). */
export function registerModel(id: string, provider: string): ModelRecord {
  const existing = state.models.get(id);
  if (existing) return existing;
  const rec: ModelRecord = { id, provider, scores: {}, lastBenchmarked: null, deprecated: false };
  state.models.set(id, rec);
  return rec;
}

/** Record a benchmark score (0..100) for a model + capability. */
export function recordBenchmark(id: string, provider: string, category: BenchmarkCategory, score: number): void {
  const rec = registerModel(id, provider);
  rec.scores[category] = Math.max(0, Math.min(100, score));
  rec.lastBenchmarked = new Date().toISOString();
}

export function deprecateModel(id: string, deprecated = true): void {
  const rec = state.models.get(id);
  if (rec) rec.deprecated = deprecated;
}

export function listModels(): ModelRecord[] {
  return [...state.models.values()];
}

/** Ranking for a capability — the AI Router consumes this (never hardcoded). */
export function ranking(category: BenchmarkCategory): { id: string; provider: string; score: number }[] {
  return [...state.models.values()]
    .filter((m) => !m.deprecated && m.scores[category] != null)
    .map((m) => ({ id: m.id, provider: m.provider, score: m.scores[category]! }))
    .sort((a, b) => b.score - a.score);
}

export function modelHealth(): number {
  const all = [...state.models.values()];
  if (all.length === 0) return 50;
  const benchmarked = all.filter((m) => m.lastBenchmarked).length;
  return Math.round((benchmarked / all.length) * 100);
}
