"use client";

/* NEX-ERA WORLDS — shell. Left rail (filters + world list + New World), center
   (world grid ↔ World Overview), right OS panel. The central operating system:
   every World aggregates conversations, research, files, notes, tasks & memory. */

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWorlds, ITEM_COUNTS, TEMPLATES, type Filter } from "./store";
import { WorldCard, WorldOverview, WorldRightPanel } from "./views";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "My Worlds" },
  { id: "favorites", label: "Favorites" },
  { id: "recent", label: "Recent" },
  { id: "shared", label: "Shared" },
  { id: "archived", label: "Archived" },
];

function rel(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "now"; if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`;
}

export default function WorldsApp() {
  const { worlds, active, activeId, filter, setFilter, selectWorld, createWorld, createFromTemplate } = useWorlds();
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = useMemo(() => [...new Set(worlds.flatMap((w) => w.tags ?? []))].slice(0, 10), [worlds]);

  const list = useMemo(() => {
    let l = worlds;
    if (filter === "archived") l = l.filter((w) => w.archived);
    else if (filter === "favorites") l = l.filter((w) => w.favorite && !w.archived);
    else if (filter === "shared") l = l.filter((w) => w.shared && !w.archived);
    else l = l.filter((w) => !w.archived);
    if (q.trim()) { const s = q.toLowerCase(); l = l.filter((w) => w.name.toLowerCase().includes(s) || (w.tags ?? []).some((t) => t.includes(s)) || w.description.toLowerCase().includes(s)); }
    if (tagFilter) l = l.filter((w) => (w.tags ?? []).includes(tagFilter));
    return [...l].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [worlds, filter, q, tagFilter]);

  return (
    <div className="flex h-full bg-surface text-ink">
      {/* LEFT — world browser (hidden once a world is open; the world brings its own nav) */}
      <aside className={`hidden w-[260px] flex-none flex-col border-r border-line bg-surface ${active ? "" : "lg:flex"}`}>
        <div className="flex-none p-3">
          <button onClick={() => createWorld("Untitled World")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-violet px-3 py-2.5 text-sm font-semibold text-ink shadow-sm shadow-brand/20 transition hover:brightness-110">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New World
          </button>
        </div>
        <nav className="flex-none px-2">
          {FILTERS.map((f) => {
            const n = f.id === "archived" ? worlds.filter((w) => w.archived).length
              : f.id === "favorites" ? worlds.filter((w) => w.favorite && !w.archived).length
              : f.id === "shared" ? worlds.filter((w) => w.shared && !w.archived).length
              : worlds.filter((w) => !w.archived).length;
            return (
              <button key={f.id} onClick={() => { setFilter(f.id); selectWorld(null); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${filter === f.id && !activeId ? "bg-brand/[0.12] text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                {f.label}<span className="font-mono text-[11px] text-faint">{n}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{FILTERS.find((f) => f.id === filter)?.label}</p>
          {list.map((w) => {
            const c = ITEM_COUNTS(w);
            return (
              <button key={w.id} onClick={() => selectWorld(w.id)} className={`group mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${w.id === activeId ? "bg-brand/[0.12]" : "hover:bg-surface-2"}`}>
                <span className="grid h-8 w-8 flex-none place-items-center rounded-lg text-base" style={{ background: `${w.color}22` }}>{w.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{w.name}</span>
                    {w.favorite && <span className="text-[10px] text-amber-300">★</span>}
                  </span>
                  <span className="flex items-center gap-2 font-mono text-[10px] text-faint">
                    <span>{rel(w.updatedAt)}</span>
                    <span>· {(c.file ?? 0) + (c.image ?? 0) + (c.video ?? 0)}f</span>
                    <span>· {c.conversation ?? 0}c</span>
                    {w.agent && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                  </span>
                </span>
              </button>
            );
          })}
          {list.length === 0 && <p className="px-2 py-3 text-[12px] text-faint">No worlds here.</p>}
        </div>
      </aside>

      {/* CENTER */}
      <section className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div key={active.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <div className="flex items-center gap-2 border-b border-line px-4 py-2 lg:hidden">
                <button onClick={() => selectWorld(null)} className="text-sm text-muted hover:text-ink">← Worlds</button>
              </div>
              <div className="h-[calc(100%-0px)]"><WorldOverview world={active} /></div>
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto px-6 py-6">
              <div className="mx-auto max-w-5xl">
                {/* hero */}
                <div className="relative mb-5 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-brand/[0.10] via-white/[0.03] to-violet/[0.08] p-6">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet/20 blur-[90px]" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand/80">Central OS</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{filter === "all" ? "AI Worlds" : FILTERS.find((f) => f.id === filter)?.label}</h1>
                  <p className="mt-1 max-w-xl text-sm text-muted">Intelligent workspaces where conversations, files, agents, memory, prompts, research and outputs live together.</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">⌕</span>
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search worlds…" className="w-64 rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-sm text-ink placeholder:text-faint outline-none backdrop-blur-sm focus:border-brand/40" />
                    </div>
                    <button onClick={() => createWorld("Untitled World")} className="rounded-lg bg-gradient-to-r from-brand to-violet px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110">+ Create New World</button>
                    {allTags.length > 0 && <span className="mx-1 h-5 w-px bg-surface-3" />}
                    {allTags.map((t) => (
                      <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)} className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${tagFilter === t ? "bg-brand/20 text-brand" : "bg-surface-2 text-muted hover:text-ink"}`}>#{t}</button>
                    ))}
                  </div>
                </div>

                {/* templates */}
                {filter === "all" && !q && !tagFilter && (
                  <div className="mb-5">
                    <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">Start from a template</p>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {TEMPLATES.map((t) => (
                        <button key={t.id} onClick={() => createFromTemplate(t)} className="group flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 p-3 text-left transition-all hover:-translate-y-1 hover:border-brand/30 hover:bg-surface-2">
                          <span className="grid h-9 w-9 flex-none place-items-center rounded-lg text-lg" style={{ background: `${t.color}22` }}>{t.emoji}</span>
                          <span className="min-w-0"><span className="block truncate text-[13px] font-medium text-ink">{t.name}</span><span className="block truncate text-[10px] text-faint">{t.desc}</span></span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {list.length === 0 ? (
                  <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface-2/60 py-16 text-center">
                    <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand/25 to-violet/25 text-2xl">🌌</div>
                    <p className="font-medium text-ink">No worlds yet</p>
                    <p className="mb-4 text-sm text-faint">Create your first World to start collecting everything about a project.</p>
                    <button onClick={() => createWorld("My First World")} className="rounded-lg bg-gradient-to-r from-brand to-violet px-4 py-2 text-sm font-semibold text-ink">Create a World</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((w) => <WorldCard key={w.id} world={w} onOpen={() => selectWorld(w.id)} />)}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* RIGHT */}
      {active && (
        <aside className="hidden w-[320px] flex-none border-l border-line bg-surface xl:block">
          <WorldRightPanel world={active} />
        </aside>
      )}
    </div>
  );
}
