"use client";

/* ============================================================================
   Workspace Intelligence (Phase 1B) — reusable workspace foundation.
   ----------------------------------------------------------------------------
   Discovery (open / recent / pinned) → structural project understanding →
   read-only file explorer + preview + activity. No editing, git, terminal,
   MCP, diff, or LLM. Lives inside the dashboard Chrome (sidebar / top bar /
   right context panel are all reused — nothing duplicated).
   ========================================================================== */

import { useState } from "react";
import {
  WorkspaceIntelProvider,
  useWorkspaceIntel,
} from "@/components/workspace-intel/context";
import FileExplorer from "@/components/workspace-intel/FileExplorer";
import { ACTIVITY_LABEL, type WorkspaceRef } from "@/lib/workspace/model";

export default function WorkspacePage() {
  return (
    <WorkspaceIntelProvider>
      <div className="h-full overflow-y-auto px-6 py-6">
        <WorkspaceIntel />
      </div>
    </WorkspaceIntelProvider>
  );
}

function WorkspaceIntel() {
  const ws = useWorkspaceIntel();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Workspace Intelligence
        </h1>
        <p className="mt-1 text-sm text-muted">
          The reusable foundation every workspace and agent reads from — read-only.
        </p>
      </header>

      {ws.error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {ws.error}
        </div>
      )}

      {ws.workspace ? <Loaded /> : <Discovery />}
    </div>
  );
}

/* -------------------------------- Discovery ------------------------------- */

function Discovery() {
  const ws = useWorkspaceIntel();
  const [path, setPath] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Open Folder">
        <p className="mb-3 text-sm text-muted">
          Paste a folder path to open it as a workspace.
        </p>
        <div className="flex gap-2">
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && path.trim() && ws.openFolder(path.trim())}
            placeholder="D:\\Projects\\my-app"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-ink placeholder:text-faint outline-none focus:border-brand/40"
          />
          <button
            type="button"
            disabled={!path.trim() || ws.loading}
            onClick={() => ws.openFolder(path.trim())}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
          >
            {ws.loading ? "Opening…" : "Open"}
          </button>
        </div>
      </Panel>

      <Panel title="Pinned Workspaces">
        {ws.pinned.length === 0 ? (
          <Empty>No pinned workspaces.</Empty>
        ) : (
          <RefList refs={ws.pinned} onOpen={(r) => ws.openFolder(r.path)} onUnpin={ws.unpin} />
        )}
      </Panel>

      <Panel title="Recent Workspaces" className="lg:col-span-2">
        {ws.recent.length === 0 ? (
          <Empty>No recent workspaces yet — open a folder to begin.</Empty>
        ) : (
          <RefList refs={ws.recent} onOpen={(r) => ws.openFolder(r.path)} />
        )}
      </Panel>
    </div>
  );
}

function RefList({
  refs,
  onOpen,
  onUnpin,
}: {
  refs: WorkspaceRef[];
  onOpen: (r: WorkspaceRef) => void;
  onUnpin?: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {refs.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2"
        >
          <button type="button" onClick={() => onOpen(r)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] font-medium text-ink">{r.name}</p>
            <p className="truncate font-mono text-[11px] text-faint">{r.path}</p>
          </button>
          {onUnpin && (
            <button
              type="button"
              onClick={() => onUnpin(r.id)}
              className="text-xs text-muted hover:text-ink"
            >
              Unpin
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------- Loaded -------------------------------- */

function Loaded() {
  const ws = useWorkspaceIntel();
  const w = ws.workspace!;
  const s = ws.summary;
  const pinned = ws.isPinned(w.id);

  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [previewBody, setPreviewBody] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [changing, setChanging] = useState(false);
  const [newPath, setNewPath] = useState("");

  const preview = async (p: string) => {
    setPreviewPath(p);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(p)}`).then((r) => r.json());
      setPreviewBody(res.error ? `[${res.error}]` : (res.content ?? ""));
    } catch (e) {
      setPreviewBody(`[${(e as Error).message}]`);
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* workspace header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-surface-2 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-ink">{w.name}</h2>
            <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] capitalize text-muted">
              {w.type}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] text-faint">{w.path}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
            <span>{w.files.toLocaleString()} files</span>
            <span>{w.folders.toLocaleString()} folders</span>
            <span>{formatBytes(s?.totalBytes ?? 0)}</span>
            <span>Modified {s?.lastModified ? timeAgo(s.lastModified) : "—"}</span>
          </div>
        </div>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={() => (pinned ? ws.unpin(w.id) : ws.pin({ id: w.id, name: w.name, path: w.path, openedAt: w.openedAt }))}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
          >
            {pinned ? "★ Pinned" : "☆ Pin"}
          </button>
          <button
            type="button"
            onClick={() => ws.refresh()}
            disabled={ws.loading}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-ink disabled:opacity-50"
          >
            {ws.loading ? "Refreshing…" : "↻ Refresh"}
          </button>
          <button
            type="button"
            onClick={() => setChanging((v) => !v)}
            title="Open a different folder"
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
          >
            Change
          </button>
        </div>
        {changing && (
          <div className="flex w-full gap-2">
            <input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newPath.trim() && ws.openFolder(newPath.trim())}
              placeholder="D:\\Projects\\another-app"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs text-ink placeholder:text-faint outline-none focus:border-brand/40"
            />
            <button
              type="button"
              disabled={!newPath.trim() || ws.loading}
              onClick={() => ws.openFolder(newPath.trim())}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
            >
              Open
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* explorer */}
        <div className="h-[560px] overflow-hidden rounded-2xl border border-line bg-surface-2">
          <FileExplorer
            tree={ws.tree}
            selected={ws.selectedFiles}
            activePreview={previewPath}
            onToggleSelect={ws.toggleSelect}
            onPreview={preview}
            onExpandFolder={ws.setCurrentFolder}
          />
        </div>

        {/* right column: summary + preview + activity */}
        <div className="space-y-4">
          {/* project understanding */}
          <Panel title="Project Summary">
            {!s ? (
              <Empty>No summary available.</Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <SubHead>Languages / File Types</SubHead>
                  <ul className="mt-2 space-y-1.5">
                    {s.languages.slice(0, 8).map((l) => (
                      <li key={l.ext} className="flex items-center justify-between text-[13px]">
                        <span className="text-ink">{l.label}</span>
                        <span className="font-mono text-[11px] text-muted">
                          {l.count} · {formatBytes(l.bytes)}
                        </span>
                      </li>
                    ))}
                    {s.languages.length === 0 && <Empty>No typed files.</Empty>}
                  </ul>
                </div>
                <div>
                  <SubHead>Important Files</SubHead>
                  <ul className="mt-2 space-y-1.5">
                    {s.importantFiles.slice(0, 8).map((f) => (
                      <li key={f.path} className="text-[13px]">
                        <button
                          type="button"
                          onClick={() => preview(f.path)}
                          className="truncate font-mono text-[12px] text-brand hover:underline"
                        >
                          {f.path}
                        </button>
                        <span className="ml-1 text-[11px] text-muted">— {f.reason}</span>
                      </li>
                    ))}
                    {s.importantFiles.length === 0 && <Empty>None detected.</Empty>}
                  </ul>
                </div>
                <div className="sm:col-span-2">
                  <SubHead>Recently Changed</SubHead>
                  <ul className="mt-2 space-y-1.5">
                    {s.recentlyChanged.map((c) => (
                      <li key={c.path} className="flex items-center justify-between gap-3 text-[13px]">
                        <button
                          type="button"
                          onClick={() => preview(c.path)}
                          className="min-w-0 truncate font-mono text-[12px] text-faint hover:text-ink"
                        >
                          {c.path}
                        </button>
                        <span className="flex-none font-mono text-[11px] text-muted">{timeAgo(c.modifiedAt)}</span>
                      </li>
                    ))}
                    {s.recentlyChanged.length === 0 && <Empty>No changes detected.</Empty>}
                  </ul>
                </div>
              </div>
            )}
          </Panel>

          {/* preview */}
          <Panel title={previewPath ? `Preview · ${previewPath}` : "File Preview"}>
            {!previewPath ? (
              <Empty>Select a file to preview (read-only).</Empty>
            ) : previewLoading ? (
              <Empty>Loading…</Empty>
            ) : (
              <pre className="max-h-72 overflow-auto rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12px] leading-relaxed text-ink">
                {previewBody}
              </pre>
            )}
          </Panel>

          {/* selection + activity */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title={`Selected Files (${ws.selectedFiles.length})`}>
              {ws.selectedFiles.length === 0 ? (
                <Empty>No files selected.</Empty>
              ) : (
                <>
                  <ul className="space-y-1">
                    {ws.selectedFiles.map((p) => (
                      <li key={p} className="truncate font-mono text-[11px] text-faint">{p}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={ws.clearSelection}
                    className="mt-2 text-xs text-muted hover:text-ink"
                  >
                    Clear
                  </button>
                </>
              )}
            </Panel>

            <Panel title="Recent Activity">
              {ws.activity.length === 0 ? (
                <Empty>No activity.</Empty>
              ) : (
                <ul className="space-y-1.5">
                  {ws.activity.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="truncate text-ink">
                        {ACTIVITY_LABEL[a.type]}
                        <span className="ml-1 text-muted">{a.detail}</span>
                      </span>
                      <span className="flex-none font-mono text-[10px] text-faint">{timeAgo(a.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- primitives ------------------------------ */

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface-2 p-4 ${className}`}>
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
        {title}
      </p>
      {children}
    </section>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">{children}</p>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
