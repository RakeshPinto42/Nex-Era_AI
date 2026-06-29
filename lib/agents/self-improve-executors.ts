import type { AgentExecutor } from "./executor";

// Executors for the self-improving agents. Their heavy lifting — read repo →
// generate code with a free open-source model → open a PR — runs in the daily
// GitHub Action (scripts/self-improve.mjs), which has a writable checkout.
// On-platform, execute() reports status and the goal it would pursue, so the
// agents are first-class (isExecutable) and visible in Mission Control.

function statusExecutor(agentId: string, blurb: string): AgentExecutor {
  return {
    agentId,
    async execute(ctx) {
      return {
        ok: true,
        summary: blurb,
        output: { goal: ctx.input.goal || blurb, pipeline: "self-improve (PR-gated, free open-source models)" },
      };
    },
  };
}

export const factoryExecutor: AgentExecutor = {
  agentId: "factory",
  async execute(ctx) {
    return {
      ok: true,
      summary: "Agent Factory ready. POST a spec to /api/agents/factory to scaffold a new self-improving agent (the robot that builds robots).",
      output: { goal: ctx.input.goal, endpoint: "/api/agents/factory" },
    };
  },
};

export const investmentsImproverExecutor = statusExecutor(
  "investments-improver",
  "Investment Hub Improver — proposes + builds a daily upgrade; ships as a PR for your approval.",
);

export const germanTutorExecutor = statusExecutor(
  "german-tutor",
  "German Tutor — grows the /dashboard/german learning module each cycle; ships as a PR for your approval.",
);
