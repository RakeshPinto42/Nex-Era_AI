// Evolution Detectors — observe real platform signals (registries, event/
// knowledge stats, model store) and emit improvement Proposals. Read-only
// observation; reuses existing stores, no duplicate runtime.

import "server-only";
import { AGENT_REGISTRY } from "@/lib/agents/registry";
import { isExecutable } from "@/lib/agents/executors";
import { TOOL_REGISTRY } from "@/lib/tools/registry";
import { eventStats } from "@/lib/events/bus";
import { EVENT_TYPES } from "@/lib/events/types";
import { listModels } from "./models";
import { classifyArea } from "./policy";
import type { Proposal, EvolutionArea } from "./types";

let seq = 0;
const uid = () => `prop-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function mk(title: string, area: EvolutionArea, detail: string, roi: number, effort: Proposal["effort"], evidence: string[]): Proposal {
  return { id: uid(), title, area, detail, risk: classifyArea(area), roi, effort, status: "proposed", evidence, createdAt: new Date().toISOString() };
}

export function detectProposals(): Proposal[] {
  const out: Proposal[] = [];

  // Registered-but-not-implemented agents (incomplete features).
  const planned = AGENT_REGISTRY.filter((a) => !isExecutable(a.id));
  if (planned.length) {
    out.push(mk(
      `Implement ${planned.length} registered-but-inactive agents`,
      "agent",
      `Agents registered without an executor: ${planned.map((a) => a.name).join(", ")}.`,
      60, "L", planned.map((a) => `agent:${a.id}`),
    ));
  }

  // Tools still "planned" (incomplete capability surface).
  const plannedTools = TOOL_REGISTRY.filter((t) => t.status === "planned");
  if (plannedTools.length) {
    out.push(mk(
      `Wire ${plannedTools.length} planned tools to executors`,
      "tool",
      `Tools registered as planned: ${plannedTools.map((t) => t.name).join(", ")}.`,
      45, "M", plannedTools.map((t) => `tool:${t.id}`),
    ));
  }

  // Dead events — declared event types never observed in the ring buffer.
  const stats = eventStats();
  const seenTypes = new Set(Object.keys(stats.byType));
  const dead = EVENT_TYPES.filter((t) => !seenTypes.has(t));
  if (dead.length) {
    out.push(mk(
      `${dead.length} declared events never emitted`,
      "events",
      `Event types with no observed emissions yet: ${dead.join(", ")}. Wire emitters or prune.`,
      25, "S", dead,
    ));
  }

  // Models without benchmarks (Model Intelligence gap).
  const models = listModels();
  const unbenchmarked = models.filter((m) => !m.lastBenchmarked);
  if (models.length === 0) {
    out.push(mk("Discover + benchmark models", "models", "No models registered in the Model Intelligence store yet. Run discovery + benchmarking so the AI Router can rank by capability.", 70, "M", []));
  } else if (unbenchmarked.length) {
    out.push(mk(`Benchmark ${unbenchmarked.length} un-scored models`, "models", `Models registered without benchmark scores: ${unbenchmarked.map((m) => m.id).join(", ")}.`, 50, "M", unbenchmarked.map((m) => m.id)));
  }

  // Static recurring hygiene proposals (observability of known debt).
  out.push(mk("Back rate-limit/quota/event stores with KV", "performance", "In-memory per-instance stores (throttle, quota, events, knowledge) should move to Upstash/KV for multi-instance correctness.", 55, "M", ["lib/security/throttle.ts", "lib/events/bus.ts", "lib/knowledge/store.ts"]));
  out.push(mk("Add prompt-injection isolation to untrusted content", "security", "Wrap fetched/uploaded content fed to prompts with data/instruction separation (audit AI-1).", 65, "M", ["lib/agents/*/analyze.ts", "app/api/research/route.ts"]));

  return out;
}
