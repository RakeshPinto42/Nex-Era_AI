/**
 * Workspace Intelligence — the Workspace abstraction (Phase 1B).
 *
 * Types only. A Workspace represents the current project/folder being worked
 * on. This is the reusable foundation every future workspace (coding, finance,
 * research, learning, documents) builds on. No business logic, no filesystem
 * editing — read-only structural model.
 *
 * Reuses the on-disk tree node shape from lib/workspace/fsStore.
 */

import type { WsTreeNode } from "./fsStore";

export type { WsTreeNode };

/** What kind of project a workspace holds (best-effort, structural guess). */
export type WorkspaceType =
  | "code"
  | "finance"
  | "research"
  | "learning"
  | "documents"
  | "unknown";

/** A single language / file-type tally from structural analysis. */
export type LanguageStat = {
  ext: string;
  label: string;
  count: number;
  bytes: number;
};

/** A file flagged as structurally important (by well-known name). */
export type ImportantFile = {
  path: string;
  reason: string;
};

/** A recently-modified file (sorted newest first). */
export type ChangedFile = {
  path: string;
  modifiedAt: string; // ISO
  bytes: number;
};

/**
 * Structural project summary — computed from the filesystem only.
 * NO LLM involvement. Produced by lib/workspace/summary.
 */
export type WorkspaceSummary = {
  root: string;
  name: string;
  type: WorkspaceType;
  totalFiles: number;
  totalFolders: number;
  totalBytes: number;
  lastModified: string | null; // ISO
  languages: LanguageStat[];
  importantFiles: ImportantFile[];
  recentlyChanged: ChangedFile[];
};

/** Lightweight pointer to a workspace, used for recent/pinned lists. */
export type WorkspaceRef = {
  id: string;
  name: string;
  path: string;
  openedAt: string; // ISO
};

/**
 * The full Workspace object. Most fields are hydrated lazily as discovery and
 * structural analysis complete; everything is read-only in Phase 1B.
 */
export type Workspace = {
  id: string;
  name: string;
  path: string;
  type: WorkspaceType;
  rootFolder: string;
  openedAt: string; // ISO
  files: number; // count (full file list lives in the tree)
  folders: number; // count
  tree: WsTreeNode[];
  metadata: WorkspaceSummary | null;
  /** The folder currently focused inside the workspace (relative path, "" = root). */
  currentFolder: string;
  /** Files the user (or a future agent) has selected (relative paths). */
  selectedFiles: string[];
  recentActivity: WorkspaceActivity[];
};

// ---- Activity (read-only event log) ----

export type WorkspaceActivityType =
  | "workspace-opened"
  | "workspace-changed"
  | "files-selected"
  | "folder-expanded"
  | "context-refreshed";

export type WorkspaceActivity = {
  id: string;
  type: WorkspaceActivityType;
  /** Human-readable description of the event. */
  detail: string;
  at: string; // ISO
};

export const ACTIVITY_LABEL: Record<WorkspaceActivityType, string> = {
  "workspace-opened": "Workspace opened",
  "workspace-changed": "Workspace changed",
  "files-selected": "Files selected",
  "folder-expanded": "Folder expanded",
  "context-refreshed": "Context refreshed",
};

/**
 * Reusable context every future agent can request. This is the shared surface
 * the Workspace Intelligence layer exposes — current workspace, current folder,
 * selected files, metadata and recent changes. No execution.
 */
export type WorkspaceContextSnapshot = {
  workspace: WorkspaceRef | null;
  currentFolder: string;
  selectedFiles: string[];
  metadata: WorkspaceSummary | null;
  recentChanges: ChangedFile[];
};
