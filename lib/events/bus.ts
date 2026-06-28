// NEX·ERA Event Bus — in-process pub/sub with replay + delivery telemetry.
//
// One bus, shared by every module. Hermes and other modules SUBSCRIBE; emitters
// PUBLISH. The bus never orchestrates — it just delivers + records. Persisted on
// globalThis so it survives dev hot-reload (per-instance in serverless).

import "server-only";
import type { EmitInput, EventEnvelope, EventRecord, Subscriber } from "./types";

const RING_MAX = 200;

type BusState = {
  subscribers: Map<string, Subscriber>;
  recent: EventRecord[];
  seq: number;
  defaultsRegistered: boolean;
};

const g = globalThis as unknown as { __nexeraBus?: BusState };
const state: BusState =
  g.__nexeraBus ?? (g.__nexeraBus = { subscribers: new Map(), recent: [], seq: 0, defaultsRegistered: false });

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(state.seq++).toString(36)}`;

export function subscribe(sub: Subscriber): () => void {
  state.subscribers.set(sub.id, sub);
  return () => unsubscribe(sub.id);
}
export function unsubscribe(id: string): void {
  state.subscribers.delete(id);
}
export function getSubscribers(): { id: string; name: string; types: string[] }[] {
  return [...state.subscribers.values()].map((s) => ({ id: s.id, name: s.name, types: s.types ?? ["*"] }));
}

/** Publish an event to all matching subscribers; records delivery telemetry. */
export async function publish<T>(input: EmitInput<T>): Promise<EventRecord> {
  registerDefaults();
  const envelope: EventEnvelope<T> = {
    id: uid("ev"),
    type: input.type,
    at: now(),
    correlationId: input.correlationId ?? uid("corr"),
    source: input.source,
    workspaceId: input.workspaceId ?? null,
    payload: input.payload,
  };

  const started = Date.now();
  const subscribers: string[] = [];
  const errors: { subscriber: string; error: string }[] = [];

  for (const sub of state.subscribers.values()) {
    if (sub.types && !sub.types.includes(input.type)) continue;
    subscribers.push(sub.id);
    try {
      await sub.handle(envelope as EventEnvelope);
    } catch (e) {
      errors.push({ subscriber: sub.id, error: (e as Error).message });
    }
  }

  const record: EventRecord = { envelope: envelope as EventEnvelope, subscribers, processingMs: Date.now() - started, errors };
  state.recent.unshift(record);
  if (state.recent.length > RING_MAX) state.recent.length = RING_MAX;
  return record;
}

/** Convenience emit (fire-and-forget safe). */
export function emit<T>(input: EmitInput<T>): void {
  void publish(input).catch(() => {});
}

/** Replay recent events (newest first), optionally filtered by type. */
export function recentEvents(opts?: { limit?: number; type?: string }): EventRecord[] {
  const list = opts?.type ? state.recent.filter((r) => r.envelope.type === opts.type) : state.recent;
  return list.slice(0, opts?.limit ?? 100);
}

export function eventStats(): { total: number; byType: Record<string, number>; subscribers: number } {
  const byType: Record<string, number> = {};
  for (const r of state.recent) byType[r.envelope.type] = (byType[r.envelope.type] ?? 0) + 1;
  return { total: state.recent.length, byType, subscribers: state.subscribers.size };
}

// ---- default subscribers (observers only — Hermes stays the orchestrator) ----

function registerDefaults(): void {
  if (state.defaultsRegistered) return;
  state.defaultsRegistered = true;

  // Hermes observes every event (for future reactive planning). Observer only.
  subscribe({ id: "hermes", name: "Hermes (observer)", handle: () => {} });

  // Knowledge Layer observes knowledge-relevant events.
  subscribe({
    id: "knowledge",
    name: "Knowledge Layer",
    types: ["KnowledgeUpdated", "ResearchCompleted", "ConsensusUpdated", "FinancialReportAnalyzed", "CommentaryGenerated"],
    handle: () => {},
  });

  // Notifications + Dashboard observers (UI surfaces read the ring buffer).
  subscribe({ id: "notifications", name: "Notifications", handle: () => {} });
  subscribe({ id: "dashboard", name: "Dashboard", handle: () => {} });
  subscribe({ id: "portfolio", name: "Portfolio Intelligence", types: ["PortfolioImported", "OpportunityDiscovered", "ConsensusUpdated"], handle: () => {} });
  subscribe({ id: "investment-hub", name: "Investment Hub", types: ["ScannerFinished", "OpportunityDiscovered", "ConsensusUpdated", "NewsSummarized"], handle: () => {} });
}
