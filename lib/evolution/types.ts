// NEX·ERA Autonomous Evolution Platform — types.
//
// Control plane: observe → propose → classify (Policy) → validate → (gated)
// deploy → measure. It NEVER bypasses Hermes, the Validation Agent or the
// Policy Engine, and never executes destructive git/deploy autonomously —
// HIGH-risk and real deploys are routed to human/CI by design.

export type RiskLevel = "low" | "medium" | "high";

export type EvolutionArea =
  | "ui" | "ux" | "docs" | "performance" | "dead_code" | "duplicate_logic"
  | "architecture" | "api" | "agent" | "tool" | "knowledge" | "events"
  | "ai_routing" | "models" | "security" | "auth" | "hermes" | "tool_runtime"
  | "database" | "trading" | "broker" | "filesystem" | "dependencies"
  | "env" | "ci_cd";

export type ProposalStatus =
  | "proposed" | "validating" | "ready" | "pr_open" | "applied" | "rejected" | "rolled_back";

export type Proposal = {
  id: string;
  title: string;
  area: EvolutionArea;
  detail: string;
  risk: RiskLevel;
  roi: number; // 0..100 estimated benefit
  effort: "S" | "M" | "L";
  status: ProposalStatus;
  evidence: string[];
  createdAt: string;
};

export type ValidationStage = { name: string; status: "pass" | "fail" | "pending" | "skip"; note?: string };

export type PolicyDecision = {
  risk: RiskLevel;
  autoCommit: boolean;
  autoMerge: boolean;
  autoDeploy: boolean;
  action: "auto-deploy" | "open-pr" | "manual-review";
  reason: string;
};

export type HealthScores = {
  platform: number;
  architecture: number;
  security: number;
  technicalDebt: number; // higher = worse
  ai: number;
  agents: number;
  tools: number;
  models: number;
};

export type DeploymentRecord = {
  id: string;
  at: string;
  proposalId: string | null;
  risk: RiskLevel;
  result: "deployed" | "pr_opened" | "manual_required" | "rolled_back" | "failed";
  notes: string;
};

export type EvolutionReport = {
  generatedAt: string;
  health: HealthScores;
  proposals: Proposal[];
  byRisk: Record<RiskLevel, number>;
  summary: string;
};

// ---- Model Intelligence ----

export type BenchmarkCategory =
  | "coding" | "reasoning" | "vision" | "finance" | "research" | "summarization"
  | "translation" | "document" | "investment" | "tool_calling" | "long_context"
  | "speed" | "reliability";

export type ModelRecord = {
  id: string;
  provider: string;
  scores: Partial<Record<BenchmarkCategory, number>>; // 0..100
  lastBenchmarked: string | null;
  deprecated: boolean;
};
