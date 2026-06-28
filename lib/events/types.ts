/**
 * NEX·ERA Event Bus — types.
 *
 * The internal event system that connects every module. NOT an agent, NOT a
 * message queue, NOT a second orchestrator — Hermes still orchestrates; the bus
 * lets modules observe + react. Typed envelopes with correlation, source,
 * workspace and timestamps.
 */

export type EventType =
  | "KnowledgeUpdated"
  | "ResearchCompleted"
  | "PortfolioImported"
  | "ScannerFinished"
  | "ConsensusUpdated"
  | "OpportunityDiscovered"
  | "NewsSummarized"
  | "FinancialReportAnalyzed"
  | "CommentaryGenerated"
  | "WorkspaceCreated"
  | "BrokerConnected"
  | "StrategyExecuted"
  | "AgentCompleted";

export const EVENT_TYPES: EventType[] = [
  "KnowledgeUpdated", "ResearchCompleted", "PortfolioImported", "ScannerFinished",
  "ConsensusUpdated", "OpportunityDiscovered", "NewsSummarized", "FinancialReportAnalyzed",
  "CommentaryGenerated", "WorkspaceCreated", "BrokerConnected", "StrategyExecuted", "AgentCompleted",
];

/** A published event. payload is typed per-emit by the caller. */
export type EventEnvelope<T = unknown> = {
  id: string;
  type: EventType;
  at: string; // ISO
  correlationId: string;
  /** Originating agent / module id (e.g. "market", "scanner", "knowledge"). */
  source: string;
  workspaceId: string | null;
  payload: T;
};

export type EventHandler = (env: EventEnvelope) => void | Promise<void>;

export type Subscriber = {
  id: string;
  name: string;
  /** Event types this subscriber wants; omit for all. */
  types?: EventType[];
  handle: EventHandler;
};

/** What the monitor sees: the envelope + delivery telemetry. */
export type EventRecord = {
  envelope: EventEnvelope;
  subscribers: string[];
  processingMs: number;
  errors: { subscriber: string; error: string }[];
};

export type EmitInput<T = unknown> = {
  type: EventType;
  source: string;
  payload: T;
  correlationId?: string;
  workspaceId?: string | null;
};
