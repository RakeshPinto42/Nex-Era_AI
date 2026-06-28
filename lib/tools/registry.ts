/**
 * Tool Runtime — centralized Tool Registry (Phase 1C).
 *
 * Single source of truth for every tool on the platform. Tools register
 * METADATA ONLY — no execution logic, no API calls, no business logic.
 *
 * Each tool declares which agents may use it (by Agent Registry id) and which
 * workspace types it applies to (by Workspace model type). Built so future MCP
 * tools register here too without touching agents.
 */

import type { ToolStatus, ToolCapability, ToolSource } from "./runtime";
import type { WorkspaceType } from "@/lib/workspace/model";

export type ToolCategory =
  | "Filesystem"
  | "Finance"
  | "Research"
  | "Knowledge"
  | "Browser"
  | "Markets"
  | "Learning"
  | "Developer"
  | "Communication"
  | "Export"
  | "System";

export const TOOL_CATEGORIES: ToolCategory[] = [
  "Filesystem",
  "Finance",
  "Research",
  "Knowledge",
  "Browser",
  "Markets",
  "Learning",
  "Developer",
  "Communication",
  "Export",
  "System",
];

/** Every workspace type — for tools that apply universally. */
const ALL_WORKSPACES: WorkspaceType[] = [
  "code",
  "finance",
  "research",
  "learning",
  "documents",
  "unknown",
];

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  /** Emoji glyph — dependency-free, like the Agent Registry. */
  icon: string;
  category: ToolCategory;
  capabilities: ToolCapability[];
  /** Agent Registry ids permitted to use this tool. */
  supportedAgents: string[];
  /** Workspace model types this tool applies to. */
  supportedWorkspaces: WorkspaceType[];
  status: ToolStatus;
  version: string;
  source: ToolSource;
};

/**
 * Foundation tools — REGISTERED ONLY. No executors, no execution in Phase 1C.
 * Agents reference these via the Tool Runtime; they never call providers direct.
 */
export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    id: "filesystem",
    name: "Filesystem Tool",
    description: "Read directories and files within the active workspace.",
    icon: "📁",
    category: "Filesystem",
    capabilities: ["read_file", "list_directory", "write_file"],
    supportedAgents: ["file", "workspace", "coding", "hermes"],
    supportedWorkspaces: ALL_WORKSPACES,
    status: "beta",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "search",
    name: "Search Tool",
    description: "Web and source search for grounded retrieval.",
    icon: "🔍",
    category: "Research",
    capabilities: ["search"],
    supportedAgents: ["research", "knowledge", "market"],
    supportedWorkspaces: ALL_WORKSPACES,
    status: "beta",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "browser",
    name: "Browser Tool",
    description: "Navigate and read web pages.",
    icon: "🌐",
    category: "Browser",
    capabilities: ["browser_navigation"],
    supportedAgents: ["research", "coding", "hermes"],
    supportedWorkspaces: ALL_WORKSPACES,
    status: "planned",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "knowledge",
    name: "Knowledge Tool",
    description: "Look up and index the knowledge base.",
    icon: "📚",
    category: "Knowledge",
    capabilities: ["knowledge_lookup"],
    supportedAgents: ["knowledge", "research", "memory"],
    supportedWorkspaces: ALL_WORKSPACES,
    status: "planned",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "memory",
    name: "Memory Tool",
    description: "Read and write long-term memory across sessions.",
    icon: "🧠",
    category: "Knowledge",
    capabilities: ["memory_read", "memory_write"],
    supportedAgents: ["memory", "hermes", "research"],
    supportedWorkspaces: ALL_WORKSPACES,
    status: "planned",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "export",
    name: "Export Tool",
    description: "Render results into shareable documents.",
    icon: "📤",
    category: "Export",
    capabilities: ["export_pdf"],
    supportedAgents: ["export", "finance", "research", "commentary"],
    supportedWorkspaces: ALL_WORKSPACES,
    status: "beta",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "excel",
    name: "Excel Tool",
    description: "Read spreadsheets and export Excel workbooks.",
    icon: "📗",
    category: "Export",
    capabilities: ["read_spreadsheet", "export_excel"],
    supportedAgents: ["finance", "workspace", "coding", "analytics"],
    supportedWorkspaces: ["finance", "documents", "code"],
    status: "planned",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "powerbi",
    name: "Power BI Tool",
    description: "Build and publish analytical dashboards.",
    icon: "📊",
    category: "Finance",
    capabilities: ["build_dashboard"],
    supportedAgents: ["finance", "analytics"],
    supportedWorkspaces: ["finance"],
    status: "planned",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "finance",
    name: "Finance Tool",
    description: "Pricing, forecasting and commission operations.",
    icon: "💹",
    category: "Finance",
    capabilities: ["fetch_market_data", "build_dashboard"],
    supportedAgents: ["finance", "analytics", "commentary"],
    supportedWorkspaces: ["finance"],
    status: "beta",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "document",
    name: "Document Tool",
    description: "Parse and extract text from documents (PDF, docs).",
    icon: "📄",
    category: "Research",
    capabilities: ["parse_document"],
    supportedAgents: ["research", "knowledge", "commentary"],
    supportedWorkspaces: ["documents", "research"],
    status: "planned",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "market-data",
    name: "Market Data Tool",
    description: "Fetch quotes and market data across asset classes.",
    icon: "📈",
    category: "Markets",
    capabilities: ["fetch_market_data"],
    supportedAgents: ["market", "finance", "research"],
    supportedWorkspaces: ["finance"],
    status: "beta",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "news",
    name: "News Tool",
    description: "Fetch market and topical news.",
    icon: "📰",
    category: "Markets",
    capabilities: ["fetch_news"],
    supportedAgents: ["market", "research"],
    supportedWorkspaces: ["finance", "research"],
    status: "beta",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "notification",
    name: "Notification Tool",
    description: "Send notifications and alerts.",
    icon: "🔔",
    category: "Communication",
    capabilities: ["send_notification"],
    supportedAgents: ["hermes", "finance", "market"],
    supportedWorkspaces: ALL_WORKSPACES,
    status: "planned",
    version: "0.1.0",
    source: "builtin",
  },
  {
    id: "mcp",
    name: "Future MCP Tool",
    description: "Generic bridge for future MCP servers to plug in as tools.",
    icon: "🔌",
    category: "System",
    capabilities: ["tool_use"],
    supportedAgents: ["hermes"],
    supportedWorkspaces: ALL_WORKSPACES,
    status: "planned",
    version: "0.1.0",
    source: "mcp",
  },
];

/** Lookup a single tool by id. */
export function getTool(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((t) => t.id === id);
}

/** All tools in a category. */
export function toolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_REGISTRY.filter((t) => t.category === category);
}

/** Tools an agent (by Agent Registry id) is permitted to use. */
export function toolsForAgent(agentId: string): ToolDefinition[] {
  return TOOL_REGISTRY.filter((t) => t.supportedAgents.includes(agentId));
}

/** Tools that apply to a given workspace type. */
export function toolsForWorkspace(type: WorkspaceType): ToolDefinition[] {
  return TOOL_REGISTRY.filter((t) => t.supportedWorkspaces.includes(type));
}

/** Categories that have at least one registered tool, in canonical order. */
export function populatedToolCategories(): ToolCategory[] {
  return TOOL_CATEGORIES.filter((c) => TOOL_REGISTRY.some((t) => t.category === c));
}
