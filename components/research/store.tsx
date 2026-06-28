"use client";

/* NEX-ERA RESEARCH — store. A "research" bundles a query/source set, a streamed
   AI summary with [n] citations, a source-quality + confidence read, notes, and
   a timeline of steps. History + collections persist to localStorage; saving to
   a World writes a dashboard conversation so it shows up across the OS. */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Mode = "web" | "pdf" | "youtube" | "website";
export type Source = { id: number; title: string; url: string; content: string; kind: string; quality: number };
export type TimelineEvent = { label: string; ts: number };
export type View = "canvas" | "timeline" | "mindmap" | "compare";

export type Research = {
  id: string;
  title: string;
  mode: Mode;
  query: string;
  url?: string;
  sources: Source[];
  summary: string;
  streaming: boolean;
  model?: string;
  confidence: number | null;
  notes: string;
  events: TimelineEvent[];
  savedWorldId?: string;
  createdAt: number;
  updatedAt: number;
};

export type Collection = { id: string; name: string; researchIds: string[] };

const HKEY = "nexera.research.history.v1";
const CKEY = "nexera.research.collections.v1";

// Domain-based source-quality heuristic (0–100). Transparent, not authoritative.
export function domainQuality(url: string): number {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (/\.gov(\.|$)|\.edu(\.|$)/.test(h)) return 95;
    if (/(reuters|bloomberg|wsj|ft\.com|nature|sciencedirect|who\.int|imf\.org|worldbank|oecd|nasa)/.test(h)) return 90;
    if (/(nytimes|bbc|theguardian|economist|cnbc|forbes|techcrunch|arstechnica|wikipedia)/.test(h)) return 80;
    if (/(medium|substack|blogspot|wordpress|reddit|quora|youtube)/.test(h)) return 55;
    return 68;
  } catch {
    return 60;
  }
}

export function confidenceOf(r: { sources: Source[]; summary: string }): number | null {
  if (!r.sources.length || !r.summary) return null;
  const avgQ = r.sources.reduce((s, x) => s + x.quality, 0) / r.sources.length;
  const breadth = Math.min(1, r.sources.length / 6); // more corroboration → higher
  const cited = (r.summary.match(/\[\d+\]/g) ?? []).length;
  const citeBoost = Math.min(1, cited / Math.max(2, r.sources.length)); // does it actually cite?
  return Math.round(Math.min(98, avgQ * 0.6 + breadth * 22 + citeBoost * 18));
}

type ResearchState = {
  history: Research[];
  collections: Collection[];
  activeId: string | null;
  active: Research | null;
  view: View;
  compareSel: number[];
  setView: (v: View) => void;
  toggleCompare: (id: number) => void;
  create: (mode: Mode, query: string, url?: string) => Research;
  open: (id: string) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<Research>) => void;
  addEvent: (id: string, label: string) => void;
  newCollection: (name: string) => void;
  addToCollection: (cid: string, rid: string) => void;
};

const Ctx = createContext<ResearchState | null>(null);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Research[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<View>("canvas");
  const [compareSel, setCompareSel] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const h = localStorage.getItem(HKEY); if (h) setHistory(JSON.parse(h));
      const c = localStorage.getItem(CKEY); if (c) setCollections(JSON.parse(c));
    } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      // Trim source bodies before persisting to keep localStorage lean.
      const slim = history.map((r) => ({ ...r, sources: r.sources.map((s) => ({ ...s, content: s.content.slice(0, 1500) })) }));
      localStorage.setItem(HKEY, JSON.stringify(slim.slice(0, 50)));
      localStorage.setItem(CKEY, JSON.stringify(collections));
    } catch { /* ignore */ }
  }, [history, collections, ready]);

  const active = useMemo(() => history.find((r) => r.id === activeId) ?? null, [history, activeId]);

  const create = useCallback((mode: Mode, query: string, url?: string) => {
    const now = Date.now();
    const r: Research = {
      id: crypto.randomUUID(),
      title: query || url || "Untitled research",
      mode, query, url,
      sources: [], summary: "", streaming: false, confidence: null, notes: "",
      events: [{ label: `Started ${mode} research`, ts: now }],
      createdAt: now, updatedAt: now,
    };
    setHistory((p) => [r, ...p]);
    setActiveId(r.id);
    setCompareSel([]);
    setView("canvas");
    return r;
  }, []);

  const open = useCallback((id: string) => { setActiveId(id); setCompareSel([]); setView("canvas"); }, []);
  const remove = useCallback((id: string) => {
    setHistory((p) => p.filter((r) => r.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);
  const update = useCallback((id: string, patch: Partial<Research>) => {
    setHistory((p) => p.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r)));
  }, []);
  const addEvent = useCallback((id: string, label: string) => {
    setHistory((p) => p.map((r) => (r.id === id ? { ...r, events: [...r.events, { label, ts: Date.now() }] } : r)));
  }, []);

  const toggleCompare = useCallback((sid: number) => {
    setCompareSel((p) => (p.includes(sid) ? p.filter((x) => x !== sid) : [...p, sid].slice(-2)));
  }, []);

  const newCollection = useCallback((name: string) => {
    if (!name.trim()) return;
    setCollections((p) => [...p, { id: crypto.randomUUID(), name: name.trim(), researchIds: [] }]);
  }, []);
  const addToCollection = useCallback((cid: string, rid: string) => {
    setCollections((p) => p.map((c) => (c.id === cid && !c.researchIds.includes(rid) ? { ...c, researchIds: [...c.researchIds, rid] } : c)));
  }, []);

  return (
    <Ctx.Provider value={{ history, collections, activeId, active, view, compareSel, setView, toggleCompare, create, open, remove, update, addEvent, newCollection, addToCollection }}>
      {children}
    </Ctx.Provider>
  );
}

export function useResearch() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useResearch must be used within ResearchProvider");
  return v;
}
