"use client";

/* Studio rails: left (Worlds + Files), center tabs bar, right (Reasoning /
   Artifacts / References / Tools / Memory). All driven by real store state. */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/components/dashboard/store";
import { useStudio, type RightTab } from "./store";
import { TabGlyph } from "./Viewers";
import { KindIcon, KIND_COLOR, I } from "./ui";

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rel(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/* ============================================================ LEFT */

export function StudioLeft() {
  const { conversations, createConversation } = useDashboard();
  const { files, openChatTab, openTab, activate, removeFile, tabs, activeId } = useStudio();
  const [q, setQ] = useState("");

  const worlds = useMemo(
    () =>
      [...conversations]
        .filter((c) => c.messages.length > 0 || c.title)
        .filter((c) => c.title.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations, q],
  );

  const newWorld = () => {
    const id = createConversation();
    openChatTab(id, "New chat");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center gap-2 border-b border-line px-3 py-2.5">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-faint">{I.search}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search worlds…" className="w-full rounded-lg border border-line bg-surface-2 py-1.5 pl-8 pr-2 text-xs text-ink placeholder:text-faint outline-none focus:border-brand/40" />
        </div>
        <button onClick={newWorld} title="New world" className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-gradient-to-br from-brand to-violet text-ink transition hover:scale-105">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <RailLabel>Worlds</RailLabel>
        {worlds.length === 0 && <p className="px-2 py-1 text-[11px] text-faint">No worlds yet.</p>}
        <div className="mb-3 space-y-0.5">
          {worlds.map((c) => {
            const open = tabs.some((t) => t.convId === c.id && t.id === activeId);
            return (
              <button key={c.id} onClick={() => openChatTab(c.id, c.title)} className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${open ? "bg-brand/[0.12]" : "hover:bg-surface-2"}`}>
                <span style={{ color: KIND_COLOR.chat }}><KindIcon kind="chat" size={14} /></span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{c.title}</span>
                <span className="font-mono text-[10px] text-faint">{rel(c.updatedAt)}</span>
              </button>
            );
          })}
        </div>

        <RailLabel>Files</RailLabel>
        {files.length === 0 && <p className="px-2 py-1 text-[11px] text-faint">Drop files anywhere to add.</p>}
        <div className="space-y-0.5">
          {files.map((f) => {
            const tab = tabs.find((t) => t.fileId === f.id);
            const open = tab && tab.id === activeId;
            return (
              <div key={f.id} className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${open ? "bg-brand/[0.12]" : "hover:bg-surface-2"}`}>
                <button onClick={() => (tab ? activate(tab.id) : openTab({ kind: f.kind, title: f.name, fileId: f.id }))} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span style={{ color: KIND_COLOR[f.kind] }}><KindIcon kind={f.kind} size={14} /></span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{f.name}</span>
                  {f.status === "parsing" && <span className="h-2.5 w-2.5 animate-spin rounded-full border border-line border-t-brand" />}
                  {f.status === "error" && <span className="text-danger" title={f.error}>⚠</span>}
                </button>
                <button onClick={() => removeFile(f.id)} aria-label={`Remove ${f.name}`} className="text-faint opacity-0 transition hover:text-ink group-hover:opacity-100">{I.close}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ TABS BAR */

export function TabsBar() {
  const { tabs, activeId, splitId, activate, closeTab, toggleSplit } = useStudio();
  if (tabs.length === 0) return null;
  return (
    <div className="flex flex-none items-center gap-1 overflow-x-auto border-b border-line bg-surface px-2 py-1.5">
      {tabs.map((t) => {
        const active = t.id === activeId;
        const inSplit = t.id === splitId;
        return (
          <div key={t.id} className={`group flex flex-none items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors ${active ? "border-brand/30 bg-brand/[0.10] text-ink" : inSplit ? "border-violet/30 bg-violet/[0.08] text-ink" : "border-line text-muted hover:bg-surface-2"}`}>
            <button onClick={() => activate(t.id)} className="flex items-center gap-1.5">
              <TabGlyph kind={t.kind} />
              <span className="max-w-[160px] truncate">{t.title}</span>
            </button>
            <button onClick={() => closeTab(t.id)} aria-label={`Close ${t.title}`} className="text-faint transition hover:text-ink">{I.close}</button>
          </div>
        );
      })}
      <span className="flex-1" />
      <button onClick={() => toggleSplit()} title="Split view (⌘\\)" aria-pressed={Boolean(splitId)} className={`grid h-7 w-7 flex-none place-items-center rounded-lg border transition-colors ${splitId ? "border-violet/40 bg-violet/15 text-violet" : "border-line text-muted hover:bg-surface-2 hover:text-ink"}`}>
        {I.split}
      </button>
    </div>
  );
}

/* ============================================================ RIGHT */

const RIGHT_TABS: { key: RightTab; label: string }[] = [
  { key: "reasoning", label: "Reasoning" },
  { key: "tools", label: "Tools" },
  { key: "sources", label: "Sources" },
  { key: "memory", label: "Memory" },
  { key: "downloads", label: "Saves" },
  { key: "versions", label: "Versions" },
];

export function StudioRight() {
  const { rightTab, setRightTab, artifacts, toolRuns, memory, removeMemory, files, openTab, blocks } = useStudio();
  const { routedIntent, routedConfidence, routedReason, routedModel, workflow, agentStatus } = useDashboard();

  const pinned = blocks.filter((b) => b.pinned);
  const responses = blocks.filter((b) => b.kind === "response" && (b.versions?.length ?? 0) > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none gap-0.5 overflow-x-auto border-b border-line px-2 py-2">
        {RIGHT_TABS.map((t) => (
          <button key={t.key} onClick={() => setRightTab(t.key)} className={`flex-none rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${rightTab === t.key ? "bg-surface-3 text-ink" : "text-faint hover:text-ink"}`}>
            {t.label}
            {t.key === "memory" && memory.length > 0 && <span className="ml-1 text-brand">{memory.length}</span>}
            {t.key === "downloads" && pinned.length > 0 && <span className="ml-1 text-amber-300">{pinned.length}</span>}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {rightTab === "reasoning" && (
          <div className="space-y-3">
            <Panel title="Routing">
              {routedModel ? (
                <>
                  <Row k="Model" v={routedModel.label} />
                  <Row k="Intent" v={routedIntent ?? "—"} />
                  {routedConfidence != null && <Row k="Confidence" v={`${Math.round(routedConfidence * 100)}%`} />}
                  {routedReason && <p className="mt-2 text-[12px] leading-relaxed text-muted">{routedReason}</p>}
                </>
              ) : <Empty>Send a prompt to see how it’s routed.</Empty>}
            </Panel>
            <Panel title="Workflow">
              <ol className="space-y-2.5">
                {workflow.map((s, i) => {
                  const done = s.state === "done"; const active = s.state === "active";
                  return (
                    <li key={i} className="flex items-center gap-2.5 text-[13px]">
                      <span className={`grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] font-semibold ${done ? "bg-brand text-ink" : active ? "border-2 border-brand text-brand" : "border border-line text-faint"}`}>{done ? "✓" : i + 1}</span>
                      <span className={s.state === "pending" ? "text-faint" : "text-ink"}>{s.label}</span>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          </div>
        )}

        {rightTab === "sources" && (
          (() => {
            const refs = files.filter((f) => f.text?.trim() || f.kind === "image" || f.kind === "pdf");
            return refs.length === 0 ? <Empty>Attached files become referenceable sources here.</Empty> : (
              <div className="space-y-2">
                {refs.map((f) => (
                  <button key={f.id} onClick={() => openTab({ kind: f.kind, title: f.name, fileId: f.id })} className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface-2 p-2.5 text-left transition hover:bg-surface-2">
                    <span style={{ color: KIND_COLOR[f.kind] }}><KindIcon kind={f.kind} size={16} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{f.name}</span>
                      <span className="block font-mono text-[10px] text-muted">{f.text ? `${f.text.length.toLocaleString()} chars · in context` : f.kind}</span>
                    </span>
                  </button>
                ))}
              </div>
            );
          })()
        )}

        {rightTab === "downloads" && (
          (() => {
            const items = [
              ...pinned.filter((b) => b.kind === "code" || b.kind === "table" || b.kind === "response").map((b) => ({
                id: b.id, title: b.kind === "code" ? `Code · ${b.lang ?? ""}` : b.kind === "table" ? "Table.csv" : "Response.md",
                ext: b.kind === "code" ? (b.lang || "txt") : b.kind === "table" ? "csv" : "md",
                content: b.kind === "code" ? (b.code ?? "") : b.kind === "table" ? (b.rows ?? []).map((r) => r.join(",")).join("\n") : (b.text ?? ""),
              })),
              ...artifacts.map((a) => ({ id: a.id, title: a.title, ext: a.lang || "txt", content: a.content })),
            ];
            return items.length === 0 ? <Empty>Pin a block (☆) or save an artifact to download it here.</Empty> : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{it.title}</span>
                      <span className="block font-mono text-[10px] text-muted">{it.content.length.toLocaleString()} chars</span>
                    </span>
                    <button onClick={() => download(`${it.title.replace(/\W+/g, "_")}.${it.ext}`, it.content)} className="rounded-lg border border-line px-2 py-1 text-[11px] text-muted hover:bg-surface-2 hover:text-ink">Download</button>
                  </div>
                ))}
              </div>
            );
          })()
        )}

        {rightTab === "versions" && (
          responses.length === 0 ? <Empty>Response history will appear as you generate.</Empty> : (
            <div className="space-y-2">
              {responses.map((b) => (
                <div key={b.id} className="rounded-xl border border-line bg-surface-2 p-2.5">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">{b.model ?? "response"} · v{b.versions?.length}</p>
                  <p className="line-clamp-3 text-[12px] leading-relaxed text-ink">{b.text}</p>
                </div>
              ))}
            </div>
          )
        )}

        {rightTab === "tools" && (
          <div className="space-y-3">
            <Panel title="Running tasks">
              <div className="flex items-center gap-2 text-[13px]">
                <span className={`h-2 w-2 rounded-full ${agentStatus === "running" || agentStatus === "thinking" ? "animate-pulse bg-success" : "bg-white/30"}`} />
                <span className="capitalize text-ink">{agentStatus === "idle" ? "No active tasks" : agentStatus}</span>
              </div>
            </Panel>
            <Panel title="Tool calls">
              {toolRuns.length === 0 ? <Empty>Model runs, extraction & tools log here.</Empty> : (
                <ol className="space-y-2">
                  {toolRuns.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-[12px]">
                      <span className={`h-1.5 w-1.5 flex-none rounded-full ${t.status === "running" ? "animate-pulse bg-warning" : t.status === "error" ? "bg-danger" : "bg-success"}`} />
                      <span className="min-w-0 flex-1 truncate text-ink">{t.label}</span>
                      {t.detail && <span className="font-mono text-[10px] text-faint">{t.detail}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        )}

        {rightTab === "memory" && (
          memory.length === 0 ? <Empty>Pin any response to keep it as working memory.</Empty> : (
            <div className="space-y-2">
              {memory.map((m) => (
                <div key={m.id} className="group rounded-xl border border-line bg-surface-2 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-amber-300">{I.pin}</span>
                    <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink line-clamp-4">{m.text}</p>
                    <button onClick={() => removeMemory(m.id)} aria-label="Remove" className="text-faint opacity-0 transition hover:text-ink group-hover:opacity-100">{I.close}</button>
                  </div>
                  <p className="mt-1.5 pl-6 font-mono text-[10px] text-faint">{m.source} · {rel(m.ts)}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ---- small shared bits ---- */
function RailLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2 pb-1 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{children}</p>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.025] p-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{title}</p>
      {children}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between gap-3 py-0.5 text-[13px]"><span className="text-muted">{k}</span><span className="truncate font-medium capitalize text-ink">{v}</span></div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-4 text-center text-[12px] text-faint">{children}</p>;
}
