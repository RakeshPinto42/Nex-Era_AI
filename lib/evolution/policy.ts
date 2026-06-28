// Evolution Policy Engine — the deployment gate. Classifies a change area into
// a risk level and the actions allowed. HIGH-risk areas are NEVER auto-deployed;
// real git/deploy is always routed to human/CI. The Evolution Director must call
// this — it never bypasses the Policy Engine.

import type { EvolutionArea, RiskLevel, PolicyDecision } from "./types";

// Areas that may never auto-deploy (must be human-reviewed).
const HIGH_RISK: EvolutionArea[] = [
  "security", "auth", "hermes", "tool_runtime", "database", "trading", "broker",
  "filesystem", "dependencies", "env", "ci_cd",
];

// Areas safe to automate when validation passes.
const LOW_RISK: EvolutionArea[] = ["ui", "ux", "docs", "performance", "dead_code", "duplicate_logic"];

export function classifyArea(area: EvolutionArea): RiskLevel {
  if (HIGH_RISK.includes(area)) return "high";
  if (LOW_RISK.includes(area)) return "low";
  return "medium"; // architecture, api, agent, tool, knowledge, events, ai_routing, models
}

/** The policy decision for a risk level. */
export function decide(risk: RiskLevel): PolicyDecision {
  switch (risk) {
    case "low":
      return {
        risk, autoCommit: true, autoMerge: true, autoDeploy: true, action: "auto-deploy",
        reason: "Low-risk: auto commit → push → merge → deploy → health-check (via CI), then update Knowledge + publish events.",
      };
    case "medium":
      return {
        risk, autoCommit: true, autoMerge: false, autoDeploy: false, action: "open-pr",
        reason: "Medium-risk: generate patch + open a Pull Request, queue for review.",
      };
    case "high":
    default:
      return {
        risk, autoCommit: false, autoMerge: false, autoDeploy: false, action: "manual-review",
        reason: "High-risk: never deploy automatically — requires explicit human approval.",
      };
  }
}
