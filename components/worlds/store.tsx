"use client";

/* NEX-ERA WORLDS — the central OS store.
   A World is a container for everything about a project: notes, tasks, uploaded
   files, plus links to conversations (dashboard store) and research (research
   store). Pins surface key items; memory holds durable AI context; links connect
   Worlds. Persists to localStorage (guarded so it never clobbers on mount). */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { detectKind, type ContentKind } from "@/components/studio/store";

export type ItemKind = "note" | "task" | "file" | "conversation" | "research" | "artifact" | "image" | "video" | "ai" | "prompt" | "notebook";

export type Member = { name: string; avatar: string; role: string };
export const TEAM: Member[] = [
  { name: "Rak", avatar: "RP", role: "Administrator" },
  { name: "Tushar", avatar: "TS", role: "FP&A Manager" },
  { name: "Vivek", avatar: "VK", role: "Business Analyst" },
];

export type WorldItem = {
  id: string;
  kind: ItemKind;
  title: string;
  createdAt: number;
  pinned?: boolean;
  text?: string;          // note / ai / artifact / research summary
  done?: boolean;         // task
  refId?: string;         // conversation / research id in its own store
  lang?: string;          // code artifact
  file?: { name: string; mime: string; fkind: ContentKind; url?: string; text?: string; size: string };
};

export type WMemory = { id: string; text: string; ts: number };
export type Activity = { id: string; label: string; ts: number };

export type World = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  favorite?: boolean;
  archived?: boolean;
  shared?: boolean;
  agent?: string;
  tags: string[];
  members: Member[];
  items: WorldItem[];
  memory: WMemory[];
  activity: Activity[];
  linkedWorldIds: string[];
  createdAt: number;
  updatedAt: number;
};

/** Deterministic AI-style summary from a world's contents. */
export function summarize(w: World): string {
  const c = ITEM_COUNTS(w);
  const parts = Object.entries(c).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}${n > 1 ? "s" : ""}`);
  if (!parts.length && !w.description) return "Empty world — add files, chats or research to begin.";
  const lead = w.description ? w.description.replace(/\.$/, "") + ". " : "";
  return `${lead}Holds ${parts.join(", ") || "no items yet"}.${w.memory.length ? ` ${w.memory.length} memory note${w.memory.length > 1 ? "s" : ""} guide the AI.` : ""}`;
}

/** Task-based progress 0–100. */
export function progressOf(w: World): number {
  const tasks = w.items.filter((i) => i.kind === "task");
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
}

export type Template = { id: string; name: string; emoji: string; color: string; tags: string[]; desc: string; seed: { kind: ItemKind; title: string; text?: string; done?: boolean }[] };
export const TEMPLATES: Template[] = [
  { id: "research", name: "Research Project", emoji: "🔬", color: "#22d3ee", tags: ["research"], desc: "Track sources, notes and a literature review.", seed: [{ kind: "note", title: "Research question", text: "" }, { kind: "task", title: "Gather 10 sources" }, { kind: "task", title: "Write summary" }] },
  { id: "invest", name: "Investment Thesis", emoji: "📈", color: "#34f5a0", tags: ["markets", "finance"], desc: "Build a thesis with data, risks and a watchlist.", seed: [{ kind: "note", title: "Thesis", text: "" }, { kind: "task", title: "Model valuation" }, { kind: "task", title: "List key risks" }] },
  { id: "product", name: "Product Build", emoji: "🚀", color: "#8b5cf6", tags: ["product", "code"], desc: "Specs, code artifacts and a task board.", seed: [{ kind: "note", title: "PRD", text: "" }, { kind: "task", title: "Define MVP scope" }, { kind: "task", title: "Ship v0" }] },
  { id: "language", name: "Language Course", emoji: "🗣️", color: "#ec4899", tags: ["learning"], desc: "Lessons, vocab notes and progress.", seed: [{ kind: "note", title: "Goals", text: "" }, { kind: "task", title: "Daily practice" }] },
];

export type Filter = "all" | "favorites" | "recent" | "shared" | "archived";

const KEY = "nexera.worlds.v1";
const EMOJIS = ["🌌", "🚀", "🧬", "📊", "🛰️", "⚡", "🔮", "🧠", "🌐", "📡"];
const COLORS = ["#8b5cf6", "#3b82f6", "#22d3ee", "#34f5a0", "#fb7185", "#fbbf24", "#ec4899"];

type WorldsState = {
  worlds: World[];
  activeId: string | null;
  filter: Filter;
  active: World | null;
  setFilter: (f: Filter) => void;
  selectWorld: (id: string | null) => void;
  createWorld: (name: string) => string;
  createFromTemplate: (t: Template) => string;
  updateWorld: (id: string, patch: Partial<World>) => void;
  deleteWorld: (id: string) => void;
  duplicateWorld: (id: string) => void;
  toggleFavorite: (id: string) => void;
  toggleArchive: (id: string) => void;
  toggleShare: (id: string) => void;
  linkWorld: (id: string, otherId: string) => void;
  addItem: (worldId: string, item: Omit<WorldItem, "id" | "createdAt">) => string;
  updateItem: (worldId: string, itemId: string, patch: Partial<WorldItem>) => void;
  removeItem: (worldId: string, itemId: string) => void;
  togglePin: (worldId: string, itemId: string) => void;
  addMemory: (worldId: string, text: string) => void;
  removeMemory: (worldId: string, mid: string) => void;
};

const Ctx = createContext<WorldsState | null>(null);

export function WorldsProvider({ children }: { children: ReactNode }) {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setWorlds(JSON.parse(raw)); } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      // Drop transient object URLs before persisting (revoked on reload anyway).
      const slim = worlds.map((w) => ({ ...w, items: w.items.map((it) => (it.file?.url ? { ...it, file: { ...it.file, url: undefined } } : it)) }));
      localStorage.setItem(KEY, JSON.stringify(slim));
    } catch { /* ignore */ }
  }, [worlds, ready]);

  const active = useMemo(() => worlds.find((w) => w.id === activeId) ?? null, [worlds, activeId]);

  const touch = (w: World): World => ({ ...w, updatedAt: Date.now() });
  const mutate = useCallback((id: string, fn: (w: World) => World) => {
    setWorlds((p) => p.map((w) => (w.id === id ? touch(fn(w)) : w)));
  }, []);
  const log = (w: World, label: string): World => ({ ...w, activity: [{ id: crypto.randomUUID(), label, ts: Date.now() }, ...w.activity].slice(0, 40) });

  const createWorld = useCallback((name: string) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const i = Math.floor(Math.random() * EMOJIS.length);
    const w: World = {
      id, name: name.trim() || "Untitled World", emoji: EMOJIS[i], color: COLORS[i % COLORS.length],
      description: "", tags: [], members: [TEAM[0]], items: [], memory: [], activity: [{ id: crypto.randomUUID(), label: "World created", ts: now }],
      linkedWorldIds: [], createdAt: now, updatedAt: now,
    };
    setWorlds((p) => [w, ...p]);
    setActiveId(id);
    return id;
  }, []);

  const createFromTemplate = useCallback((t: Template) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const w: World = {
      id, name: t.name, emoji: t.emoji, color: t.color, description: t.desc, tags: t.tags, members: [TEAM[0]],
      items: t.seed.map((s) => ({ ...s, id: crypto.randomUUID(), createdAt: now })),
      memory: [], activity: [{ id: crypto.randomUUID(), label: `Created from "${t.name}" template`, ts: now }],
      linkedWorldIds: [], createdAt: now, updatedAt: now,
    };
    setWorlds((p) => [w, ...p]);
    setActiveId(id);
    return id;
  }, []);

  const updateWorld = useCallback((id: string, patch: Partial<World>) => mutate(id, (w) => ({ ...w, ...patch })), [mutate]);
  const deleteWorld = useCallback((id: string) => { setWorlds((p) => p.filter((w) => w.id !== id)); setActiveId((c) => (c === id ? null : c)); }, []);
  const duplicateWorld = useCallback((id: string) => {
    setWorlds((p) => {
      const w = p.find((x) => x.id === id); if (!w) return p;
      const copy: World = { ...w, id: crypto.randomUUID(), name: `${w.name} (copy)`, favorite: false, createdAt: Date.now(), updatedAt: Date.now(), activity: [{ id: crypto.randomUUID(), label: "Duplicated", ts: Date.now() }] };
      return [copy, ...p];
    });
  }, []);
  const toggleFavorite = useCallback((id: string) => mutate(id, (w) => ({ ...w, favorite: !w.favorite })), [mutate]);
  const toggleArchive = useCallback((id: string) => mutate(id, (w) => log({ ...w, archived: !w.archived }, w.archived ? "Unarchived" : "Archived")), [mutate]);
  const toggleShare = useCallback((id: string) => mutate(id, (w) => ({ ...w, shared: !w.shared })), [mutate]);
  const linkWorld = useCallback((id: string, otherId: string) => mutate(id, (w) => (w.linkedWorldIds.includes(otherId) ? w : { ...w, linkedWorldIds: [...w.linkedWorldIds, otherId] })), [mutate]);

  const addItem = useCallback((worldId: string, item: Omit<WorldItem, "id" | "createdAt">) => {
    // id minted outside the updater (StrictMode double-invokes updaters).
    const it: WorldItem = { ...item, id: crypto.randomUUID(), createdAt: Date.now() };
    mutate(worldId, (w) => log({ ...w, items: [it, ...w.items] }, `Added ${item.kind}: ${item.title.slice(0, 30)}`));
    return it.id;
  }, [mutate]);
  const updateItem = useCallback((worldId: string, itemId: string, patch: Partial<WorldItem>) =>
    mutate(worldId, (w) => ({ ...w, items: w.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) })), [mutate]);
  const removeItem = useCallback((worldId: string, itemId: string) =>
    mutate(worldId, (w) => ({ ...w, items: w.items.filter((it) => it.id !== itemId) })), [mutate]);
  const togglePin = useCallback((worldId: string, itemId: string) =>
    mutate(worldId, (w) => ({ ...w, items: w.items.map((it) => (it.id === itemId ? { ...it, pinned: !it.pinned } : it)) })), [mutate]);
  const addMemory = useCallback((worldId: string, text: string) => {
    if (!text.trim()) return;
    mutate(worldId, (w) => ({ ...w, memory: [{ id: crypto.randomUUID(), text: text.trim(), ts: Date.now() }, ...w.memory] }));
  }, [mutate]);
  const removeMemory = useCallback((worldId: string, mid: string) => mutate(worldId, (w) => ({ ...w, memory: w.memory.filter((m) => m.id !== mid) })), [mutate]);

  return (
    <Ctx.Provider value={{ worlds, activeId, filter, active, setFilter, selectWorld: setActiveId, createWorld, createFromTemplate, updateWorld, deleteWorld, duplicateWorld, toggleFavorite, toggleArchive, toggleShare, linkWorld, addItem, updateItem, removeItem, togglePin, addMemory, removeMemory }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWorlds() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorlds must be used within WorldsProvider");
  return v;
}

/* ---- helpers ---- */
export function fileToItem(file: File): { item: Omit<WorldItem, "id" | "createdAt">; revoke?: string } {
  const fkind = detectKind(file.name, file.type);
  const kind: ItemKind = fkind === "image" ? "image" : fkind === "video" ? "video" : "file";
  const previewable = fkind === "image" || fkind === "pdf" || fkind === "video" || fkind === "audio";
  const url = previewable ? URL.createObjectURL(file) : undefined;
  return {
    item: { kind, title: file.name, file: { name: file.name, mime: file.type || "application/octet-stream", fkind, url, size: `${(file.size / 1024).toFixed(0)} KB` } },
    revoke: url,
  };
}

export const ITEM_COUNTS = (w: World) => {
  const c: Record<string, number> = {};
  w.items.forEach((it) => { c[it.kind] = (c[it.kind] ?? 0) + 1; });
  return c;
};
