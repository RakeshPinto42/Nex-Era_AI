"use client";

/* ============================================================================
   NEX-ERA STUDIO — workspace store.
   ----------------------------------------------------------------------------
   The unified AI workspace state: tabs, split view, uploaded files (with client
   previews + server extraction), generated artifacts, tool-run log, references
   and pinned memory. Chat lives in the shared dashboard store (conversations =
   "Worlds"), so the Studio reuses it rather than forking a second chat history.

   Reusable + extensible: content kinds are a typed union; add a kind + a viewer
   in Viewers.tsx and it flows through tabs, split view and the file rail.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ----------------------------------------------------------------- types */

export type ContentKind =
  | "chat"
  | "image"
  | "pdf"
  | "sheet"
  | "doc"
  | "code"
  | "text"
  | "video"
  | "audio"
  | "artifact"
  | "other";

export type FileStatus = "parsing" | "ready" | "error";

export type StudioFile = {
  id: string;
  name: string;
  mime: string;
  size: string;
  kind: ContentKind;
  /** Object URL for in-browser preview (image/pdf/video/audio). */
  url?: string;
  /** Extracted / read text (doc, sheet, pdf, code, text). */
  text?: string;
  /** Parsed sheet rows (xlsx/csv) — first sheet. */
  rows?: string[][];
  /** Source language for code files. */
  lang?: string;
  status: FileStatus;
  error?: string;
};

export type Artifact = {
  id: string;
  title: string;
  kind: "code" | "markdown" | "html";
  lang?: string;
  content: string;
  createdAt: number;
};

export type ToolRun = {
  id: string;
  tool: string;
  label: string;
  status: "running" | "done" | "error";
  ts: number;
  detail?: string;
};

export type MemoryItem = { id: string; text: string; source: string; ts: number };

export type Tab = {
  id: string;
  kind: ContentKind;
  title: string;
  /** chat → dashboard conversation id. */
  convId?: string;
  /** file/artifact tabs point at their payload. */
  fileId?: string;
  artifactId?: string;
};

export type RightTab = "reasoning" | "tools" | "sources" | "memory" | "downloads" | "versions";

/* ----- canvas blocks: every interaction is a movable/collapsible artifact ----- */

export type BlockKind =
  | "prompt" | "response" | "code" | "table" | "chart"
  | "image" | "pdf" | "file" | "tool" | "note";

export type Block = {
  id: string;
  worldId: string;
  kind: BlockKind;
  order: number;
  collapsed?: boolean;
  pinned?: boolean;
  ts: number;
  // payloads (by kind)
  text?: string;            // prompt / response / note (markdown)
  streaming?: boolean;      // response
  model?: string;           // response
  intent?: string;          // response
  lang?: string;            // code
  code?: string;            // code
  rows?: string[][];        // table / chart source
  chartType?: "bar" | "line"; // chart
  fileId?: string;          // image / pdf / file → StudioFile
  tool?: { name: string; status: "running" | "done" | "error"; detail?: string }; // tool
  versions?: string[];      // response regeneration history
};

export type CanvasMode = "stream" | "canvas";

/** Skill pills that bias routing + are sent to the model run. */
export type Skill = "auto" | "chat" | "code" | "research" | "analyze";

/* ------------------------------------------------------------- detection */

const CODE_EXT = new Set([
  "js","jsx","ts","tsx","py","java","c","cpp","cs","go","rs","rb","php","sql","css","scss",
  "json","xml","yaml","yml","html","sh","bash","kt","swift","r","lua","toml",
]);
const SHEET_EXT = new Set(["xlsx", "xls", "csv", "tsv"]);
const DOC_EXT = new Set(["docx", "doc", "pptx", "ppt", "rtf", "odt"]);
const TEXT_EXT = new Set(["txt", "md", "markdown", "log"]);

function ext(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function detectKind(name: string, mime: string): ContentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || ext(name) === "pdf") return "pdf";
  const e = ext(name);
  if (SHEET_EXT.has(e)) return "sheet";
  if (DOC_EXT.has(e)) return "doc";
  if (CODE_EXT.has(e)) return "code";
  if (TEXT_EXT.has(e)) return "text";
  return "other";
}

/* ------------------------------------------------- block extraction utils */

/** Split a finished response into prose + fenced code blocks + markdown tables. */
export function blocksFromText(text: string): { code: { lang: string; code: string }[]; tables: string[][][] } {
  const code: { lang: string; code: string }[] = [];
  const parts = text.split(/```/);
  for (let i = 1; i < parts.length; i += 2) {
    const p = parts[i];
    const nl = p.indexOf("\n");
    const lang = nl > -1 ? p.slice(0, nl).trim() : "";
    const body = (nl > -1 ? p.slice(nl + 1) : p).replace(/\n$/, "");
    if (body.trim().length > 30) code.push({ lang: lang || "code", code: body });
  }
  // Markdown tables in the prose (outside fences).
  const prose = parts.filter((_, i) => i % 2 === 0).join("\n");
  const tables: string[][][] = [];
  const lines = prose.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\|.*\|\s*$/.test(lines[i]) && /^\s*\|?[\s:|-]*-[\s:|-]*$/.test(lines[i + 1] ?? "")) {
      const cells = (r: string) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
      const rows: string[][] = [cells(lines[i])];
      let j = i + 2;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) { rows.push(cells(lines[j])); j++; }
      if (rows.length > 1) tables.push(rows);
      i = j;
    }
  }
  return { code, tables };
}

/* --------------------------------------------------------------- context */

type StudioState = {
  tabs: Tab[];
  activeId: string | null;
  /** Secondary tab shown in split view (null = no split). */
  splitId: string | null;
  files: StudioFile[];
  artifacts: Artifact[];
  toolRuns: ToolRun[];
  memory: MemoryItem[];
  rightTab: RightTab;
  leftOpen: boolean;
  rightOpen: boolean;

  setRightTab: (t: RightTab) => void;
  toggleLeft: () => void;
  toggleRight: () => void;

  openTab: (tab: Omit<Tab, "id"> & { id?: string }) => string;
  openChatTab: (convId: string, title: string) => void;
  activate: (id: string) => void;
  closeTab: (id: string) => void;
  toggleSplit: (id?: string) => void;

  addFiles: (files: FileList | File[]) => Promise<void>;
  removeFile: (id: string) => void;

  addArtifact: (a: Omit<Artifact, "id" | "createdAt">) => void;
  logTool: (t: Omit<ToolRun, "id" | "ts">) => string;
  updateTool: (id: string, patch: Partial<ToolRun>) => void;

  pinMemory: (text: string, source: string) => void;
  removeMemory: (id: string) => void;

  // ---- canvas blocks ----
  blocks: Block[];
  canvasMode: CanvasMode;
  temperature: number;
  skill: Skill;
  setCanvasMode: (m: CanvasMode) => void;
  setTemperature: (t: number) => void;
  setSkill: (s: Skill) => void;
  blocksFor: (worldId: string) => Block[];
  hydrateWorld: (worldId: string, msgs: { role: string; content: string; intent?: string; model?: string }[]) => void;
  addBlock: (b: Omit<Block, "id" | "order" | "ts">) => string;
  updateBlock: (id: string, patch: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  moveBlock: (id: string, dir: -1 | 1) => void;
  reorderWorld: (worldId: string, orderedIds: string[]) => void;
  toggleCollapse: (id: string) => void;
  togglePinBlock: (id: string) => void;
};

const Ctx = createContext<StudioState | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [splitId, setSplitId] = useState<string | null>(null);
  const [files, setFiles] = useState<StudioFile[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [toolRuns, setToolRuns] = useState<ToolRun[]>([]);
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [rightTab, setRightTab] = useState<RightTab>("reasoning");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("stream");
  const [temperature, setTemperature] = useState(0.7);
  const [skill, setSkill] = useState<Skill>("auto");
  const hydrated = useRef<Set<string>>(new Set());

  // Track object URLs to revoke on unmount (avoid leaks).
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  // Persist pinned memory only (object URLs / extracted text are transient).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nexera.studio.memory.v1");
      if (raw) setMemory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("nexera.studio.memory.v1", JSON.stringify(memory));
    } catch {
      /* ignore */
    }
  }, [memory]);

  const openTab: StudioState["openTab"] = useCallback((tab) => {
    const id = tab.id ?? crypto.randomUUID();
    setTabs((prev) => (prev.some((t) => t.id === id) ? prev : [...prev, { ...tab, id }]));
    setActiveId(id);
    return id;
  }, []);

  const openChatTab = useCallback(
    (convId: string, title: string) => {
      const existing = tabs.find((t) => t.kind === "chat" && t.convId === convId);
      if (existing) {
        setActiveId(existing.id);
        return;
      }
      const id = crypto.randomUUID();
      // Pure updater (StrictMode double-invokes): id is generated once, outside.
      setTabs((prev) =>
        prev.some((t) => t.kind === "chat" && t.convId === convId) ? prev : [...prev, { id, kind: "chat", title, convId }],
      );
      setActiveId(id);
    },
    [tabs],
  );

  const activate = useCallback((id: string) => setActiveId(id), []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      setActiveId((cur) => (cur === id ? next[Math.max(0, idx - 1)]?.id ?? null : cur));
      setSplitId((s) => (s === id ? null : s));
      return next;
    });
  }, []);

  const toggleSplit = useCallback(
    (id?: string) => {
      setSplitId((cur) => {
        if (cur) return null;
        // Split against the requested tab, else the next tab after active.
        if (id && id !== activeId) return id;
        const others = tabs.filter((t) => t.id !== activeId);
        return others[0]?.id ?? null;
      });
    },
    [activeId, tabs],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.url) URL.revokeObjectURL(f.url);
      return prev.filter((x) => x.id !== id);
    });
    setTabs((prev) => prev.filter((t) => t.fileId !== id));
  }, []);

  const addArtifact = useCallback((a: Omit<Artifact, "id" | "createdAt">) => {
    const art: Artifact = { ...a, id: crypto.randomUUID(), createdAt: Date.now() };
    setArtifacts((prev) => [art, ...prev].slice(0, 50));
  }, []);

  const logTool = useCallback((t: Omit<ToolRun, "id" | "ts">) => {
    const id = crypto.randomUUID();
    setToolRuns((prev) => [{ ...t, id, ts: Date.now() }, ...prev].slice(0, 40));
    return id;
  }, []);
  const updateTool = useCallback((id: string, patch: Partial<ToolRun>) => {
    setToolRuns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const pinMemory = useCallback((text: string, source: string) => {
    setMemory((prev) => [{ id: crypto.randomUUID(), text, source, ts: Date.now() }, ...prev].slice(0, 100));
  }, []);
  const removeMemory = useCallback((id: string) => {
    setMemory((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ---- blocks ----
  const blocksFor = useCallback(
    (worldId: string) => blocks.filter((b) => b.worldId === worldId).sort((a, b) => a.order - b.order),
    [blocks],
  );

  const addBlock = useCallback((b: Omit<Block, "id" | "order" | "ts">) => {
    const id = crypto.randomUUID();
    setBlocks((prev) => {
      const max = prev.filter((x) => x.worldId === b.worldId).reduce((m, x) => Math.max(m, x.order), -1);
      return [...prev, { ...b, id, order: max + 1, ts: Date.now() }];
    });
    return id;
  }, []);

  const updateBlock = useCallback((id: string, patch: Partial<Block>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);
  const removeBlock = useCallback((id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id)), []);
  const toggleCollapse = useCallback((id: string) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, collapsed: !b.collapsed } : b))), []);
  const togglePinBlock = useCallback((id: string) => setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, pinned: !b.pinned } : b))), []);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const b = prev.find((x) => x.id === id);
      if (!b) return prev;
      const sibs = prev.filter((x) => x.worldId === b.worldId).sort((a, c) => a.order - c.order);
      const idx = sibs.findIndex((x) => x.id === id);
      const swap = sibs[idx + dir];
      if (!swap) return prev;
      return prev.map((x) => (x.id === b.id ? { ...x, order: swap.order } : x.id === swap.id ? { ...x, order: b.order } : x));
    });
  }, []);

  const reorderWorld = useCallback((worldId: string, orderedIds: string[]) => {
    setBlocks((prev) => prev.map((b) => (b.worldId === worldId ? { ...b, order: orderedIds.indexOf(b.id) } : b)));
  }, []);

  // Build blocks from an existing conversation the first time its world opens.
  const hydrateWorld = useCallback<StudioState["hydrateWorld"]>((worldId, msgs) => {
    if (hydrated.current.has(worldId)) return;
    hydrated.current.add(worldId);
    setBlocks((prev) => {
      if (prev.some((b) => b.worldId === worldId)) return prev;
      const built: Block[] = [];
      let order = 0;
      const push = (b: Partial<Block> & { kind: BlockKind }) =>
        built.push({ id: crypto.randomUUID(), worldId, order: order++, ts: Date.now(), ...b } as Block);
      for (const m of msgs) {
        if (m.role === "user") push({ kind: "prompt", text: m.content });
        else {
          push({ kind: "response", text: m.content, model: m.model, intent: m.intent });
          const { code, tables } = blocksFromText(m.content);
          code.forEach((c) => push({ kind: "code", lang: c.lang, code: c.code }));
          tables.forEach((rows) => push({ kind: "table", rows }));
        }
      }
      return [...prev, ...built];
    });
  }, []);

  // ---- upload pipeline: preview + extract + parse, then open a tab each ----
  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const picked = Array.from(list);
      if (picked.length === 0) return;

      const entries: { file: File; rec: StudioFile }[] = picked.map((file) => {
        const kind = detectKind(file.name, file.type);
        const previewable = kind === "image" || kind === "pdf" || kind === "video" || kind === "audio";
        const url = previewable ? URL.createObjectURL(file) : undefined;
        if (url) urls.current.push(url);
        return {
          file,
          rec: {
            id: crypto.randomUUID(),
            name: file.name,
            mime: file.type || "application/octet-stream",
            size: `${(file.size / 1024).toFixed(0)} KB`,
            kind,
            url,
            lang: kind === "code" ? ext(file.name) : undefined,
            status: previewable && kind !== "pdf" ? "ready" : "parsing",
          },
        };
      });

      setFiles((prev) => [...prev, ...entries.map((e) => e.rec)]);
      entries.forEach((e) => openTab({ kind: e.rec.kind, title: e.rec.name, fileId: e.rec.id }));

      // Per-file resolution.
      const needExtract: { file: File; id: string }[] = [];
      for (const { file, rec } of entries) {
        if (rec.kind === "code" || rec.kind === "text") {
          file
            .text()
            .then((t) => patchFile(rec.id, { text: t, status: "ready" }))
            .catch(() => patchFile(rec.id, { status: "error", error: "Could not read file" }));
        } else if (rec.kind === "sheet") {
          parseSheet(file)
            .then((rows) => patchFile(rec.id, { rows, status: "ready" }))
            .catch(() => needExtract.push({ file, id: rec.id })); // fall back to server text
        } else if (rec.kind === "pdf" || rec.kind === "doc") {
          needExtract.push({ file, id: rec.id });
        }
      }

      if (needExtract.length) {
        const tool = logTool({ tool: "extract", label: `Extracting ${needExtract.length} file(s)`, status: "running" });
        const form = new FormData();
        needExtract.forEach((n) => form.append("file", n.file));
        try {
          const res = await fetch("/api/extract", { method: "POST", body: form });
          const data = await res.json();
          const results: { kind?: string; text?: string; error?: string }[] = data.files ?? [];
          needExtract.forEach((n, i) => {
            const r = results[i];
            if (!r || r.kind === "error" || r.kind === "unsupported")
              patchFile(n.id, { status: "error", error: r?.error || "Can't read this type" });
            else patchFile(n.id, { text: r.text ?? "", status: "ready" });
          });
          updateTool(tool, { status: "done", detail: `${needExtract.length} extracted` });
        } catch {
          needExtract.forEach((n) => patchFile(n.id, { status: "error", error: "Extraction failed" }));
          updateTool(tool, { status: "error", detail: "request failed" });
        }
      }

      function patchFile(id: string, patch: Partial<StudioFile>) {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
      }
    },
    [openTab, logTool, updateTool],
  );

  return (
    <Ctx.Provider
      value={{
        tabs,
        activeId,
        splitId,
        files,
        artifacts,
        toolRuns,
        memory,
        rightTab,
        leftOpen,
        rightOpen,
        setRightTab,
        toggleLeft: () => setLeftOpen((v) => !v),
        toggleRight: () => setRightOpen((v) => !v),
        openTab,
        openChatTab,
        activate,
        closeTab,
        toggleSplit,
        addFiles,
        removeFile,
        addArtifact,
        logTool,
        updateTool,
        pinMemory,
        removeMemory,
        blocks,
        canvasMode,
        temperature,
        skill,
        setCanvasMode,
        setTemperature,
        setSkill,
        blocksFor,
        hydrateWorld,
        addBlock,
        updateBlock,
        removeBlock,
        moveBlock,
        reorderWorld,
        toggleCollapse,
        togglePinBlock,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStudio() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudio must be used within StudioProvider");
  return v;
}

/* ------------------------------------------------------- sheet parsing */
// Lazy-import xlsx only when a spreadsheet is actually opened (keeps it out of
// the initial Studio bundle).
async function parseSheet(file: File): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false, raw: false });
  return rows.slice(0, 200).map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? "" : String(c))) : []));
}
