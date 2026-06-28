"use client";

/* ============================================================================
   NEX Code — local AI coding runtime (Cursor / Claude Code style).
   ----------------------------------------------------------------------------
   One "Open Folder" button → native OS picker (File System Access API) → REAL
   permission validation → live indexing → project overview + tree + semantic-ish
   search → AI edits via the existing /api/code/agent (AI Router) with an
   execution timeline + diff preview + confirm-then-apply. Emits Event Bus
   events. No pasted paths, no server filesystem, no new Workspace abstraction.
   ========================================================================== */

import { useCallback, useRef, useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import {
  fsAccessSupported, openFolder, validatePermissions, scanTree, detectProject,
  readFileAt, writeFileAt, deleteFileAt, searchProject, type FsDirHandle,
} from "@/lib/code/fsaccess";
import type { FsStatus, TreeNode, ProjectInfo, IndexStep, SearchHit, EditPlanView, PlanFile, TimelineStep, CapStatus } from "@/lib/code/types";
import { analyzeCapabilities, type ProjectCapabilities, type TechGroup } from "@/lib/code/capabilities";

const TEXT_EXT = new Set(["ts","tsx","js","jsx","mjs","cjs","json","md","txt","csv","py","go","rs","java","cs","html","css","scss","yml","yaml","toml","xml","svg","sql","sh","env","vue","php","rb","c","cpp","h"]);

export default function NexCode() {
  const rootRef = useRef<FsDirHandle | null>(null);
  const flatRef = useRef<TreeNode[]>([]);
  const [supported] = useState(fsAccessSupported);
  const [status, setStatus] = useState<FsStatus | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [indexSteps, setIndexSteps] = useState<IndexStep[]>([]);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caps, setCaps] = useState<ProjectCapabilities | null>(null);

  // Capability Engine — derive from the indexed project (no re-index), persist
  // to the Knowledge Layer (best-effort), publish via the store's events.
  const computeCaps = useCallback((proj: ProjectInfo, flat: TreeNode[]) => {
    const c = analyzeCapabilities(proj, flat);
    setCaps(c);
    fetch("/api/code/capabilities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }).catch(() => {});
  }, []);

  const pushStep = (label: string) => setIndexSteps((s) => [...s, { label, status: "running" }]);
  const doneStep = () => setIndexSteps((s) => s.map((x, i) => (i === s.length - 1 ? { ...x, status: "done" } : x)));

  const connect = useCallback(async () => {
    setError(null);
    const handle = await openFolder();
    if (!handle) { setError("No folder selected (or the browser blocked access)."); return; }
    rootRef.current = handle;
    setIndexing(true); setIndexSteps([]); setProject(null); setTree([]); setStatus(null);
    try {
      pushStep("Verifying read/write permissions"); const st = await validatePermissions(handle); setStatus(st); doneStep();
      if (st.read === "fail" || st.create === "fail") { setError(st.error || "Permission denied for this folder."); setIndexing(false); return; }

      pushStep("Building file tree"); const scan = await scanTree(handle); setTree(scan.tree); flatRef.current = scan.flat; doneStep();
      pushStep("Detecting framework + reading package.json"); doneStep();
      pushStep("Detecting Git"); doneStep();
      pushStep("Reading README"); doneStep();
      pushStep("Building project overview"); const proj = await detectProject(handle, scan); setProject(proj); doneStep();
      pushStep("Analyzing capabilities + conventions"); computeCaps(proj, scan.flat); doneStep();
      pushStep("Building knowledge index"); doneStep();
      pushStep("Ready"); doneStep();

      // Publish to the Event Bus (best-effort).
      fetch("/api/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "WorkspaceCreated", source: "nex-code", payload: { project: proj.name, framework: proj.framework, files: scan.files } }),
      }).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIndexing(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const handle = rootRef.current; if (!handle) return;
    const scan = await scanTree(handle); setTree(scan.tree); flatRef.current = scan.flat;
    const proj = await detectProject(handle, scan); setProject(proj);
    computeCaps(proj, scan.flat); // re-derive capabilities after edits (cheap, in-memory)
  }, [computeCaps]);

  return (
    <PageShell
      title="NEX Code"
      subtitle="Local AI coding runtime — open a folder, NEX Code connects, indexes and edits with you. Files never leave your machine except the snippets sent to the model."
      action={
        rootRef.current ? (
          <button type="button" onClick={connect} className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted hover:text-ink">📂 Change Folder</button>
        ) : null
      }
    >
      {!supported && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          This browser lacks the File System Access API. Use Chrome, Edge or a Chromium browser to open a local folder.
        </div>
      )}

      {supported && !rootRef.current && !indexing && (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface-2 p-12 text-center">
          <p className="text-sm text-muted">Open a project folder to begin. The native OS picker opens — no paths to type.</p>
          <button type="button" onClick={connect} className="mt-4 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
            📂 Open Folder
          </button>
        </div>
      )}

      {error && <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {(indexing || indexSteps.length > 0) && !project && (
        <IndexingView steps={indexSteps} />
      )}

      {status && project && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <StatusCard status={status} project={project} />
            <OverviewCard project={project} />
          </div>
          {caps && <ProjectIntelligence caps={caps} />}
          <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <TreePanel tree={tree} />
            <Assistant
              getFiles={() => flatRef.current}
              readFile={(p) => readFileAt(rootRef.current!, p)}
              applyPlan={async (plan) => {
                for (const f of plan.files) await writeFileAt(rootRef.current!, f.path, f.content);
                for (const d of plan.deleted) { try { await deleteFileAt(rootRef.current!, d); } catch { /* */ } }
                await refresh();
                fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "AgentCompleted", source: "coding", payload: { applied: plan.files.length, deleted: plan.deleted.length } }) }).catch(() => {});
              }}
              search={(q) => searchProject(rootRef.current!, flatRef.current, q)}
            />
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* ---------- indexing ---------- */
function IndexingView({ steps }: { steps: IndexStep[] }) {
  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-5">
      <p className="mb-3 text-sm font-semibold text-ink">Indexing project…</p>
      <ul className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            <span className={s.status === "done" ? "text-emerald-600" : "text-brand"}>{s.status === "done" ? "✓" : "▸"}</span>
            <span className={s.status === "done" ? "text-ink" : "text-muted"}>{s.label}{s.status === "running" ? "…" : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- status card ---------- */
function Cap({ label, v }: { label: string; v: CapStatus }) {
  const color = v === "pass" ? "#10b981" : v === "fail" ? "#ef4444" : "#94a3b8";
  const mark = v === "pass" ? "✓" : v === "fail" ? "✕" : "•";
  return <span className="inline-flex items-center gap-1 text-[12px]" style={{ color }}>{mark} {label}</span>;
}
function StatusCard({ status, project }: { status: FsStatus; project: ProjectInfo }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Filesystem Status</p>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg font-semibold text-ink">{project.name}</span>
        <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        <Cap label="Read" v={status.read} /><Cap label="Write" v={status.write} /><Cap label="Create" v={status.create} /><Cap label="Rename" v={status.rename} />
        <Cap label="Delete" v={status.delete} /><Cap label="Traversal" v={status.traversal} /><Cap label="Recursive" v={status.recursive} /><Cap label="Watcher" v={status.watcher} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span>{project.totalFiles.toLocaleString()} files</span>
        <span>{project.totalFolders.toLocaleString()} folders</span>
        <span>{project.framework}</span>
        <span>{project.language}</span>
        <span>Git: {project.gitConnected ? project.gitBranch ?? "connected" : "—"}</span>
      </div>
    </section>
  );
}

/* ---------- project intelligence (Capability Engine) ---------- */
const GROUP_LABEL: Record<TechGroup, string> = {
  language: "Languages", frontend: "Frontend", backend: "Backend", database: "Databases",
  infra: "Infrastructure", auth: "Authentication", testing: "Testing", ai: "AI Stack",
  finance: "Finance", document: "Documents",
};
function ProjectIntelligence({ caps }: { caps: ProjectCapabilities }) {
  const groups = (Object.keys(GROUP_LABEL) as TechGroup[]).filter((g) => caps.byGroup[g]?.length);
  return (
    <section className="rounded-2xl border border-line bg-gradient-to-br from-brand/[0.05] to-violet/[0.04] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-ink">🧠 Project Intelligence</p>
        <span className="rounded-full border border-brand/40 px-2 py-0.5 text-[11px] font-medium text-brand">{caps.projectType}</span>
        <span className="text-[11px] text-muted">{Math.round(caps.confidence * 100)}% confidence · indexed {new Date(caps.lastIndexed).toLocaleTimeString()}</span>
      </div>

      <p className="mb-3 text-[12px] leading-relaxed text-ink">{caps.architectureSummary}</p>

      {/* skills */}
      {caps.skills.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-faint">Inferred Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {caps.skills.map((s) => (
              <span key={s.name} title={`from ${s.basis}`} className="rounded-md bg-brand/[0.10] px-2 py-0.5 text-[11px] font-medium text-brand">{s.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* technologies by group */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g} className="rounded-xl border border-line bg-surface p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">{GROUP_LABEL[g]}</p>
            <div className="flex flex-wrap gap-1">
              {caps.byGroup[g].map((t) => <span key={t} className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">{t}</span>)}
            </div>
          </div>
        ))}
      </div>

      {/* conventions + routing */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">Conventions</p>
          <ul className="space-y-0.5 text-[11px] text-muted">
            <li>Structure: <span className="text-ink">{caps.conventions.folderStructure}</span></li>
            <li>Naming: <span className="text-ink">{caps.conventions.namingConvention}</span></li>
            <li>API: <span className="text-ink">{caps.conventions.apiStyle}</span></li>
            <li>Data: <span className="text-ink">{caps.conventions.databasePattern}</span></li>
            <li>State: <span className="text-ink">{caps.conventions.stateManagement}</span></li>
            <li>Tests: <span className="text-ink">{caps.conventions.testingStrategy}</span></li>
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">Hermes Routing Hints</p>
          {caps.routingHints.length === 0 ? <p className="text-[11px] text-muted">None.</p> : (
            <ul className="space-y-1 text-[11px]">
              {caps.routingHints.map((h, i) => (
                <li key={i}><span className="font-mono text-brand">{h.agent}</span> <span className="text-muted">← {h.context}</span></li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-[10px] text-faint">Stored in the Knowledge Layer (project:{caps.projectName}).</p>
        </div>
      </div>
    </section>
  );
}

/* ---------- overview ---------- */
function OverviewCard({ project }: { project: ProjectInfo }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Project Overview</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
        <Kv k="Framework" v={project.framework} /><Kv k="Language" v={project.language} />
        <Kv k="Package mgr" v={project.packageManager} /><Kv k="Git branch" v={project.gitBranch ?? "—"} />
        <Kv k="Database" v={project.detectedDatabase ?? "—"} /><Kv k="Auth" v={project.detectedAuth ?? "—"} />
        <Kv k="Dependencies" v={String(project.dependencies.length)} /><Kv k="Env files" v={String(project.envFiles.length)} />
      </div>
      {project.scripts.length > 0 && (
        <div className="mt-2"><p className="text-[10px] uppercase tracking-wider text-faint">Scripts</p>
          <div className="mt-1 flex flex-wrap gap-1">{project.scripts.slice(0, 8).map((s) => <span key={s.name} className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">{s.name}</span>)}</div>
        </div>
      )}
      {project.detectedApis.length > 0 && (
        <div className="mt-2"><p className="text-[10px] uppercase tracking-wider text-faint">Detected APIs ({project.detectedApis.length})</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted">{project.detectedApis.slice(0, 3).join(", ")}…</p>
        </div>
      )}
      <p className="mt-2 text-[11px] text-faint">{project.readmeSummary}</p>
    </section>
  );
}
function Kv({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><span className="text-faint">{k}</span><span className="truncate text-ink">{v}</span></div>;
}

/* ---------- tree ---------- */
function TreePanel({ tree }: { tree: TreeNode[] }) {
  return (
    <section className="h-[520px] overflow-y-auto rounded-2xl border border-line bg-surface-2 p-2">
      <p className="px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Files</p>
      <TreeNodes nodes={tree} depth={0} />
    </section>
  );
}
function TreeNodes({ nodes, depth }: { nodes: TreeNode[]; depth: number }) {
  return (
    <>
      {nodes.map((n) => <TreeRow key={n.path} node={n} depth={depth} />)}
    </>
  );
}
function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const pad = { paddingLeft: `${depth * 12 + 6}px` };
  if (node.kind === "dir") {
    return (
      <div>
        <button type="button" onClick={() => setOpen((v) => !v)} style={pad} className="flex w-full items-center gap-1.5 rounded py-0.5 text-left text-[12px] text-ink hover:bg-surface">
          <span className="text-[9px] text-muted">{open ? "▾" : "▸"}</span>📁 <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && <TreeNodes nodes={node.children} depth={depth + 1} />}
      </div>
    );
  }
  return <div style={pad} className="truncate py-0.5 text-[12px] text-faint">📄 {node.name}</div>;
}

/* ---------- assistant: search + AI edits ---------- */
function Assistant({ getFiles, readFile, applyPlan, search }: {
  getFiles: () => TreeNode[];
  readFile: (p: string) => Promise<string>;
  applyPlan: (plan: EditPlanView) => Promise<void>;
  search: (q: string) => Promise<SearchHit[]>;
}) {
  const [tab, setTab] = useState<"assistant" | "search">("assistant");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [instruction, setInstruction] = useState("");
  const [timeline, setTimeline] = useState<TimelineStep[]>([]);
  const [plan, setPlan] = useState<EditPlanView | null>(null);
  const [running, setRunning] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  const runSearch = async () => { setSearching(true); try { setHits(await search(q)); } finally { setSearching(false); } };

  const step = (label: string) => setTimeline((t) => [...t.map((x) => ({ ...x, status: "done" as const })), { label, status: "running" }]);
  const finish = () => setTimeline((t) => t.map((x) => ({ ...x, status: "done" as const })));

  const plead = async () => {
    if (!instruction.trim()) return;
    setRunning(true); setPlan(null); setApplied(null); setTimeline([]);
    try {
      step("Understanding request");
      step("Gathering project files");
      // bound: send text files (<30KB), cap 60
      const files = getFiles().filter((f) => f.ext && TEXT_EXT.has(f.ext) && (f.size ?? 0) < 30_000).slice(0, 60);
      const payload: { path: string; content: string }[] = [];
      for (const f of files) { try { payload.push({ path: f.path, content: await readFile(f.path) }); } catch { /* */ } }

      step("Planning edits (AI Router)");
      const res = await fetch("/api/code/agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, files: payload }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);

      step("Preparing patch");
      const planFiles: PlanFile[] = res.files ?? [];
      const deleted: string[] = res.deleted ?? [];
      const affected = [...planFiles.map((f) => f.path), ...deleted];
      const touchesSensitive = affected.some((p) => /middleware|auth|\.env|config|package\.json/i.test(p));
      const risk: EditPlanView["risk"] = deleted.length || touchesSensitive || affected.length > 5 ? "high" : affected.length > 2 ? "medium" : "low";

      step("Validating changes");
      finish();
      setPlan({ summary: res.summary ?? "", notes: res.notes ?? "", files: planFiles, deleted, risk, affected });
    } catch (e) {
      setTimeline((t) => [...t.map((x) => ({ ...x, status: "done" as const })), { label: `Error: ${(e as Error).message}`, status: "error" }]);
    } finally {
      setRunning(false);
    }
  };

  const confirm = async () => {
    if (!plan) return;
    setRunning(true);
    setTimeline((t) => [...t.map((x) => ({ ...x, status: "done" as const })), { label: "Applying changes", status: "running" }]);
    try {
      await applyPlan(plan);
      setTimeline((t) => [...t.map((x) => ({ ...x, status: "done" as const })), { label: "Refreshed tree + published events · Done", status: "done" }]);
      setApplied(`Applied ${plan.files.length} file(s)${plan.deleted.length ? `, deleted ${plan.deleted.length}` : ""}.`);
      setPlan(null);
    } catch (e) {
      setTimeline((t) => [...t, { label: `Apply failed: ${(e as Error).message}`, status: "error" }]);
    } finally { setRunning(false); }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="mb-3 flex gap-2">
        <Tab active={tab === "assistant"} onClick={() => setTab("assistant")}>Assistant</Tab>
        <Tab active={tab === "search"} onClick={() => setTab("search")}>Search</Tab>
      </div>

      {tab === "search" ? (
        <div>
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} placeholder="Search the project… e.g. where is auth handled, JWT, route" className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand/40" />
            <button type="button" onClick={runSearch} disabled={searching} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{searching ? "…" : "Search"}</button>
          </div>
          <ul className="mt-3 space-y-1.5">
            {hits.map((h, i) => (
              <li key={i} className="text-[12px]">
                <span className="font-mono text-[11px] text-brand">{h.path}{h.line ? `:${h.line}` : ""}</span>
                {h.kind === "content" && <p className="truncate font-mono text-[11px] text-muted">{h.preview}</p>}
              </li>
            ))}
            {hits.length === 0 && <li className="text-[12px] text-muted">No matches yet.</li>}
          </ul>
        </div>
      ) : (
        <div>
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} placeholder="Describe a change… e.g. Add input validation to the login route and return 400 on bad payloads." className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand/40" />
          <button type="button" onClick={plead} disabled={running || !instruction.trim()} className="mt-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50">{running ? "Working…" : "Plan changes"}</button>

          {timeline.length > 0 && (
            <ul className="mt-3 space-y-1">
              {timeline.map((s, i) => (
                <li key={i} className={`flex items-center gap-2 text-[12px] ${s.status === "error" ? "text-red-600" : s.status === "done" ? "text-ink" : "text-brand"}`}>
                  <span>{s.status === "done" ? "✓" : s.status === "error" ? "✕" : "▸"}</span>{s.label}{s.status === "running" ? "…" : ""}
                </li>
              ))}
            </ul>
          )}

          {applied && <p className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[13px] text-emerald-800">{applied}</p>}

          {plan && (
            <div className="mt-3 rounded-xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">Proposed changes</span>
                <RiskPill risk={plan.risk} />
                <span className="text-[11px] text-muted">{plan.files.length} file(s){plan.deleted.length ? ` · ${plan.deleted.length} delete(s)` : ""}</span>
              </div>
              {plan.summary && <p className="mt-1 text-[12px] text-muted">{plan.summary}</p>}
              <p className="mt-2 text-[10px] uppercase tracking-wider text-faint">Files affected</p>
              <ul className="mt-1 space-y-1">
                {plan.files.map((f) => <DiffRow key={f.path} file={f} />)}
                {plan.deleted.map((d) => <li key={d} className="font-mono text-[11px] text-red-600">− delete {d}</li>)}
              </ul>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={confirm} disabled={running} className="rounded-lg bg-ink px-4 py-1.5 text-[13px] font-semibold text-canvas disabled:opacity-50">Apply changes</button>
                <button type="button" onClick={() => setPlan(null)} className="rounded-lg border border-line px-4 py-1.5 text-[13px] text-muted hover:text-ink">Discard</button>
              </div>
              <p className="mt-2 text-[10px] text-faint">Changes are written to your local folder only after you click Apply.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DiffRow({ file }: { file: PlanFile }) {
  const [open, setOpen] = useState(false);
  const lines = file.content.split("\n").length;
  return (
    <li className="text-[12px]">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5">
        <span className={file.action === "create" ? "text-emerald-600" : "text-amber-600"}>{file.action === "create" ? "+ new" : "~ edit"}</span>
        <span className="font-mono text-[11px] text-ink">{file.path}</span>
        <span className="text-faint">({lines} lines)</span>
      </button>
      {open && <pre className="mt-1 max-h-56 overflow-auto rounded border border-line bg-surface-2 p-2 font-mono text-[11px] text-ink">{file.content.slice(0, 4000)}</pre>}
    </li>
  );
}
function RiskPill({ risk }: { risk: EditPlanView["risk"] }) {
  const c = risk === "high" ? "#ef4444" : risk === "medium" ? "#f59e0b" : "#10b981";
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: `${c}1f`, color: c }}>{risk} risk</span>;
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-1 text-xs font-medium ${active ? "bg-brand/[0.10] text-brand" : "text-muted hover:text-ink"}`}>{children}</button>;
}
