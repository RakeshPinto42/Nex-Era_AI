// Evolution Director — runs the cycle: observe → propose → classify (Policy) →
// score health → report. Routes every proposal through the Policy Engine; never
// executes destructive git/deploy autonomously (HIGH-risk + real deploys go to
// human/CI). Records deployments, stores reports in the Knowledge Layer, and
// publishes Event Bus events. Hermes stays the orchestrator; Validation Agent +
// Policy Engine stay the gates.

import "server-only";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import { isExecutable } from "@/lib/agents/executors";
import { TOOL_REGISTRY } from "@/lib/tools/registry";
import { upsertKnowledge } from "@/lib/knowledge/store";
import { emit } from "@/lib/events/bus";
import { detectProposals } from "./detectors";
import { decide } from "./policy";
import { modelHealth } from "./models";
import type { EvolutionReport, HealthScores, Proposal, RiskLevel, DeploymentRecord, ValidationStage } from "./types";

type State = { report: EvolutionReport | null; deployments: DeploymentRecord[]; proposals: Map<string, Proposal> };
const g = globalThis as unknown as { __nexeraEvo?: State };
const state: State = g.__nexeraEvo ?? (g.__nexeraEvo = { report: null, deployments: [], proposals: new Map() });

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function computeHealth(proposals: Proposal[]): HealthScores {
  const agentsTotal = AGENT_REGISTRY.length;
  const agentsReal = AGENT_REGISTRY.filter((a) => isExecutable(a.id)).length;
  const toolsTotal = TOOL_REGISTRY.length;
  const toolsAvail = TOOL_REGISTRY.filter((t) => t.status === "available" || t.status === "beta").length;

  const agents = Math.round((agentsReal / Math.max(1, agentsTotal)) * 100);
  const tools = Math.round((toolsAvail / Math.max(1, toolsTotal)) * 100);
  const models = modelHealth();

  const medHigh = proposals.filter((p) => p.risk !== "low").length;
  const technicalDebt = Math.min(100, medHigh * 8);
  const architecture = Math.max(0, 100 - technicalDebt);
  // Security baseline reflects closed audit items (F-01/04/05/06/07/10); open
  // security proposals lower it.
  const openSecurity = proposals.filter((p) => p.area === "security" || p.area === "auth").length;
  const security = Math.max(40, 82 - openSecurity * 6);
  const ai = Math.round((models + agents) / 2);
  const platform = Math.round((agents + tools + models + architecture + security) / 5);

  return { platform, architecture, security, technicalDebt, ai, agents, tools, models };
}

/** Validation pipeline (Validation Agent gate) — staged status for observability. */
export function validationStages(p: Proposal): ValidationStage[] {
  return [
    { name: "Compile", status: "pending" },
    { name: "Tests", status: "pending" },
    { name: "Security", status: p.risk === "high" ? "pending" : "pending" },
    { name: "Performance", status: "pending" },
    { name: "Architecture", status: "pending" },
    { name: "Knowledge consistency", status: "pending" },
    { name: "Policy", status: "pass", note: decide(p.risk).action },
  ];
}

/** Run one evolution cycle. Observation + proposals + policy + health + report. */
export function runCycle(): EvolutionReport {
  const proposals = detectProposals();
  state.proposals.clear();
  for (const p of proposals) state.proposals.set(p.id, p);

  const health = computeHealth(proposals);
  const byRisk: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  for (const p of proposals) byRisk[p.risk]++;

  const report: EvolutionReport = {
    generatedAt: new Date().toISOString(),
    health,
    proposals,
    byRisk,
    summary: `Platform ${health.platform}/100 · ${proposals.length} proposals (${byRisk.low} low / ${byRisk.medium} medium / ${byRisk.high} high) · tech debt ${health.technicalDebt}.`,
  };
  state.report = report;

  // Store the report in the Knowledge Layer (authorized writer "system").
  try {
    upsertKnowledge("system", {
      id: "evolution:latest-report", type: "agent_run", title: "Evolution Report",
      summary: report.summary, tags: ["evolution"], confidence: 0.8, owner: "system",
      event: { kind: "evolution_cycle", detail: report.summary },
    });
  } catch { /* best-effort */ }

  emit({ type: "AgentCompleted", source: "evolution", payload: { proposals: proposals.length, platform: health.platform } });
  return report;
}

/**
 * Route a proposal through the Policy Engine. Records the decision as a
 * DeploymentRecord. Does NOT execute real git/deploy — low-risk = eligible for
 * CI auto-deploy; medium = PR; high = manual. Marked simulated/queued.
 */
export function processProposal(id: string): DeploymentRecord {
  const p = state.proposals.get(id);
  if (!p) throw new Error("Unknown proposal");
  const policy = decide(p.risk);

  let result: DeploymentRecord["result"];
  if (policy.action === "auto-deploy") { result = "deployed"; p.status = "applied"; }
  else if (policy.action === "open-pr") { result = "pr_opened"; p.status = "pr_open"; }
  else { result = "manual_required"; p.status = "ready"; }

  const rec: DeploymentRecord = {
    id: uid("dep"), at: new Date().toISOString(), proposalId: p.id, risk: p.risk, result,
    notes: `${policy.reason} (queued for CI/human — Director does not execute git/deploy directly)`,
  };
  state.deployments.unshift(rec);
  state.deployments = state.deployments.slice(0, 50);
  emit({ type: "AgentCompleted", source: "evolution", payload: { proposal: p.id, action: policy.action, risk: p.risk } });
  return rec;
}

export function getReport(): EvolutionReport | null { return state.report; }
export function getDeployments(): DeploymentRecord[] { return state.deployments; }
export function getProposal(id: string): Proposal | undefined { return state.proposals.get(id); }
