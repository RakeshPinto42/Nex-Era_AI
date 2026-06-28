/**
 * Tool Runtime — generic contracts (Phase 1C).
 *
 * Every agent interacts with the world through Tools. Agents never touch
 * providers/APIs/integrations directly — everything flows through this runtime.
 *
 * This file defines INTERFACES ONLY. No execution, no API calls, no business
 * logic. Built so future built-in tools AND future MCP servers can plug in
 * without changing any agent.
 */

import type { WorkspaceContextSnapshot } from "@/lib/workspace/model";

/** Where a tool comes from. MCP is prepared for, not implemented. */
export type ToolSource = "builtin" | "mcp";

/** Lifecycle/availability of a registered tool. */
export type ToolStatus = "available" | "beta" | "planned" | "deprecated" | "disabled";

export const TOOL_STATUS_META: Record<ToolStatus, { label: string; color: string }> = {
  available: { label: "Available", color: "#10b981" },
  beta: { label: "Beta", color: "#f59e0b" },
  planned: { label: "Planned", color: "#94a3b8" },
  deprecated: { label: "Deprecated", color: "#f97316" },
  disabled: { label: "Disabled", color: "#6b7280" },
};

/**
 * Capability strings are open metadata (a tool may declare any). The known set
 * below is a shared vocabulary for discovery/validation — not a closed enum.
 */
export type ToolCapability = string;

export const KNOWN_CAPABILITIES = [
  "read_file",
  "write_file",
  "list_directory",
  "search",
  "browser_navigation",
  "fetch_market_data",
  "fetch_news",
  "knowledge_lookup",
  "memory_read",
  "memory_write",
  "export_pdf",
  "export_excel",
  "read_spreadsheet",
  "build_dashboard",
  "parse_document",
  "send_notification",
  "tool_use",
] as const;

/**
 * Read-only context passed to a tool at invocation time. Reuses the Workspace
 * Intelligence snapshot + session/agent identity. No mutable handles.
 */
export type ToolRuntimeContext = {
  agentId: string;
  /** Auth/session subject id, if any. */
  sessionId?: string | null;
  workspace?: WorkspaceContextSnapshot | null;
};

/** A request to run one capability of one tool. Shape only — never executed here. */
export type ToolInvocation<TInput = unknown> = {
  toolId: string;
  capability: ToolCapability;
  input: TInput;
  context: ToolRuntimeContext;
};

/** The normalized outcome contract every executor (builtin or MCP) must return. */
export type ToolResult<TOutput = unknown> = {
  ok: boolean;
  output?: TOutput;
  error?: string;
  /** Free-form metadata (timing, provider, cost) — populated by future runtimes. */
  meta?: Record<string, unknown>;
};

/**
 * Executor contract. Phase 1C ships NO implementations — this is the seam every
 * future tool (and MCP bridge) implements so agents stay decoupled.
 */
export interface ToolExecutor<TInput = unknown, TOutput = unknown> {
  readonly toolId: string;
  /** Capabilities this executor can actually run. */
  readonly capabilities: ToolCapability[];
  execute(invocation: ToolInvocation<TInput>): Promise<ToolResult<TOutput>>;
}

/**
 * A source of tools + their executors. Built-in tools and MCP servers both
 * implement this, so the runtime can mix them transparently. No implementation
 * in Phase 1C — interface only.
 */
export interface ToolProvider {
  readonly source: ToolSource;
  readonly id: string;
  /** Tool ids this provider serves. */
  listToolIds(): string[];
  /** Resolve an executor for a tool, or undefined if unsupported. */
  getExecutor(toolId: string): ToolExecutor | undefined;
}

/**
 * Forward-looking MCP server descriptor. Prepared so future MCP servers can be
 * registered as ToolProviders. NOT implemented or connected in Phase 1C.
 */
export interface McpServerDescriptor {
  id: string;
  name: string;
  /** Transport endpoint (stdio command or URL) — unused until MCP lands. */
  endpoint: string;
  transport: "stdio" | "http" | "sse";
  enabled: boolean;
}
