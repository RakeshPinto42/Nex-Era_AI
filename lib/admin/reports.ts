// NEX·ERA Admin Intelligence Center — aggregation.
//
// Pulls findings from the Evolution Director, registries, model store and known
// catalogs into categorized Administrator Reports + Administrator Actions + a
// daily executive report. Stores in the Knowledge Layer, publishes events.
// Never exposes secrets; never auto-connects providers / creates accounts / keys.

import "server-only";
import { getReport, runCycle, getDeployments } from "@/lib/evolution/director";
import { listModels } from "@/lib/evolution/models";
import { upsertKnowledge } from "@/lib/knowledge/store";
import { emit } from "@/lib/events/bus";
import type { EvolutionArea, Proposal } from "@/lib/evolution/types";
import type { ReportCategory, Priority, AdminReport, AdminAction, ProviderDiscovery, McpDiscovery, AdminIntel } from "./types";

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

// Known free/low-cost providers (env var = how a key is supplied). We only
// REPORT; the admin connects manually.
const PROVIDER_CATALOG: { id: string; name: string; envVar: string; freeModels: string; reason: string }[] = [
  { id: "openrouter", name: "OpenRouter", envVar: "OPENROUTER_API_KEY", freeModels: "many free models", reason: "Primary free-model gateway." },
  { id: "zenmux", name: "ZenMux", envVar: "ZENMUX_API_KEY", freeModels: "routed models", reason: "Secondary router." },
  { id: "together", name: "Together AI", envVar: "TOGETHER_API_KEY", freeModels: "free FLUX + LLMs", reason: "Free image + chat models." },
  { id: "groq", name: "Groq", envVar: "GROQ_API_KEY", freeModels: "fast free LLMs", reason: "Very low latency inference." },
  { id: "huggingface", name: "Hugging Face", envVar: "HF_TOKEN", freeModels: "Inference API models", reason: "Free image/text inference." },
  { id: "replicate", name: "Replicate", envVar: "REPLICATE_API_TOKEN", freeModels: "video + image", reason: "Enables text-to-video." },
];

const MCP_CATALOG: McpDiscovery[] = [
  { id: "github", name: "GitHub MCP", purpose: "Repo/PR/issue access", benefits: "Code-aware agents, PR automation", complexity: "low", install: "Add GitHub MCP server + token", status: "available" },
  { id: "docker", name: "Docker MCP", purpose: "Container control", benefits: "Build/run/inspect containers", complexity: "medium", install: "Add Docker MCP server", status: "available" },
  { id: "slack", name: "Slack MCP", purpose: "Messaging", benefits: "Notifications + ops chat", complexity: "low", install: "Add Slack MCP + bot token", status: "available" },
  { id: "filesystem", name: "Filesystem MCP", purpose: "Local FS", benefits: "Server-side file ops (gated)", complexity: "medium", install: "Add FS MCP (sandboxed)", status: "available" },
  { id: "powerbi", name: "Power BI MCP", purpose: "BI datasets", benefits: "Finance OS dashboards", complexity: "high", install: "Add Power BI MCP + auth", status: "available" },
];

function areaToCategory(area: EvolutionArea): ReportCategory {
  const map: Partial<Record<EvolutionArea, ReportCategory>> = {
    security: "Security", auth: "Security", performance: "Performance", architecture: "Architecture",
    api: "Architecture", agent: "Agents", tool: "Tools", tool_runtime: "Tools", knowledge: "Knowledge Layer",
    events: "Platform Evolution", ai_routing: "AI Models", models: "AI Models", ui: "Feature Suggestions",
    ux: "Feature Suggestions", docs: "Future Ideas", dead_code: "Technical Debt", duplicate_logic: "Technical Debt",
    database: "Finance OS", trading: "Investment Hub", broker: "Investment Hub", filesystem: "Coding Runtime",
    dependencies: "Technical Debt", env: "Security", ci_cd: "Deployment",
  };
  return map[area] ?? "Platform Evolution";
}

function priorityFrom(p: Proposal): Priority {
  if (p.risk === "high") return "high";
  if (p.roi >= 60) return "high";
  if (p.roi >= 40) return "medium";
  return "low";
}
const devTimeFrom = (e: Proposal["effort"]) => (e === "S" ? "~0.5 day" : e === "M" ? "1–3 days" : "1+ week");

export function buildAdminIntel(): AdminIntel {
  const report = getReport() ?? runCycle();

  const reports: AdminReport[] = report.proposals.map((p) => ({
    id: uid("rep"),
    category: areaToCategory(p.area),
    summary: `${p.title} — ${p.detail}`,
    priority: priorityFrom(p),
    confidence: report.health.platform / 100,
    roi: p.roi,
    devTime: devTimeFrom(p.effort),
    affected: p.evidence,
    dependencies: [],
    risk: p.risk,
    recommendation: p.risk === "high" ? "Human review before any change." : p.risk === "medium" ? "Generate patch + open PR." : "Eligible for automated low-risk pipeline.",
    nextAction: p.area === "models" ? "Benchmark models in Evolution → Models." : p.risk === "high" ? "Open a reviewed PR." : "Queue in the Evolution improvement pipeline.",
  }));

  // Security summary (resolved vs open — from the audit, no secrets).
  reports.push({
    id: uid("rep"), category: "Security",
    summary: "Resolved: default-admin (F-01), uploads (F-04), rate-limiting (F-05), link XSS (F-06), headers (F-07), CSV injection (F-10). Open: SSRF (F-02), xlsx CVE (F-03), prompt-injection isolation (F-08), KV-backed limits (F-09).",
    priority: "high", confidence: 0.9, roi: 70, devTime: "2–4 days",
    affected: ["app/api/research", "package.json (xlsx)", "lib/agents/*/analyze.ts"], dependencies: ["xlsx upgrade"],
    risk: "high", recommendation: "Close F-02/F-03 next; isolate untrusted prompt content.", nextAction: "Review Security Report.",
  });

  // Deployment summary (from Evolution deployment records).
  const deps = getDeployments();
  if (deps.length) {
    reports.push({
      id: uid("rep"), category: "Deployment",
      summary: `${deps.length} recent policy-routed actions. Latest: ${deps[0].result.replace(/_/g, " ")} (${deps[0].risk} risk).`,
      priority: "medium", confidence: 0.8, roi: 30, devTime: "n/a", affected: [], dependencies: [],
      risk: "low", recommendation: "Wire low-risk auto-deploy to CI; keep high-risk manual.", nextAction: "Review Deployment history.",
    });
  }

  // Provider discovery → actions for missing keys.
  const providers: ProviderDiscovery[] = PROVIDER_CATALOG.map((p) => ({ ...p, connected: !!process.env[p.envVar] }));
  const actions: AdminAction[] = [];
  for (const p of providers.filter((x) => !x.connected)) {
    actions.push({
      id: uid("act"), title: `Connect ${p.name}`, reason: `${p.reason} (${p.freeModels})`,
      priority: p.id === "together" || p.id === "groq" ? "medium" : "low", estTime: "~2 minutes",
      benefit: "More free models for the AI Router", status: "awaiting_admin", href: "/admin",
    });
  }
  // High-risk proposals → approval actions.
  for (const p of report.proposals.filter((x) => x.risk === "high")) {
    actions.push({ id: uid("act"), title: `Review: ${p.title}`, reason: p.detail, priority: "high", estTime: "review", benefit: `ROI ${p.roi}`, status: "awaiting_admin", href: "/dashboard/evolution" });
  }
  // MCP installs.
  for (const m of MCP_CATALOG.slice(0, 3)) {
    actions.push({ id: uid("act"), title: `Install ${m.name}`, reason: m.purpose, priority: "low", estTime: "~5 minutes", benefit: m.benefits, status: "available", href: "/admin" });
  }

  const models = listModels().map((m) => ({ id: m.id, provider: m.provider, scored: Object.keys(m.scores).length, deprecated: m.deprecated }));

  const completed = report.proposals.filter((p) => p.status === "applied").length;
  const pending = report.proposals.length - completed;
  const top10 = [
    ...actions.filter((a) => a.priority === "high").map((a) => a.title),
    ...reports.filter((r) => r.priority === "high").map((r) => r.summary.slice(0, 80)),
  ].slice(0, 10);

  const intel: AdminIntel = {
    generatedAt: new Date().toISOString(),
    health: report.health,
    reports, actions, providers, mcp: MCP_CATALOG, models,
    daily: {
      summary: `Platform ${report.health.platform}/100 · ${reports.length} reports · ${actions.length} admin actions · ${providers.filter((p) => !p.connected).length} providers awaiting connection.`,
      top10, completed, pending,
    },
  };

  // Persist + publish (best-effort).
  try {
    upsertKnowledge("system", {
      id: "admin:daily-report", type: "agent_run", title: "Admin Daily Executive Report",
      summary: intel.daily.summary, tags: ["admin", "executive"], confidence: 0.85, owner: "system",
      event: { kind: "admin_report", detail: intel.daily.summary },
    });
  } catch { /* */ }
  emit({ type: "AgentCompleted", source: "admin-intel", payload: { reports: reports.length, actions: actions.length } });

  return intel;
}
