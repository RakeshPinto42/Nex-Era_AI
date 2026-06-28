/**
 * Agent Platform — Agent Registry.
 *
 * The single source of truth for every agent on the platform. Future agents
 * REGISTER here; this file holds metadata only — no business logic, no
 * orchestration, no execution. Mission Control reads from this registry.
 *
 * Phase 1A: foundation agents are registered (declared) but NOT implemented.
 */

import type { RuntimeState, AgentHealth, AgentVisibility } from "./runtime";

export type AgentCategory =
  | "Orchestration"
  | "Workspace"
  | "Knowledge"
  | "Data"
  | "Finance"
  | "Engineering"
  | "Markets"
  | "Tutors";

export const AGENT_CATEGORIES: AgentCategory[] = [
  "Orchestration",
  "Workspace",
  "Knowledge",
  "Data",
  "Finance",
  "Engineering",
  "Markets",
  "Tutors",
];

export type AgentRegistration = {
  id: string;
  name: string;
  /** Emoji glyph — kept dependency-free for the registry. */
  icon: string;
  description: string;
  category: AgentCategory;
  capabilities: string[];
  tools: string[];
  visibility: AgentVisibility;
  version: string;
  health: AgentHealth;
  /** Current runtime lifecycle state (see lib/agents/runtime). */
  status: RuntimeState;
  /** Operator toggle. Disabled agents stay registered but cannot be invoked. */
  enabled: boolean;
  /** ISO timestamp of last activity, or null if never run. No logic yet. */
  lastActivityAt: string | null;
};

/**
 * Foundation agents — REGISTERED ONLY. None are implemented in Phase 1A.
 * Every entry is idle, has never run, and carries declared capabilities/tools
 * so Mission Control and future phases have a stable contract to build on.
 */
export const AGENT_REGISTRY: AgentRegistration[] = [
  {
    id: "hermes",
    name: "Hermes",
    icon: "🪽",
    description: "Top-level orchestrator that routes intent to the right specialist agents.",
    category: "Orchestration",
    capabilities: ["intent-routing", "delegation", "planning"],
    tools: ["agent-router"],
    visibility: "internal",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "workspace",
    name: "Workspace Agent",
    icon: "🗂️",
    description: "Operates within a workspace context — projects, tabs and panels.",
    category: "Workspace",
    capabilities: ["workspace-context", "navigation"],
    tools: ["workspace"],
    visibility: "internal",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "file",
    name: "File Agent",
    icon: "📁",
    description: "Universal document understanding — reads files read-only and prepares structured context for every other agent.",
    category: "Workspace",
    capabilities: ["file-read", "classification", "document-understanding"],
    tools: ["filesystem", "document", "knowledge"],
    visibility: "public",
    version: "1.0.0",
    health: "healthy",
    status: "idle",
    enabled: true,
    lastActivityAt: null,
  },
  {
    id: "research",
    name: "Research Agent",
    icon: "🔍",
    description: "Crawls sources, cites everything and returns grounded briefs.",
    category: "Knowledge",
    capabilities: ["web-search", "summarization", "citation"],
    tools: ["tavily", "extract"],
    visibility: "public",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "knowledge",
    name: "Knowledge Agent",
    icon: "📚",
    description: "Manages the knowledge base and retrieval over saved sources.",
    category: "Knowledge",
    capabilities: ["retrieval", "indexing"],
    tools: ["knowledge-store"],
    visibility: "internal",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "memory",
    name: "Memory Agent",
    icon: "🧠",
    description: "Maintains long-term memory across sessions and agents.",
    category: "Knowledge",
    capabilities: ["recall", "persistence"],
    tools: ["memory-store"],
    visibility: "internal",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "export",
    name: "Export Agent",
    icon: "📤",
    description: "Renders results into shareable artifacts and downloadable formats.",
    category: "Data",
    capabilities: ["export", "formatting"],
    tools: ["exporter"],
    visibility: "internal",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "finance",
    name: "Finance Agent",
    icon: "💹",
    description: "FP&A intelligence layer — reasons over financial data to surface trends, variance drivers and KPI recommendations. Augments Finance OS.",
    category: "Finance",
    capabilities: ["pricing", "forecasting", "kpi", "variance-explain"],
    tools: ["excel", "finance", "export"],
    visibility: "public",
    version: "1.0.0",
    health: "healthy",
    status: "idle",
    enabled: true,
    lastActivityAt: null,
  },
  {
    id: "analytics",
    name: "Analytics Agent",
    icon: "📊",
    description: "Builds KPI dashboards and analytical views from datasets.",
    category: "Finance",
    capabilities: ["kpi", "dashboards", "dax"],
    tools: ["analytics"],
    visibility: "public",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "commentary",
    name: "Commentary Agent",
    icon: "📝",
    description: "Writes narrative financial commentary over results and variances.",
    category: "Finance",
    capabilities: ["narrative", "variance-explain"],
    tools: ["finance-os"],
    visibility: "public",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "coding",
    name: "Coding Agent",
    icon: "⌨️",
    description: "Plans, writes, tests and ships code changes.",
    category: "Engineering",
    capabilities: ["code-gen", "refactor", "test"],
    tools: ["code-agent"],
    visibility: "public",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "market",
    name: "Market Agent",
    icon: "📈",
    description: "Tracks markets, quotes and signals across asset classes.",
    category: "Markets",
    capabilities: ["quotes", "signals", "alerts"],
    tools: ["investments"],
    visibility: "public",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "german-tutor",
    name: "German Tutor Agent",
    icon: "🇩🇪",
    description: "Guides German language learning with lessons and review.",
    category: "Tutors",
    capabilities: ["lessons", "review", "feedback"],
    tools: ["tutor"],
    visibility: "beta",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
  {
    id: "japanese-tutor",
    name: "Japanese Tutor Agent",
    icon: "🇯🇵",
    description: "Guides Japanese language learning with SRS and lessons.",
    category: "Tutors",
    capabilities: ["lessons", "srs", "feedback"],
    tools: ["tutor"],
    visibility: "beta",
    version: "0.1.0",
    health: "unknown",
    status: "idle",
    enabled: false,
    lastActivityAt: null,
  },
];

/** Lookup a single agent by id. */
export function getAgent(id: string): AgentRegistration | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}

/** All agents in a category. */
export function agentsByCategory(category: AgentCategory): AgentRegistration[] {
  return AGENT_REGISTRY.filter((a) => a.category === category);
}

/** Categories that actually have at least one registered agent, in canonical order. */
export function populatedCategories(): AgentCategory[] {
  return AGENT_CATEGORIES.filter((c) => AGENT_REGISTRY.some((a) => a.category === c));
}
