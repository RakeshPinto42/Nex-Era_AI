"use client";

/* Worlds views: grid card, World Overview (hero + toolbar + pinned + timeline +
   tasks), the right OS panel (memory / AI context / knowledge graph / links /
   stats / storage / export / share), a file viewer modal and an import picker.
   Reuses the Studio FileViewer + Markdown + kind glyphs. */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/components/dashboard/store";
import { FileViewer, Markdown } from "@/components/studio/Viewers";
import { KindIcon } from "@/components/studio/ui";
import type { StudioFile } from "@/components/studio/store";
import { useWorlds, fileToItem, ITEM_COUNTS, summarize, progressOf, TEAM, type World, type WorldItem, type ItemKind } from "./store";

const KIND_META: Record<ItemKind, { label: string; color: string; glyph: string }> = {
  conversation: { label: "Conversations", color: "#8b5cf6", glyph: "💬" },
  research: { label: "Research", color: "#22d3ee", glyph: "🔬" },
  file: { label: "Files", color: "#60a5fa", glyph: "📄" },
  image: { label: "Images", color: "#ec4899", glyph: "🖼️" },
  video: { label: "Videos", color: "#f59e0b", glyph: "🎬" },
  note: { label: "Notes", color: "#34f5a0", glyph: "📝" },
  task: { label: "Tasks", color: "#fbbf24", glyph: "✓" },
  artifact: { label: "Artifacts", color: "#a855f7", glyph: "📦" },
  ai: { label: "AI Responses", color: "#3b82f6", glyph: "✦" },
  prompt: { label: "Prompts", color: "#fbbf24", glyph: "⌘" },
  notebook: { label: "Notebooks", color: "#60a5fa", glyph: "📓" },
};

const CONNECTED_AGENTS = [
  { name: "Research Agent", color: "#22d3ee", glyph: "🔬" },
  { name: "Developer Agent", color: "#3b82f6", glyph: "⌨" },
  { name: "Analyst Agent", color: "#34f5a0", glyph: "📊" },
];

function Avatars({ members }: { members: { avatar: string }[] }) {
  return (
    <div className="flex -space-x-1.5">
      {members.slice(0, 3).map((m, i) => (
        <span key={i} className="grid h-6 w-6 place-items-center rounded-full border border-line bg-gradient-to-br from-navy to-ice text-[9px] font-bold text-ink">{m.avatar}</span>
      ))}
    </div>
  );
}

function rel(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`;
}
const toStudioFile = (it: WorldItem): StudioFile => ({
  id: it.id, name: it.file!.name, mime: it.file!.mime, size: it.file!.size, kind: it.file!.fkind,
  url: it.file!.url, text: it.file!.text, status: "ready",
});

/* ============================================================ GRID CARD */

export function WorldCard({ world, onOpen }: { world: World; onOpen: () => void }) {
  const { toggleFavorite } = useWorlds();
  const c = ITEM_COUNTS(world);
  return (
    <motion.button
      layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}
      onClick={onOpen}
      className="group relative flex flex-col rounded-2xl border border-line bg-surface-2 p-4 text-left backdrop-blur-sm transition-colors hover:border-line"
      style={{ boxShadow: `0 0 0 1px transparent` }}
    >
      <span className="absolute left-0 top-0 h-full w-0.5 rounded-l-2xl" style={{ background: world.color }} />
      <div className="mb-3 flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: `${world.color}22` }}>{world.emoji}</span>
        <span onClick={(e) => { e.stopPropagation(); toggleFavorite(world.id); }} className={`cursor-pointer text-lg ${world.favorite ? "text-amber-300" : "text-faint hover:text-muted"}`}>★</span>
      </div>
      <p className="truncate font-semibold text-ink">{world.name}</p>
      <p className="mt-0.5 line-clamp-2 min-h-[2.2em] text-[11px] leading-relaxed text-muted"><span className="text-brand/80">✦ </span>{summarize(world)}</p>
      {(world.tags ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">{(world.tags ?? []).slice(0, 3).map((t) => <span key={t} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] text-muted">#{t}</span>)}</div>
      )}
      {progressOf(world) > 0 && (
        <div className="mt-2.5"><div className="h-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${progressOf(world)}%`, background: world.color }} /></div></div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 font-mono text-[10px] text-faint">
          <span>{rel(world.updatedAt)}</span>
          <span>· {(c.file ?? 0) + (c.image ?? 0) + (c.video ?? 0)}f</span>
          <span>· {c.conversation ?? 0}c</span>
        </div>
        <Avatars members={world.members ?? TEAM.slice(0, 1)} />
      </div>
      {world.agent && <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />{world.agent}</span>}
    </motion.button>
  );
}

/* ============================================================ OVERVIEW */

type CenterTab = "canvas" | "conversations" | "artifacts";

export function WorldOverview({ world }: { world: World }) {
  const { updateWorld, addItem, duplicateWorld, selectWorld } = useWorlds();
  const [tab, setTab] = useState<CenterTab>("canvas");
  const [selId, setSelId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sel = world.items.find((i) => i.id === selId) ?? null;
  const chats = world.items.filter((i) => i.kind === "conversation");
  const files = world.items.filter((i) => i.kind === "file" || i.kind === "image" || i.kind === "video");
  const prompts = world.items.filter((i) => i.kind === "prompt");
  const notebooks = world.items.filter((i) => i.kind === "notebook");
  const artifacts = world.items.filter((i) => i.kind === "artifact" || i.kind === "research" || i.kind === "ai");
  const notes = world.items.filter((i) => i.kind === "note");
  const pinned = world.items.filter((i) => i.pinned && i.kind !== "task");

  const upload = (fl: FileList | null) => { if (fl) Array.from(fl).forEach((f) => addItem(world.id, fileToItem(f).item)); };
  const exportWorld = () => {
    const md = `# ${world.emoji} ${world.name}\n\n${world.description}\n\n## Items (${world.items.length})\n${world.items.map((i) => `- [${i.kind}] ${i.title}`).join("\n")}\n\n## Memory\n${world.memory.map((m) => `- ${m.text}`).join("\n")}`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" })); a.download = `${world.name.replace(/\W+/g, "_")}.md`; a.click();
  };
  const open = (id: string) => setSelId(id);
  const goTab = (t: CenterTab) => { setSelId(null); setTab(t); };

  return (
    <div className="flex h-full" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}>
      {/* ===== LEFT: world navigator ===== */}
      <aside className="hidden w-[212px] flex-none flex-col overflow-y-auto border-r border-line bg-surface py-3 md:flex">
        <button onClick={() => { setSelId(null); setTab("canvas"); }} className={`mx-2 mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] ${!selId && tab === "canvas" ? "bg-brand/[0.12] text-brand" : "text-muted hover:bg-surface-2"}`}>
          <span style={{ background: `${world.color}22` }} className="grid h-6 w-6 place-items-center rounded-md text-sm">{world.emoji}</span> World Home
        </button>
        <RailSection label="Chats" items={chats} selId={selId} onOpen={open} kind="conversation" />
        <RailSection label="Files" items={files} selId={selId} onOpen={open} kind="file" extra={<label className="cursor-pointer text-faint hover:text-ink">＋<input type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} /></label>} />
        <RailSection label="Prompts" items={prompts} selId={selId} onOpen={open} kind="prompt" onAdd={() => open(addReturn(addItem, world.id, { kind: "prompt", title: "New prompt", text: "" }))} />
        <RailSection label="Notebooks" items={notebooks} selId={selId} onOpen={open} kind="notebook" onAdd={() => open(addReturn(addItem, world.id, { kind: "notebook", title: "New notebook", text: "" }))} />
      </aside>

      {/* ===== CENTER ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* toolbar */}
        <div className="z-10 flex flex-none flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-2.5 backdrop-blur-xl">
          <button onClick={() => selectWorld(null)} title="Back to Worlds" className="rounded-lg px-1.5 py-1 text-sm text-muted hover:bg-surface-2 hover:text-ink">←</button>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{world.emoji} {world.name}</span>
          <span className="flex-1" />
          <ToolbarBtn onClick={() => setImportOpen(true)}>+ Import</ToolbarBtn>
          <ToolbarBtn onClick={() => duplicateWorld(world.id)}>Duplicate</ToolbarBtn>
          <ToolbarBtn onClick={exportWorld}>Export</ToolbarBtn>
          <ToolbarBtn onClick={() => updateWorld(world.id, { shared: !world.shared })} active={world.shared}>{world.shared ? "Shared ✓" : "Share"}</ToolbarBtn>
          <div className="relative">
            <ToolbarBtn onClick={() => setSettingsOpen((v) => !v)}>⚙</ToolbarBtn>
            <AnimatePresence>{settingsOpen && <SettingsMenu world={world} close={() => setSettingsOpen(false)} />}</AnimatePresence>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {sel ? (
            <ItemDetail world={world} it={sel} onBack={() => setSelId(null)} />
          ) : (
            <div className="mx-auto max-w-5xl px-6 py-5">
              {/* hero */}
              <div className="relative mb-5 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5">
                <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full blur-[100px]" style={{ background: `${world.color}33` }} />
                <div className="relative flex items-start gap-4">
                  <button onClick={() => { const e = prompt("Emoji", world.emoji); if (e) updateWorld(world.id, { emoji: e }); }} className="grid h-14 w-14 flex-none place-items-center rounded-2xl text-3xl" style={{ background: `${world.color}22` }}>{world.emoji}</button>
                  <div className="min-w-0 flex-1">
                    <input value={world.name} onChange={(e) => updateWorld(world.id, { name: e.target.value })} className="w-full bg-transparent text-xl font-bold tracking-tight text-ink outline-none" />
                    <textarea value={world.description} onChange={(e) => updateWorld(world.id, { description: e.target.value })} placeholder="Describe this world…" rows={1} className="mt-1 w-full resize-none bg-transparent text-[13px] text-muted outline-none placeholder:text-faint" />
                    <div className="mt-1.5 flex items-center gap-2"><Avatars members={world.members ?? TEAM.slice(0, 1)} /><span className="font-mono text-[10px] text-faint">{world.items.length} items · updated {rel(world.updatedAt)}</span></div>
                  </div>
                </div>
                <div className="relative mt-4 flex flex-wrap gap-2">
                  <AddBtn onClick={() => open(addReturn(addItem, world.id, { kind: "note", title: "New note", text: "" }))}>📝 Note</AddBtn>
                  <AddBtn onClick={() => open(addReturn(addItem, world.id, { kind: "prompt", title: "New prompt", text: "" }))}>⌘ Prompt</AddBtn>
                  <AddBtn onClick={() => open(addReturn(addItem, world.id, { kind: "notebook", title: "New notebook", text: "" }))}>📓 Notebook</AddBtn>
                  <label className="cursor-pointer"><AddBtn as="span">📎 Upload</AddBtn><input type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} /></label>
                </div>
              </div>

              {/* center tabs */}
              <div className="mb-4 flex gap-1 border-b border-line">
                {(["canvas", "conversations", "artifacts"] as CenterTab[]).map((t) => (
                  <button key={t} onClick={() => goTab(t)} className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium capitalize transition-colors ${tab === t ? "border-brand text-ink" : "border-transparent text-faint hover:text-ink"}`}>{t}</button>
                ))}
              </div>

              {tab === "canvas" && (
                <div className="space-y-4">
                  {pinned.length > 0 && (
                    <div><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300/80">Pinned</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{pinned.map((it) => <ItemCard key={it.id} world={world} it={it} onView={() => open(it.id)} />)}</div></div>
                  )}
                  <div><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Notes & Canvas</p>
                    {notes.length === 0 ? <Empty>Add a note or pin items to build the canvas.</Empty> : <div className="columns-1 gap-2 sm:columns-2 lg:columns-3 [&>*]:mb-2 [&>*]:break-inside-avoid">{notes.map((it) => <ItemCard key={it.id} world={world} it={it} onView={() => open(it.id)} />)}</div>}
                  </div>
                  <div><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Recent Activity</p>
                    <div className="rounded-2xl border border-line bg-surface-2 p-4"><ol className="relative ml-1">
                      {world.activity.slice(0, 8).map((a, i) => (
                        <li key={a.id} className="flex gap-3 pb-3 last:pb-0"><div className="relative flex flex-col items-center"><span className="mt-1 h-2 w-2 flex-none rounded-full bg-brand shadow-[0_0_8px_#3b82f6]" />{i < Math.min(7, world.activity.length - 1) && <span className="mt-1 w-px flex-1 bg-surface-3" />}</div><div className="flex-1"><p className="text-[13px] text-ink">{a.label}</p><p className="font-mono text-[10px] text-faint">{rel(a.ts)}</p></div></li>
                      ))}
                    </ol></div>
                  </div>
                </div>
              )}
              {tab === "conversations" && (
                chats.length === 0 ? <Empty>No conversations yet. Import a chat via the toolbar.</Empty> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{chats.map((it) => <ItemCard key={it.id} world={world} it={it} onView={() => open(it.id)} />)}</div>
              )}
              {tab === "artifacts" && (
                artifacts.length === 0 ? <Empty>Research, code & AI outputs saved here become artifacts.</Empty> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{artifacts.map((it) => <ItemCard key={it.id} world={world} it={it} onView={() => open(it.id)} />)}</div>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>{importOpen && <ImportPicker world={world} onClose={() => setImportOpen(false)} />}</AnimatePresence>
    </div>
  );
}

// addItem returns the new id so the just-created item opens in the center.
function addReturn(addItem: ReturnType<typeof useWorlds>["addItem"], worldId: string, item: Omit<WorldItem, "id" | "createdAt">) {
  return addItem(worldId, item);
}

function RailSection({ label, items, selId, onOpen, kind, onAdd, extra }: {
  label: string; items: WorldItem[]; selId: string | null; onOpen: (id: string) => void; kind: ItemKind; onAdd?: () => void; extra?: React.ReactNode;
}) {
  const meta = KIND_META[kind];
  return (
    <div className="mt-2 px-2">
      <div className="flex items-center justify-between px-1.5 pb-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{label}</span>
        {onAdd ? <button onClick={onAdd} className="text-faint hover:text-ink">＋</button> : extra}
      </div>
      {items.length === 0 ? <p className="px-1.5 pb-1 text-[11px] text-faint">—</p> : items.map((it) => (
        <button key={it.id} onClick={() => onOpen(it.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${selId === it.id ? "bg-brand/[0.12]" : "hover:bg-surface-2"}`}>
          <span style={{ color: meta.color }} className="text-[11px]">●</span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{it.title}</span>
        </button>
      ))}
    </div>
  );
}

function ItemDetail({ world, it, onBack }: { world: World; it: WorldItem; onBack: () => void }) {
  const { updateItem, togglePin, removeItem } = useWorlds();
  const meta = KIND_META[it.kind];
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none items-center gap-2 border-b border-line px-5 py-2.5">
        <button onClick={onBack} className="text-sm text-muted hover:text-ink">←</button>
        <span style={{ color: meta.color }} className="font-mono text-[10px] uppercase tracking-wider">{it.kind}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{it.title}</span>
        <button onClick={() => togglePin(world.id, it.id)} className={it.pinned ? "text-amber-300" : "text-faint hover:text-ink"}>★</button>
        <button onClick={() => { removeItem(world.id, it.id); onBack(); }} className="text-faint hover:text-danger">✕</button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {it.file ? <FileViewer file={toStudioFile(it)} />
          : it.kind === "conversation" || it.kind === "research" ? (
            <div className="mx-auto max-w-2xl px-5 py-5">
              <p className="mb-2 text-sm text-muted">{it.kind === "conversation" ? "Linked conversation" : "Linked research"} — opens in its workspace.</p>
              {it.text && <Markdown text={it.text} />}
              <a href={it.kind === "research" ? "/dashboard/research" : "/dashboard"} className="mt-3 inline-block rounded-lg bg-gradient-to-r from-brand to-violet px-3 py-1.5 text-[13px] font-semibold text-ink">Open {it.kind} →</a>
            </div>
          )
          : it.kind === "ai" || it.kind === "artifact" ? <div className="mx-auto max-w-2xl px-5 py-5"><Markdown text={it.text ?? ""} /></div>
          : <textarea autoFocus value={it.text ?? ""} onChange={(e) => updateItem(world.id, it.id, { text: e.target.value })} placeholder={`Write your ${it.kind}…`} className="h-full w-full resize-none bg-transparent px-5 py-5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-faint" />}
      </div>
    </div>
  );
}

function ItemCard({ world, it, onView }: { world: World; it: WorldItem; onView: (it: WorldItem) => void }) {
  const { togglePin, removeItem } = useWorlds();
  const meta = KIND_META[it.kind];
  const openable = it.kind === "file" || it.kind === "image" || it.kind === "video" || it.kind === "note" || it.kind === "ai" || it.kind === "artifact";
  return (
    <div className="group relative flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 p-3">
      <span className="grid h-8 w-8 flex-none place-items-center rounded-lg text-sm" style={{ background: `${meta.color}1f`, color: meta.color }}><KindIcon kind={(it.file?.fkind ?? "other") as any} size={15} /></span>
      <button onClick={() => openable && onView(it)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-medium text-ink">{it.title}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: meta.color }}>{it.kind}</p>
        {it.text && <p className="mt-0.5 line-clamp-2 text-[11px] text-faint">{it.text}</p>}
      </button>
      <div className="flex flex-none flex-col items-end gap-1">
        <button onClick={() => togglePin(world.id, it.id)} title={it.pinned ? "Unpin" : "Pin"} className={it.pinned ? "text-amber-300" : "text-faint opacity-0 transition hover:text-muted group-hover:opacity-100"}>★</button>
        <button onClick={() => removeItem(world.id, it.id)} className="text-faint opacity-0 transition hover:text-danger group-hover:opacity-100">✕</button>
      </div>
    </div>
  );
}

function ViewerModal({ it, world, onClose, onChange }: { it: WorldItem; world: World; onClose: () => void; onChange: (p: Partial<WorldItem>) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }} onClick={(e) => e.stopPropagation()} className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex flex-none items-center justify-between border-b border-line px-4 py-2.5">
          <span className="truncate text-sm font-medium text-ink">{it.title}</span>
          <button onClick={onClose} className="text-faint hover:text-ink">✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {it.file ? <FileViewer file={toStudioFile(it)} />
            : it.kind === "note" ? <textarea value={it.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} placeholder="Write…" className="h-full w-full resize-none bg-transparent p-5 text-[15px] leading-relaxed text-ink outline-none" />
            : <div className="px-5 py-5"><Markdown text={it.text ?? ""} /></div>}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ImportPicker({ world, onClose }: { world: World; onClose: () => void }) {
  const { conversations } = useDashboard();
  const { addItem } = useWorlds();
  const [tab, setTab] = useState<"conversation" | "research">("conversation");
  const research: { id: string; title: string; summary?: string }[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("nexera.research.history.v1") ?? "[]"); } catch { return []; }
  }, []);
  const existing = new Set(world.items.filter((i) => i.refId).map((i) => i.refId));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()} className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
        <div className="flex flex-none gap-1 border-b border-line p-2">
          {(["conversation", "research"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${tab === t ? "bg-surface-3 text-ink" : "text-muted hover:text-ink"}`}>{t === "conversation" ? "Conversations" : "Research"}</button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {tab === "conversation" ? (
            conversations.filter((c) => c.messages.length).map((c) => (
              <ImportRow key={c.id} title={c.title} added={existing.has(c.id)} onAdd={() => addItem(world.id, { kind: "conversation", title: c.title, refId: c.id })} />
            ))
          ) : (
            research.map((r) => (
              <ImportRow key={r.id} title={r.title} added={existing.has(r.id)} onAdd={() => addItem(world.id, { kind: "research", title: r.title, refId: r.id, text: r.summary?.slice(0, 200) })} />
            ))
          )}
          {((tab === "conversation" && !conversations.some((c) => c.messages.length)) || (tab === "research" && research.length === 0)) && (
            <p className="px-2 py-6 text-center text-sm text-faint">Nothing to import yet.</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
function ImportRow({ title, added, onAdd }: { title: string; added: boolean; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-surface-2">
      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{title}</span>
      <button onClick={onAdd} disabled={added} className="rounded-md bg-surface-3 px-2 py-0.5 text-[11px] text-ink hover:bg-surface-2 disabled:opacity-40">{added ? "added" : "+ add"}</button>
    </div>
  );
}

function SettingsMenu({ world, close }: { world: World; close: () => void }) {
  const { toggleArchive, deleteWorld, updateWorld } = useWorlds();
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={close} />
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-line bg-surface p-1.5 shadow-pop backdrop-blur-xl">
        <div className="flex gap-1 px-1.5 py-1">
          {["#8b5cf6", "#3b82f6", "#22d3ee", "#34f5a0", "#fb7185", "#fbbf24"].map((col) => (
            <button key={col} onClick={() => updateWorld(world.id, { color: col })} className="h-5 w-5 rounded-full ring-1 ring-line" style={{ background: col }} />
          ))}
        </div>
        <button onClick={() => { toggleArchive(world.id); close(); }} className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-ink hover:bg-surface-2">{world.archived ? "Unarchive" : "Archive"}</button>
        <button onClick={() => { if (confirm(`Delete "${world.name}"? This cannot be undone.`)) deleteWorld(world.id); }} className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-danger hover:bg-danger/10">Delete world</button>
      </motion.div>
    </>
  );
}

/* ============================================================ RIGHT PANEL */

export function WorldRightPanel({ world }: { world: World }) {
  const { worlds, addMemory, removeMemory, linkWorld, updateWorld, toggleShare, toggleArchive, addItem, updateItem, removeItem } = useWorlds();
  const [mem, setMem] = useState("");
  const [tag, setTag] = useState("");
  const [task, setTask] = useState("");
  const tasks = world.items.filter((i) => i.kind === "task");
  const c = ITEM_COUNTS(world);
  const files = world.items.filter((i) => i.file).slice(0, 5);
  const storageKb = world.items.reduce((s, i) => s + (i.text?.length ?? 0) / 1024 + (i.file ? parseFloat(i.file.size) || 0 : 0), 0);
  const linkable = worlds.filter((w) => w.id !== world.id && !world.linkedWorldIds.includes(w.id) && !w.archived);
  const linked = worlds.filter((w) => world.linkedWorldIds.includes(w.id));
  const context = `${world.name} holds ${world.items.length} items: ${Object.entries(c).map(([k, n]) => `${n} ${k}`).join(", ") || "nothing yet"}.${world.memory.length ? ` Memory: ${world.memory.map((m) => m.text).join("; ").slice(0, 220)}.` : ""}`;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <Panel title="World Memory">
        <form onSubmit={(e) => { e.preventDefault(); addMemory(world.id, mem); setMem(""); }} className="mb-2 flex gap-1.5">
          <input value={mem} onChange={(e) => setMem(e.target.value)} placeholder="Add durable context…" className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs text-ink placeholder:text-faint outline-none focus:border-brand/40" />
          <button className="rounded-lg bg-surface-3 px-2 text-ink hover:bg-surface-2">+</button>
        </form>
        {world.memory.length === 0 ? <Empty>What should the AI always remember about this world?</Empty> : (
          <ul className="space-y-1.5">
            {world.memory.map((m) => (
              <li key={m.id} className="group flex items-start gap-2 rounded-lg bg-surface-2 px-2 py-1.5 text-[12px] text-ink">
                <span className="text-brand">◆</span><span className="min-w-0 flex-1">{m.text}</span>
                <button onClick={() => removeMemory(world.id, m.id)} className="text-faint opacity-0 transition hover:text-danger group-hover:opacity-100">✕</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Tasks">
        <form onSubmit={(e) => { e.preventDefault(); if (task.trim()) { addItem(world.id, { kind: "task", title: task.trim(), done: false }); setTask(""); } }} className="mb-2 flex gap-1.5">
          <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a task…" className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs text-ink placeholder:text-faint outline-none focus:border-brand/40" />
          <button className="rounded-lg bg-surface-3 px-2 text-ink hover:bg-surface-2">+</button>
        </form>
        {tasks.length === 0 ? <Empty>No tasks yet.</Empty> : (
          <ul className="space-y-1">
            {tasks.slice(0, 8).map((t) => (
              <li key={t.id} className="group flex items-center gap-2 text-[12.5px]">
                <button onClick={() => updateItem(world.id, t.id, { done: !t.done })} className={`grid h-4 w-4 flex-none place-items-center rounded border text-[9px] ${t.done ? "border-success bg-success/20 text-success" : "border-line"}`}>{t.done ? "✓" : ""}</button>
                <span className={`min-w-0 flex-1 truncate ${t.done ? "text-faint line-through" : "text-ink"}`}>{t.title}</span>
                <button onClick={() => removeItem(world.id, t.id)} className="text-faint opacity-0 transition hover:text-danger group-hover:opacity-100">✕</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="AI Context"><p className="text-[12px] leading-relaxed text-muted">{summarize(world)}</p></Panel>

      <Panel title="Reasoning">
        <ol className="space-y-1.5 text-[12px] text-muted">
          <li className="flex gap-2"><span className="text-brand">1.</span> Indexed {world.items.length} items across {Object.keys(ITEM_COUNTS(world)).length} types.</li>
          <li className="flex gap-2"><span className="text-brand">2.</span> {world.memory.length ? `Applying ${world.memory.length} memory note(s) as context.` : "No durable memory set yet."}</li>
          <li className="flex gap-2"><span className="text-brand">3.</span> {linked.length ? `Cross-referencing ${linked.length} linked world(s).` : "Standalone — no linked worlds."}</li>
        </ol>
      </Panel>

      <Panel title="Connected Agents">
        <div className="space-y-1.5">
          {CONNECTED_AGENTS.map((a) => (
            <div key={a.name} className="flex items-center gap-2 text-[12px]">
              <span className="grid h-6 w-6 flex-none place-items-center rounded-md text-white" style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}bb)`, fontSize: 10 }}>{a.glyph}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{a.name}</span>
              <span className="flex items-center gap-1 text-[10px] text-success"><span className="h-1.5 w-1.5 rounded-full bg-success fx-live" />ready</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Knowledge Graph"><KnowledgeGraph world={world} linked={linked} /></Panel>

      <Panel title="World Settings">
        <p className="mb-1.5 text-[11px] text-faint">Tags</p>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {(world.tags ?? []).map((t) => (
            <span key={t} className="group flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">#{t}<button onClick={() => updateWorld(world.id, { tags: (world.tags ?? []).filter((x) => x !== t) })} className="text-faint hover:text-danger">✕</button></span>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); if (tag.trim()) { updateWorld(world.id, { tags: [...(world.tags ?? []), tag.trim().toLowerCase()] }); setTag(""); } }}>
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="+ tag" className="w-16 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink outline-none focus:border-brand/40" />
          </form>
        </div>
        <p className="mb-1.5 text-[11px] text-faint">Members</p>
        <div className="mb-2 space-y-1">
          {(world.members ?? TEAM.slice(0, 1)).map((m) => (
            <div key={m.avatar} className="flex items-center gap-2 text-[12px]"><span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-navy to-ice text-[9px] font-bold text-ink">{m.avatar}</span><span className="text-ink">{m.name}</span><span className="text-[10px] text-faint">{m.role}</span></div>
          ))}
          {(world.members ?? []).length < TEAM.length && (
            <button onClick={() => { const have = new Set((world.members ?? []).map((m) => m.avatar)); const add = TEAM.find((m) => !have.has(m.avatar)); if (add) updateWorld(world.id, { members: [...(world.members ?? []), add] }); }} className="text-[11px] text-brand hover:underline">+ Add member</button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => toggleShare(world.id)} className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] ${world.shared ? "border-brand/40 bg-brand/10 text-brand" : "border-line text-muted hover:bg-surface-2"}`}>{world.shared ? "Shared" : "Share"}</button>
          <button onClick={() => toggleArchive(world.id)} className="flex-1 rounded-lg border border-line px-2 py-1.5 text-[11px] text-muted hover:bg-surface-2">{world.archived ? "Unarchive" : "Archive"}</button>
        </div>
      </Panel>

      <Panel title="Linked Worlds">
        {linked.length > 0 && <div className="mb-2 space-y-1">{linked.map((w) => <div key={w.id} className="flex items-center gap-2 text-[13px] text-ink"><span>{w.emoji}</span><span className="truncate">{w.name}</span></div>)}</div>}
        {linkable.length > 0 ? (
          <select onChange={(e) => e.target.value && linkWorld(world.id, e.target.value)} value="" className="w-full rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-xs text-ink outline-none focus:border-brand/40">
            <option value="">+ Link a world…</option>
            {linkable.map((w) => <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>)}
          </select>
        ) : linked.length === 0 && <Empty>No other worlds to link.</Empty>}
      </Panel>

      <Panel title="Recent Documents">
        {files.length === 0 ? <Empty>No files yet.</Empty> : <ul className="space-y-1">{files.map((f) => <li key={f.id} className="truncate text-[12px] text-ink">📄 {f.title}</li>)}</ul>}
      </Panel>

      <Panel title="Statistics">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(KIND_META).map(([k, m]) => (
            <div key={k} className="flex items-center justify-between rounded-lg bg-surface-2 px-2 py-1.5 text-[12px]">
              <span className="text-muted">{m.label}</span><span className="font-mono font-semibold text-ink">{c[k as ItemKind] ?? 0}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Storage">
        <div className="flex items-end justify-between"><span className="font-mono text-lg text-ink">{storageKb < 1024 ? `${storageKb.toFixed(0)} KB` : `${(storageKb / 1024).toFixed(1)} MB`}</span><span className="text-[10px] text-faint">local</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-gradient-to-r from-brand to-violet" style={{ width: `${Math.min(100, (storageKb / 5120) * 100)}%` }} /></div>
      </Panel>
    </div>
  );
}

function KnowledgeGraph({ world, linked }: { world: World; linked: World[] }) {
  const c = ITEM_COUNTS(world);
  const kinds = Object.entries(c).filter(([, n]) => n > 0) as [ItemKind, number][];
  const nodes = [...kinds.map(([k, n]) => ({ label: `${n} ${k}`, color: KIND_META[k].color })), ...linked.map((w) => ({ label: w.name, color: w.color }))];
  const cx = 150, cy = 110, R = 80;
  return (
    <svg viewBox="0 0 300 220" className="w-full">
      {nodes.map((nd, i) => {
        const a = (i / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.12)" />
            <circle cx={x} cy={y} r="5" fill={nd.color} />
            <text x={x} y={y - 8} fill="#b4bce0" fontSize="8" textAnchor="middle">{nd.label.slice(0, 16)}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r="22" fill={`${world.color}55`} stroke={world.color} />
      <text x={cx} y={cy + 4} fontSize="16" textAnchor="middle">{world.emoji}</text>
      {nodes.length === 0 && <text x={cx} y={cy + 45} fill="#8b93b8" fontSize="9" textAnchor="middle">Add items to grow the graph</text>}
    </svg>
  );
}

/* ---- bits ---- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-5"><h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">{title}</h2>{children}</section>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-white/[0.025] p-3"><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{title}</p>{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) { return <p className="text-[12px] text-faint">{children}</p>; }
function ToolbarBtn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return <button onClick={onClick} className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${active ? "border-brand/40 bg-brand/10 text-brand" : "border-line text-muted hover:bg-surface-2 hover:text-ink"}`}>{children}</button>;
}
function AddBtn({ children, onClick, as }: { children: React.ReactNode; onClick?: () => void; as?: "span" }) {
  const cls = "inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-3 hover:text-ink";
  return as === "span" ? <span className={cls}>{children}</span> : <button onClick={onClick} className={cls}>{children}</button>;
}
