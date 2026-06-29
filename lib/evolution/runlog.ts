import "server-only";

// Self-improve run log — what each agent built, which FREE open-source model
// did it, and the PR it opened. In-memory (globalThis) like the rest of the
// evolution state; the GitHub Action posts entries here (authed) so the live
// site shows real activity. Survives within a server instance.

export type RunEntry = {
  id: string;
  at: string;
  agent: string;
  model: string; // the free open-source model that wrote the change
  summary: string;
  risk: "low" | "medium" | "high";
  files: string[];
  pr?: string | null;
  dryRun?: boolean;
};

type Store = { runs: RunEntry[] };
const g = globalThis as unknown as { __nexeraRunLog?: Store };
const store: Store = g.__nexeraRunLog ?? (g.__nexeraRunLog = { runs: [] });

let seq = 0;

export function addRun(e: Omit<RunEntry, "id" | "at"> & { at?: string }): RunEntry {
  const entry: RunEntry = {
    id: `run-${Date.now().toString(36)}-${(seq++).toString(36)}`,
    at: e.at ?? new Date().toISOString(),
    agent: e.agent,
    model: e.model,
    summary: e.summary,
    risk: e.risk,
    files: e.files ?? [],
    pr: e.pr ?? null,
    dryRun: e.dryRun ?? false,
  };
  store.runs.unshift(entry);
  store.runs = store.runs.slice(0, 100);
  return entry;
}

export function getRuns(): RunEntry[] {
  return store.runs;
}
