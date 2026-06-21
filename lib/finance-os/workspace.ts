// Save Workspace — bundles a full session for local persistence. Two explicit
// paths only: (a) IndexedDB savedWorkspaces store, (b) export/import a single
// .nexera.json file. NEVER auto-persisted; the user must trigger every save.

import { download } from "@/lib/finance/csv";
import { dbGet, dbList, dbRemove, dbSet } from "./db";
import { uid } from "@/lib/utils";
import type { Dataset, ColumnMapping } from "./types";
import type { AuditRecord } from "./audit";
import type { CommissionPlan, CommissionRunResult } from "./commission/types";

export const WORKSPACE_VERSION = 1;

export type Workspace = {
  id: string;
  name: string;
  savedAt: number;
  version: number;
  datasets: Dataset[];
  mappings: Record<string, ColumnMapping>; // keyed by role or dataset id
  plans: CommissionPlan[];
  filters: Record<string, string[]>; // dashboard slicer selections
  results: CommissionRunResult | null;
  audit: AuditRecord[];
};

export function emptyWorkspace(name = "Untitled workspace"): Workspace {
  return {
    id: uid("ws"),
    name,
    savedAt: 0,
    version: WORKSPACE_VERSION,
    datasets: [],
    mappings: {},
    plans: [],
    filters: {},
    results: null,
    audit: [],
  };
}

// ---- IndexedDB persistence (explicit) ----

export function saveWorkspace(ws: Workspace): Promise<Workspace> {
  const stamped = { ...ws, savedAt: Date.now() };
  return dbSet("savedWorkspaces", stamped);
}

export const listWorkspaces = () => dbList<Workspace>("savedWorkspaces");
export const loadWorkspace = (id: string) => dbGet<Workspace>("savedWorkspaces", id);
export const deleteWorkspace = (id: string) => dbRemove("savedWorkspaces", id);

// ---- local file export / import (explicit) ----

export function exportWorkspaceFile(ws: Workspace): void {
  const safe = ws.name.replace(/[^\w.-]+/g, "_") || "workspace";
  download(`${safe}.nexera.json`, JSON.stringify({ ...ws, savedAt: Date.now() }, null, 2), "application/json");
}

export async function importWorkspaceFile(file: File): Promise<Workspace> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<Workspace>;
  if (!parsed || typeof parsed !== "object" || !("datasets" in parsed)) {
    throw new Error("Not a valid .nexera workspace file");
  }
  return { ...emptyWorkspace(parsed.name), ...parsed, id: parsed.id ?? uid("ws") } as Workspace;
}
