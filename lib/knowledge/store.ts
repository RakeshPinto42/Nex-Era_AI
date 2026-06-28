// NEX·ERA Knowledge Layer — canonical store (single source of truth).
//
// One in-memory index (KV-backable) shared by every module. READS are open to
// any caller; WRITES require an authorized KnowledgeWriter (Hermes-orchestrated
// workflows). No duplicated storage/indexing/metadata.

import "server-only";
import type {
  KnowledgeObject, KnowledgeInput, KnowledgeWriter, Relationship,
  RelationType, KnowledgeType, AIInsight, KnowledgeSearchResult,
} from "./types";

const AUTHORIZED: Set<KnowledgeWriter> = new Set([
  "hermes", "market", "finance", "commentary", "file", "research", "system", "admin",
]);

export function isAuthorizedWriter(w: string): w is KnowledgeWriter {
  return AUTHORIZED.has(w as KnowledgeWriter);
}

// Canonical store. (Per-instance; swap for Upstash/KV via lib/llm/kv with the
// same interface for cross-instance persistence — no other module changes.)
const store = new Map<string, KnowledgeObject>();

let seq = 0;
const now = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const uniq = <T,>(a: T[]) => [...new Set(a)];

function assertWriter(writer: string): asserts writer is KnowledgeWriter {
  if (!isAuthorizedWriter(writer)) {
    throw new Error(`Unauthorized knowledge writer: ${writer}`);
  }
}

// ---- writes (authorized only) ----

/** Create or merge a Knowledge Object. Appends timeline + dedupes relationships/tags/insights. */
export function upsertKnowledge(writer: string, input: KnowledgeInput): KnowledgeObject {
  assertWriter(writer);
  const existing = store.get(input.id);
  const ts = now();

  const relationships = mergeRelationships(existing?.relationships ?? [], input.relationships ?? []);
  const timeline = [...(existing?.timeline ?? [])];
  if (input.event) {
    timeline.unshift({ id: uid("tl"), at: ts, kind: input.event.kind, detail: input.event.detail });
  } else if (!existing) {
    timeline.unshift({ id: uid("tl"), at: ts, kind: "created", detail: `Created via ${writer}` });
  }

  const obj: KnowledgeObject = {
    id: input.id,
    type: input.type,
    title: input.title,
    summary: input.summary ?? existing?.summary ?? "",
    tags: uniq([...(existing?.tags ?? []), ...(input.tags ?? [])]),
    relationships,
    timeline: timeline.slice(0, 100),
    sources: dedupeSources([...(existing?.sources ?? []), ...(input.sources ?? [])]),
    confidence: input.confidence ?? existing?.confidence ?? 0.5,
    createdAt: existing?.createdAt ?? ts,
    lastUpdated: ts,
    owner: input.owner ?? existing?.owner ?? writer,
    permissions: {
      owner: input.permissions?.owner ?? existing?.permissions.owner ?? input.owner ?? writer,
      visibility: input.permissions?.visibility ?? existing?.permissions.visibility ?? "shared",
      readers: input.permissions?.readers ?? existing?.permissions.readers,
    },
    relatedObjects: uniq([...(existing?.relatedObjects ?? []), ...relationships.map((r) => r.targetId)]),
    aiInsights: [...(existing?.aiInsights ?? []), ...(input.aiInsights ?? [])].slice(-50),
  };
  store.set(obj.id, obj);
  return obj;
}

/** Add a relationship (and the inverse convenience link). */
export function linkKnowledge(writer: string, fromId: string, type: RelationType, toId: string, toTitle?: string): void {
  assertWriter(writer);
  const from = store.get(fromId);
  if (!from) throw new Error(`Unknown knowledge object: ${fromId}`);
  from.relationships = mergeRelationships(from.relationships, [{ type, targetId: toId, targetTitle: toTitle }]);
  from.relatedObjects = uniq([...from.relatedObjects, toId]);
  from.lastUpdated = now();
  from.timeline.unshift({ id: uid("tl"), at: now(), kind: "linked", detail: `${type} → ${toTitle ?? toId}` });
  store.set(fromId, from);
}

/** Append an AI insight (attributed to the producing agent). */
export function addInsight(writer: string, id: string, insight: Omit<AIInsight, "at">): void {
  assertWriter(writer);
  const o = store.get(id);
  if (!o) throw new Error(`Unknown knowledge object: ${id}`);
  o.aiInsights.push({ ...insight, at: now() });
  o.aiInsights = o.aiInsights.slice(-50);
  o.lastUpdated = now();
  o.timeline.unshift({ id: uid("tl"), at: now(), kind: "insight_added", detail: `${insight.by}: ${insight.text.slice(0, 80)}` });
  store.set(id, o);
}

// ---- reads (open) ----

export function getKnowledge(id: string): KnowledgeObject | undefined {
  return store.get(id);
}

export function listKnowledge(filter?: { type?: KnowledgeType }): KnowledgeObject[] {
  const all = [...store.values()];
  const f = filter?.type ? all.filter((o) => o.type === filter.type) : all;
  return f.sort((a, b) => +new Date(b.lastUpdated) - +new Date(a.lastUpdated));
}

export function relatedTo(id: string): KnowledgeObject[] {
  const o = store.get(id);
  if (!o) return [];
  return o.relatedObjects.map((rid) => store.get(rid)).filter((x): x is KnowledgeObject => !!x);
}

/** Cross-domain text search over title/summary/tags/type. Single index. */
export function searchKnowledge(query: string, opts?: { type?: KnowledgeType; limit?: number }): KnowledgeSearchResult[] {
  const q = query.trim().toLowerCase();
  const limit = opts?.limit ?? 30;
  const pool = opts?.type ? listKnowledge({ type: opts.type }) : listKnowledge();
  if (!q) return pool.slice(0, limit).map((object) => ({ object, score: 0 }));

  const scored: KnowledgeSearchResult[] = [];
  for (const o of pool) {
    let score = 0;
    if (o.title.toLowerCase().includes(q)) score += 5;
    if (o.type.includes(q)) score += 2;
    if (o.tags.some((t) => t.toLowerCase().includes(q))) score += 3;
    if (o.summary.toLowerCase().includes(q)) score += 2;
    if (o.aiInsights.some((i) => i.text.toLowerCase().includes(q))) score += 1;
    if (score > 0) scored.push({ object: o, score });
  }
  return scored.sort((a, b) => b.score - a.score || +new Date(b.object.lastUpdated) - +new Date(a.object.lastUpdated)).slice(0, limit);
}

export function knowledgeStats(): { total: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {};
  for (const o of store.values()) byType[o.type] = (byType[o.type] ?? 0) + 1;
  return { total: store.size, byType };
}

// ---- helpers ----

function mergeRelationships(a: Relationship[], b: Relationship[]): Relationship[] {
  const map = new Map<string, Relationship>();
  for (const r of [...a, ...b]) map.set(`${r.type}:${r.targetId}`, r);
  return [...map.values()];
}
function dedupeSources<T extends { url?: string; title: string }>(arr: T[]): T[] {
  const map = new Map<string, T>();
  for (const s of arr) map.set(s.url ?? s.title, s);
  return [...map.values()];
}
