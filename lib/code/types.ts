// NEX Code — local AI coding runtime types. Client-side (File System Access
// API). No server filesystem, no pasted paths, no new Workspace abstraction.

export type CapStatus = "pass" | "fail" | "pending" | "skip";

export type FsStatus = {
  connected: boolean;
  read: CapStatus;
  write: CapStatus;
  create: CapStatus;
  rename: CapStatus;
  delete: CapStatus;
  traversal: CapStatus;
  recursive: CapStatus;
  watcher: CapStatus; // polling-based
  error?: string;
};

export type TreeNode = {
  name: string;
  path: string; // relative to root
  kind: "file" | "dir";
  size?: number;
  ext?: string;
  children?: TreeNode[];
};

export type ProjectInfo = {
  name: string;
  framework: string;
  language: string;
  packageManager: string;
  gitConnected: boolean;
  gitBranch: string | null;
  dependencies: string[];
  scripts: { name: string; cmd: string }[];
  entryPoints: string[];
  configFiles: string[];
  envFiles: string[];
  detectedApis: string[];
  detectedDatabase: string | null;
  detectedAuth: string | null;
  readmeSummary: string;
  totalFiles: number;
  totalFolders: number;
  largestFiles: { path: string; size: number }[];
};

export type IndexStep = {
  label: string;
  status: "running" | "done" | "skip";
};

export type SearchHit = {
  path: string;
  line?: number;
  preview: string;
  kind: "name" | "content";
};

// AI edit plan (from /api/code/agent)
export type PlanFile = { path: string; content: string; action: "create" | "edit" | "delete" };

export type EditPlanView = {
  summary: string;
  notes: string;
  files: PlanFile[];
  deleted: string[];
  risk: "low" | "medium" | "high";
  affected: string[];
};

export type TimelineStep = { label: string; status: "running" | "done" | "error" };
