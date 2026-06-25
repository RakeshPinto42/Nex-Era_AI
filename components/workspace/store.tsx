"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  seedWorkspace,
  buildTree,
  langFor,
  type VFS,
  type TreeNode,
} from "@/lib/workspace/vfs";
import {
  fsAccessSupported,
  pickDirectory,
  ensureRW,
  loadDir,
  writeFile as fsWrite,
  deleteEntry as fsDelete,
  type DirHandle,
  type FileHandle,
} from "@/lib/workspace/fsAccess";

export type LogLevel = "info" | "action" | "success" | "warn" | "error" | "output";
export type LogEntry = { id: string; ts: string; level: LogLevel; msg: string };
export type TermLine = { id: string; kind: "cmd" | "out" | "err"; text: string };

export type TaskKind = "search" | "read" | "generate" | "edit" | "create" | "run" | "report" | "download";
export type TaskStatus = "pending" | "running" | "done" | "error";
export type Task = { id: string; kind: TaskKind; title: string; status: TaskStatus; progress: number };

const now = () =>
  new Date().toLocaleTimeString("en-US", { hour12: false }) +
  "." +
  String(Date.now() % 1000).padStart(3, "0");

type WorkspaceState = {
  vfs: VFS;
  tree: TreeNode[];
  folderName: string;
  /** True once a real on-disk folder is attached (vs the in-memory sample). */
  onDisk: boolean;
  fsSupported: boolean;

  tabs: string[];
  active: string | null;
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateActiveContent: (content: string) => void;
  saveActive: () => void;
  createFile: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;

  tasks: Task[];
  logs: LogEntry[];
  term: TermLine[];
  clearLogs: () => void;

  running: boolean;
  runAgent: (prompt: string) => void;
  selectFolder: () => Promise<void>;
};

const Ctx = createContext<WorkspaceState | null>(null);

// Paths excluded from the model context (binary/preview placeholders).
const isContextual = (content: string) =>
  !content.startsWith("// ") || content.includes("\n");

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [vfs, setVfs] = useState<VFS>(() => seedWorkspace());
  const [folderName, setFolderName] = useState("sales-analytics (sample)");
  const [onDisk, setOnDisk] = useState(false);
  const [tabs, setTabs] = useState<string[]>(["src/main.py"]);
  const [active, setActiveState] = useState<string | null>("src/main.py");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [term, setTerm] = useState<TermLine[]>([
    { id: "init", kind: "out", text: "NEXERA Coder ready. Open a folder to edit real files." },
  ]);
  const [running, setRunning] = useState(false);

  const tree = useMemo(() => buildTree(vfs), [vfs]);
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;

  const dirHandleRef = useRef<DirHandle | null>(null);
  const handlesRef = useRef<Map<string, FileHandle>>(new Map());
  const docPathsRef = useRef<Set<string>>(new Set());

  // ---- primitives ----
  const log = useCallback((level: LogLevel, msg: string) => {
    setLogs((l) => [...l, { id: crypto.randomUUID(), ts: now(), level, msg }]);
  }, []);
  const termLine = useCallback((kind: TermLine["kind"], text: string) => {
    setTerm((t) => [...t, { id: crypto.randomUUID(), kind, text }]);
  }, []);
  const clearLogs = useCallback(() => setLogs([]), []);

  // ---- editor ops ----
  const openFile = useCallback((path: string) => {
    setTabs((t) => (t.includes(path) ? t : [...t, path]));
    setActiveState(path);
  }, []);
  const setActive = useCallback((path: string) => setActiveState(path), []);
  const closeTab = useCallback((path: string) => {
    setTabs((t) => {
      const next = t.filter((p) => p !== path);
      setActiveState((cur) => (cur === path ? next[next.length - 1] ?? null : cur));
      return next;
    });
  }, []);
  const updateActiveContent = useCallback(
    (content: string) => {
      setVfs((v) => {
        if (!active || !v[active]) return v;
        return { ...v, [active]: { ...v[active], content, dirty: true } };
      });
    },
    [active],
  );

  // Persist a path to disk (if a real folder is attached) and return success.
  const persist = useCallback(
    async (path: string, content: string): Promise<boolean> => {
      const root = dirHandleRef.current;
      if (!root) return false;
      try {
        const fh = await fsWrite(root, path, content);
        handlesRef.current.set(path, fh);
        return true;
      } catch (e) {
        log("error", `Write failed: ${path} — ${(e as Error).message}`);
        return false;
      }
    },
    [log],
  );

  const saveActive = useCallback(() => {
    const path = active;
    if (!path) return;
    const file = vfsRef.current[path];
    if (!file) return;
    void (async () => {
      const wrote = await persist(path, file.content);
      setVfs((v) => (v[path] ? { ...v, [path]: { ...v[path], dirty: false } } : v));
      if (wrote) {
        log("success", `Saved ${path}`);
        termLine("out", `~ ${path} (saved to disk)`);
      }
    })();
  }, [active, persist, log, termLine]);

  const createFile = useCallback(
    async (path: string) => {
      const clean = path.trim().replace(/^\/+/, "");
      if (!clean || vfsRef.current[clean]) return;
      setVfs((v) => ({ ...v, [clean]: { path: clean, content: "", language: langFor(clean), dirty: !dirHandleRef.current } }));
      await persist(clean, "");
      openFile(clean);
      log("action", `New file ${clean}`);
    },
    [persist, openFile, log],
  );

  const deleteFile = useCallback(
    async (path: string) => {
      const root = dirHandleRef.current;
      if (root) {
        try {
          await fsDelete(root, path);
        } catch (e) {
          log("error", `Delete failed: ${path} — ${(e as Error).message}`);
          return;
        }
      }
      handlesRef.current.delete(path);
      setVfs((v) => {
        const next = { ...v };
        delete next[path];
        return next;
      });
      setTabs((t) => t.filter((p) => p !== path));
      setActiveState((cur) => (cur === path ? null : cur));
      log("action", `Deleted ${path}`);
      termLine("out", `- ${path}`);
    },
    [log, termLine],
  );

  // ---- folder picker (real read/write) ----
  const selectFolder = useCallback(async () => {
    if (!fsAccessSupported()) {
      log("warn", "File System Access API needs Chrome or Edge — using the sample workspace.");
      return;
    }
    try {
      const dir = await pickDirectory();
      if (!dir) return;
      if (!(await ensureRW(dir))) {
        log("error", "Read-write permission denied for that folder.");
        return;
      }
      log("info", `Reading “${dir.name}”…`);
      const { vfs: next, handles, docPaths, name } = await loadDir(dir);
      dirHandleRef.current = dir;
      handlesRef.current = handles;
      docPathsRef.current = docPaths;
      setVfs(next);
      setFolderName(name);
      setOnDisk(true);
      setTabs([]);
      setActiveState(null);
      const docs = docPaths.size ? ` · ${docPaths.size} document(s) extracted` : "";
      log("success", `Attached “${name}” — ${Object.keys(next).length} files${docs}. Edits save to disk.`);
      termLine("out", `cd ${name} && rak attach . (read-write)`);
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        log("error", `Folder load failed: ${(e as Error).message}`);
    }
  }, [log, termLine]);

  // ---- real agent runner ----
  const runAgent = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text || running) return;
      setRunning(true);
      setTasks([
        { id: "ctx", kind: "read", title: "Read folder context", status: "running", progress: 30 },
        { id: "gen", kind: "generate", title: "Generate changes", status: "pending", progress: 0 },
        { id: "apply", kind: "edit", title: "Apply to disk", status: "pending", progress: 0 },
      ]);
      const setTask = (id: string, status: TaskStatus, progress: number) =>
        setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status, progress } : t)));

      log("action", `▶ ${text}`);
      termLine("cmd", `rak agent run "${text}"`);

      try {
        const files = Object.values(vfsRef.current)
          .filter((f) => isContextual(f.content))
          .map((f) => ({ path: f.path, content: f.content }));
        setTask("ctx", "done", 100);
        setTask("gen", "running", 40);

        const res = await fetch("/api/code/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction: text, files }),
        });
        const data = await res.json();
        if (!res.ok) {
          setTask("gen", "error", 100);
          log("error", data.error || "Agent failed.");
          if (data.raw) termLine("err", String(data.raw).slice(0, 400));
          return;
        }
        setTask("gen", "done", 100);
        setTask("apply", "running", 30);

        if (data.summary) log("info", data.summary);

        let okCount = 0;
        for (const f of data.files ?? []) {
          const wrote = await persist(f.path, f.content);
          setVfs((v) => ({
            ...v,
            [f.path]: { path: f.path, content: f.content, language: langFor(f.path), dirty: !wrote },
          }));
          openFile(f.path);
          okCount++;
          const mark = f.action === "create" ? "+" : "~";
          log(f.action === "create" ? "success" : "action", `${mark} ${f.path}`);
          termLine("out", `${mark} ${f.path}`);
        }
        for (const p of data.deleted ?? []) {
          await deleteFile(p);
        }

        setTask("apply", "done", 100);
        const where = dirHandleRef.current ? "saved to disk" : "in memory (open a folder to persist)";
        log("success", `✓ Done · ${okCount} file(s) ${where} · ${data.model ?? ""}`);
        if (data.notes) log("info", data.notes);
        termLine("out", `done — ${okCount} file(s)`);
      } catch (e) {
        log("error", `Task failed: ${(e as Error).message}`);
      } finally {
        setRunning(false);
      }
    },
    [running, persist, openFile, deleteFile, log, termLine],
  );

  return (
    <Ctx.Provider
      value={{
        vfs,
        tree,
        folderName,
        onDisk,
        fsSupported: fsAccessSupported(),
        tabs,
        active,
        openFile,
        closeTab,
        setActive,
        updateActiveContent,
        saveActive,
        createFile,
        deleteFile,
        tasks,
        logs,
        term,
        clearLogs,
        running,
        runAgent,
        selectFolder,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return v;
}
