/**
 * NEX·ERA Knowledge Layer — types.
 *
 * The canonical knowledge foundation: every meaningful entity becomes a
 * KnowledgeObject with relationships, a timeline, sources and AI insights.
 * NOT chat memory, NOT a second AI — one shared store every module reads from;
 * only authorized workflows write. No duplicated storage/indexing/metadata.
 */

export type KnowledgeType =
  | "company"
  | "portfolio"
  | "investment_thesis"
  | "financial_report"
  | "workbook"
  | "research_document"
  | "news_event"
  | "strategy"
  | "workspace"
  | "project"
  | "conversation"
  | "uploaded_file"
  | "agent_run"
  | "prompt"
  | "tool_result"
  | "market_event";

export const KNOWLEDGE_TYPES: KnowledgeType[] = [
  "company", "portfolio", "investment_thesis", "financial_report", "workbook",
  "research_document", "news_event", "strategy", "workspace", "project",
  "conversation", "uploaded_file", "agent_run", "prompt", "tool_result", "market_event",
];

export type RelationType =
  | "owns"
  | "competes_with"
  | "held_in"
  | "mentioned_in"
  | "related_to"
  | "referenced_by"
  | "part_of"
  | "produced_by";

export type Relationship = {
  type: RelationType;
  targetId: string;
  targetTitle?: string;
};

export type TimelineEntry = {
  id: string;
  at: string; // ISO
  kind: string; // e.g. "news_added", "thesis_updated", "exposure_changed"
  detail: string;
};

export type KnowledgeSource = { title: string; url?: string; kind: string };

export type Visibility = "private" | "shared" | "public";
export type Permissions = { owner: string; visibility: Visibility; readers?: string[] };

export type AIInsight = {
  text: string;
  by: string; // agent id that produced it (Agent Registry)
  confidence: number; // 0..1
  at: string; // ISO
};

export type KnowledgeObject = {
  id: string;
  type: KnowledgeType;
  title: string;
  summary: string;
  tags: string[];
  relationships: Relationship[];
  timeline: TimelineEntry[];
  sources: KnowledgeSource[];
  confidence: number; // 0..1
  createdAt: string; // ISO
  lastUpdated: string; // ISO
  owner: string;
  permissions: Permissions;
  /** Convenience flat list of related object ids (mirrors relationships + links). */
  relatedObjects: string[];
  aiInsights: AIInsight[];
};

/** Authorized writers — only these workflows may mutate the Knowledge Layer. */
export type KnowledgeWriter =
  | "hermes"
  | "market" // Investment Intelligence Agent
  | "finance"
  | "commentary"
  | "file"
  | "research"
  | "system"
  | "admin";

/** Partial input for an upsert (store fills ids/timestamps/defaults). */
export type KnowledgeInput = {
  id: string;
  type: KnowledgeType;
  title: string;
  summary?: string;
  tags?: string[];
  relationships?: Relationship[];
  sources?: KnowledgeSource[];
  confidence?: number;
  owner?: string;
  permissions?: Partial<Permissions>;
  aiInsights?: AIInsight[];
  /** A timeline entry to append on this write. */
  event?: { kind: string; detail: string };
};

export type KnowledgeSearchResult = { object: KnowledgeObject; score: number };
