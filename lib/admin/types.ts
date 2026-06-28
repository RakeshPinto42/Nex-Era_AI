// Admin Intelligence Center — shared types + constants (client-safe, no
// server-only). The aggregation logic lives in ./reports (server-only).

import type { HealthScores } from "@/lib/evolution/types";

export const REPORT_CATEGORIES = [
  "Platform Evolution", "Security", "Performance", "Architecture", "AI Models",
  "Providers", "MCP Servers", "Agents", "Tools", "Knowledge Layer", "Finance OS",
  "Investment Hub", "Coding Runtime", "Deployment", "Technical Debt", "Bug Reports",
  "Feature Suggestions", "Future Ideas",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export type Priority = "critical" | "high" | "medium" | "low";

export type AdminReport = {
  id: string;
  category: ReportCategory;
  summary: string;
  priority: Priority;
  confidence: number;
  roi: number;
  devTime: string;
  affected: string[];
  dependencies: string[];
  risk: "low" | "medium" | "high";
  recommendation: string;
  nextAction: string;
};

export type AdminAction = {
  id: string;
  title: string;
  reason: string;
  priority: Priority;
  estTime: string;
  benefit: string;
  status: "awaiting_admin" | "available" | "approved" | "done";
  href: string;
};

export type ProviderDiscovery = { id: string; name: string; envVar: string; connected: boolean; freeModels: string; reason: string };
export type McpDiscovery = { id: string; name: string; purpose: string; benefits: string; complexity: "low" | "medium" | "high"; install: string; status: string };

export type AdminIntel = {
  generatedAt: string;
  health: HealthScores;
  reports: AdminReport[];
  actions: AdminAction[];
  providers: ProviderDiscovery[];
  mcp: McpDiscovery[];
  models: { id: string; provider: string; scored: number; deprecated: boolean }[];
  daily: { summary: string; top10: string[]; completed: number; pending: number };
};
