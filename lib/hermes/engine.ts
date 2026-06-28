/**
 * Hermes — Orchestration Engine (Phase 2).
 *
 * The OS scheduler for NEX·ERA. Receives a goal → understands intent → breaks
 * it into tasks → DISCOVERS agents (Agent Registry) and tools (Tool Registry)
 * → declares the AI capabilities each step needs (for the Router) → estimates
 * complexity → returns an observable Execution Plan.
 *
 * Hermes performs NO business logic, NO execution, NO API calls, and NEVER
 * chooses a model. Planning here is deterministic discovery over the registries.
 */

import {
  AGENT_REGISTRY,
  type AgentRegistration,
  type AgentCategory,
} from "@/lib/agents/registry";
import { TOOL_REGISTRY, type ToolDefinition } from "@/lib/tools/registry";
import type { WorkspaceType } from "@/lib/workspace/model";
import type { AICapability } from "./capabilities";
import type {
  ExecutionPlan,
  PlanStep,
  Complexity,
  TimelineEvent,
} from "./plan";

export type HermesContext = {
  workspaceType?: WorkspaceType | null;
};

type Domain =
  | "finance"
  | "markets"
  | "research"
  | "coding"
  | "learning"
  | "workspace"
  | "documents"
  | "files"
  | "general";

type StepSpec = {
  key: string;
  title: string;
  description: string;
  aiCaps: AICapability[];
  /** Preferred agent category for discovery. */
  agentCategory?: AgentCategory;
  /** Agent capability tags to match (Agent Registry capabilities). */
  agentHints: string[];
  /** Tool capabilities this step needs (matched against Tool Registry). */
  toolCaps: string[];
  outputs: string[];
  dependsOn: string[];
};

// ---- intent understanding (keyword heuristic, no LLM) ----

const DOMAIN_KEYWORDS: Record<Exclude<Domain, "general">, string[]> = {
  finance: ["commission", "pricing", "forecast", "margin", "revenue", "p&l", "budget", "variance", "ledger", "financial", "profit"],
  markets: ["invest", "stock", "crypto", "portfolio", "market", "ticker", "equity", "etf", "gold", "shares", "trading"],
  research: ["research", "sources", "cite", "investigate", "summarize", "paper", "find out", "literature"],
  coding: ["code", "refactor", "bug", "implement", "function", "feature", "component", "api", "build app", "debug"],
  learning: ["learn", "tutor", "translate", "german", "japanese", "language", "lesson", "vocabulary", "grammar"],
  workspace: ["folder", "workspace", "codebase", "repo", "project structure", "directory"],
  documents: ["document", "pdf", "report", "contract", "spreadsheet", "excel"],
  files: ["uploaded file", "understand file", "analyze file", "classify file", "these files", "read the file", "document understanding", "parse the file"],
};

function classify(goal: string): Domain {
  const g = goal.toLowerCase();
  let best: Domain = "general";
  let bestScore = 0;
  for (const [domain, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    const score = kws.reduce((n, k) => (g.includes(k) ? n + 1 : n), 0);
    if (score > bestScore) {
      bestScore = score;
      best = domain as Domain;
    }
  }
  return best;
}

const DOMAIN_LABEL: Record<Domain, string> = {
  finance: "Finance operation",
  markets: "Market analysis",
  research: "Research task",
  coding: "Engineering task",
  learning: "Language learning",
  workspace: "Workspace operation",
  documents: "Document processing",
  files: "File understanding",
  general: "General task",
};

// ---- task templates (reusable scaffolding, not business logic) ----

const ANALYZE_BY_DOMAIN: Partial<Record<Domain, StepSpec>> = {
  finance: {
    key: "analyze", title: "Analyze financials",
    description: "Apply financial reasoning to the gathered data.",
    aiCaps: ["financial_reasoning", "structured_output"],
    agentCategory: "Finance", agentHints: ["pricing", "forecasting", "kpi"],
    toolCaps: ["fetch_market_data", "build_dashboard"], outputs: ["analysis"], dependsOn: ["gather"],
  },
  markets: {
    key: "analyze", title: "Analyze markets",
    description: "Evaluate quotes, signals and market context.",
    aiCaps: ["financial_reasoning", "research"],
    agentCategory: "Markets", agentHints: ["quotes", "signals"],
    toolCaps: ["fetch_market_data", "fetch_news"], outputs: ["analysis"], dependsOn: ["gather"],
  },
  research: {
    key: "analyze", title: "Synthesize findings",
    description: "Read and synthesize the gathered sources.",
    aiCaps: ["research", "long_context", "structured_output"],
    agentCategory: "Knowledge", agentHints: ["summarization", "citation"],
    toolCaps: ["parse_document"], outputs: ["synthesis"], dependsOn: ["gather"],
  },
  coding: {
    key: "analyze", title: "Implement changes",
    description: "Plan and write the code changes.",
    aiCaps: ["coding", "tool_use"],
    agentCategory: "Engineering", agentHints: ["code-gen", "refactor"],
    toolCaps: ["read_file", "write_file"], outputs: ["diff"], dependsOn: ["gather"],
  },
  learning: {
    key: "analyze", title: "Build lesson",
    description: "Generate lesson content and translations.",
    aiCaps: ["translation", "structured_output"],
    agentCategory: "Tutors", agentHints: ["lessons", "review"],
    toolCaps: ["knowledge_lookup"], outputs: ["lesson"], dependsOn: ["gather"],
  },
  workspace: {
    key: "analyze", title: "Analyze workspace",
    description: "Inspect structure and relevant files.",
    aiCaps: ["tool_use", "structured_output"],
    agentCategory: "Workspace", agentHints: ["workspace-context", "classification"],
    toolCaps: ["read_file", "list_directory"], outputs: ["report"], dependsOn: ["gather"],
  },
  documents: {
    key: "analyze", title: "Process documents",
    description: "Parse and extract content from documents.",
    aiCaps: ["long_context", "structured_output"],
    agentCategory: "Knowledge", agentHints: ["retrieval", "indexing"],
    toolCaps: ["parse_document"], outputs: ["extract"], dependsOn: ["gather"],
  },
  files: {
    key: "analyze", title: "Understand files",
    description: "Classify uploaded files and prepare structured context.",
    aiCaps: ["structured_output"],
    agentCategory: "Workspace", agentHints: ["file-read", "classification"],
    toolCaps: ["read_file", "parse_document"], outputs: ["file-context"], dependsOn: ["gather"],
  },
};

function templatesFor(domain: Domain): StepSpec[] {
  const gather: StepSpec = {
    key: "gather", title: "Gather context",
    description: "Collect the inputs and context the goal needs.",
    aiCaps: ["planning"],
    agentCategory: domain === "research" ? "Knowledge" : "Workspace",
    agentHints: ["web-search", "workspace-context", "retrieval"],
    toolCaps: ["search", "read_file", "knowledge_lookup"],
    outputs: ["context"], dependsOn: [],
  };

  const analyze: StepSpec =
    ANALYZE_BY_DOMAIN[domain] ?? {
      key: "analyze", title: "Process task",
      description: "Reason over the gathered context to produce a result.",
      aiCaps: ["planning", "structured_output"],
      agentHints: [],
      toolCaps: ["knowledge_lookup"], outputs: ["result"], dependsOn: ["gather"],
    };

  const deliver: StepSpec = {
    key: "deliver", title: "Produce output",
    description: "Format and deliver the result as an artifact.",
    aiCaps: ["structured_output"],
    agentCategory: "Data", agentHints: ["export", "formatting", "narrative"],
    toolCaps: ["export_pdf", "export_excel"],
    outputs: ["artifact"], dependsOn: ["analyze"],
  };

  return [gather, analyze, deliver];
}

// ---- discovery ----

/** Discover the best agent for a step from the Agent Registry (never hardcoded). */
function discoverAgent(spec: StepSpec): AgentRegistration | null {
  const scored = AGENT_REGISTRY.map((a) => {
    let score = 0;
    if (spec.agentCategory && a.category === spec.agentCategory) score += 3;
    score += spec.agentHints.filter((h) => a.capabilities.includes(h)).length * 2;
    if (a.enabled) score += 1;
    if (a.health === "healthy") score += 1;
    return { a, score };
  }).filter((s) => s.score > 0);

  if (scored.length === 0) return null;
  scored.sort((x, y) => y.score - x.score);
  return scored[0].a;
}

/** Discover compatible tools for a step from the Tool Registry (never hardcoded). */
function discoverTools(
  spec: StepSpec,
  agent: AgentRegistration | null,
  wsType?: WorkspaceType | null,
): ToolDefinition[] {
  const capMatch = (t: ToolDefinition) =>
    t.capabilities.some((c) => spec.toolCaps.includes(c)) && t.status !== "disabled";

  // Prefer tools compatible with the chosen agent + workspace; relax if none.
  const strict = TOOL_REGISTRY.filter(
    (t) =>
      capMatch(t) &&
      (!agent || t.supportedAgents.includes(agent.id)) &&
      (!wsType || t.supportedWorkspaces.includes(wsType)),
  );
  if (strict.length) return strict;
  return TOOL_REGISTRY.filter(capMatch);
}

function estimateComplexity(steps: PlanStep[], agents: string[], tools: string[]): { level: Complexity; score: number } {
  const score = steps.length * 2 + agents.length + tools.length;
  const level: Complexity = score >= 14 ? "high" : score >= 8 ? "medium" : "low";
  return { level, score };
}

// ---- public API ----

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const uniq = <T,>(arr: T[]) => [...new Set(arr)];

/**
 * Plan a goal. Deterministic discovery only — produces an observable
 * ExecutionPlan in the "ready" state. No execution, no API calls, no model
 * selection.
 */
export function planGoal(goal: string, ctx: HermesContext = {}): ExecutionPlan {
  const now = () => new Date().toISOString();
  const timeline: TimelineEvent[] = [];
  const mark = (label: string, detail?: string) =>
    timeline.push({ id: uid("ev"), at: now(), label, detail });

  const cleanGoal = goal.trim();
  const domain = classify(cleanGoal);
  mark("Understand intent", DOMAIN_LABEL[domain]);

  const specs = templatesFor(domain);
  mark("Break into tasks", `${specs.length} steps`);

  const keyToId: Record<string, string> = {};
  const steps: PlanStep[] = specs.map((spec) => {
    const id = uid("step");
    keyToId[spec.key] = id;
    return {
      id, title: spec.title, description: spec.description,
      assignedAgentId: null, assignedAgentName: null,
      requiredTools: [], requiredCapabilities: spec.aiCaps,
      dependencies: [], status: "pending",
      outputs: spec.outputs,
    } satisfies PlanStep;
  });

  // resolve dependencies via key map
  specs.forEach((spec, i) => {
    steps[i].dependencies = spec.dependsOn.map((k) => keyToId[k]).filter(Boolean);
  });

  // agent discovery
  const agentBySpec = specs.map((s) => discoverAgent(s));
  agentBySpec.forEach((agent, i) => {
    steps[i].assignedAgentId = agent?.id ?? null;
    steps[i].assignedAgentName = agent?.name ?? null;
  });
  mark("Discover agents", `${uniq(agentBySpec.filter(Boolean).map((a) => a!.id)).length} agents`);

  // tool discovery
  specs.forEach((spec, i) => {
    const tools = discoverTools(spec, agentBySpec[i], ctx.workspaceType);
    steps[i].requiredTools = tools.map((t) => t.id);
  });
  mark("Discover tools", `${uniq(steps.flatMap((s) => s.requiredTools)).length} tools`);

  const agents = uniq(steps.map((s) => s.assignedAgentId).filter((x): x is string => !!x));
  const tools = uniq(steps.flatMap((s) => s.requiredTools));
  const capabilities = uniq(steps.flatMap((s) => s.requiredCapabilities));

  const { level, score } = estimateComplexity(steps, agents, tools);
  mark("Estimate complexity", `${level} (${score})`);

  // first step(s) with satisfied deps become "ready"
  steps.forEach((s) => {
    if (s.dependencies.length === 0) s.status = "ready";
  });
  mark("Execution plan ready");

  return {
    id: uid("plan"),
    goal: cleanGoal,
    intent: DOMAIN_LABEL[domain],
    summary: `${specs.length}-step ${DOMAIN_LABEL[domain].toLowerCase()} across ${agents.length} agent(s) and ${tools.length} tool(s).`,
    status: "ready",
    complexity: level,
    complexityScore: score,
    steps,
    agents,
    tools,
    capabilities,
    createdAt: now(),
    timeline,
  };
}
