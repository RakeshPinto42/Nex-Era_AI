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

export type LogLevel = "info" | "action" | "success" | "warn" | "error" | "output";
export type LogEntry = { id: string; ts: string; level: LogLevel; msg: string };

export type TermLine = { id: string; kind: "cmd" | "out" | "err"; text: string };

export type TaskKind =
  | "search"
  | "read"
  | "generate"
  | "edit"
  | "create"
  | "run"
  | "report"
  | "download";

export type TaskStatus = "pending" | "running" | "done" | "error";
export type Task = {
  id: string;
  kind: TaskKind;
  title: string;
  status: TaskStatus;
  progress: number; // 0–100
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () =>
  new Date().toLocaleTimeString("en-US", { hour12: false }) +
  "." +
  String(Date.now() % 1000).padStart(3, "0");

type WorkspaceState = {
  vfs: VFS;
  tree: TreeNode[];
  folderName: string;

  tabs: string[];
  active: string | null;
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  setActive: (path: string) => void;
  updateActiveContent: (content: string) => void;
  saveActive: () => void;

  tasks: Task[];
  logs: LogEntry[];
  term: TermLine[];
  clearLogs: () => void;

  running: boolean;
  runAgent: (prompt: string) => void;
  selectFolder: () => Promise<void>;
};

const Ctx = createContext<WorkspaceState | null>(null);

const TEXT_EXT = new Set([
  "md", "txt", "py", "js", "ts", "tsx", "jsx", "json", "csv", "yml", "yaml", "toml", "cfg", "ini", "sh",
]);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [vfs, setVfs] = useState<VFS>(() => seedWorkspace());
  const [folderName, setFolderName] = useState("sales-analytics");
  const [tabs, setTabs] = useState<string[]>(["src/main.py"]);
  const [active, setActiveState] = useState<string | null>("src/main.py");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [term, setTerm] = useState<TermLine[]>([
    { id: "init", kind: "out", text: "NEXERA Coder ready. Sandbox: in-memory." },
  ]);
  const [running, setRunning] = useState(false);

  const tree = useMemo(() => buildTree(vfs), [vfs]);
  const vfsRef = useRef(vfs);
  vfsRef.current = vfs;

  // ---- editor ops ----
  const openFile = useCallback((path: string) => {
    setTabs((t) => (t.includes(path) ? t : [...t, path]));
    setActiveState(path);
  }, []);

  const setActive = useCallback((path: string) => setActiveState(path), []);

  const closeTab = useCallback(
    (path: string) => {
      setTabs((t) => {
        const next = t.filter((p) => p !== path);
        setActiveState((cur) =>
          cur === path ? next[next.length - 1] ?? null : cur,
        );
        return next;
      });
    },
    [],
  );

  const updateActiveContent = useCallback(
    (content: string) => {
      setVfs((v) => {
        if (!active || !v[active]) return v;
        return { ...v, [active]: { ...v[active], content, dirty: true } };
      });
    },
    [active],
  );

  const saveActive = useCallback(() => {
    setVfs((v) => {
      if (!active || !v[active]) return v;
      return { ...v, [active]: { ...v[active], dirty: false } };
    });
  }, [active]);

  // ---- log/term/task primitives ----
  const log = useCallback((level: LogLevel, msg: string) => {
    setLogs((l) => [...l, { id: crypto.randomUUID(), ts: now(), level, msg }]);
  }, []);
  const termLine = useCallback((kind: TermLine["kind"], text: string) => {
    setTerm((t) => [...t, { id: crypto.randomUUID(), kind, text }]);
  }, []);
  const setTaskProgress = useCallback(
    (id: string, progress: number, status?: TaskStatus) => {
      setTasks((ts) =>
        ts.map((t) =>
          t.id === id
            ? { ...t, progress, ...(status ? { status } : {}) }
            : t,
        ),
      );
    },
    [],
  );
  const clearLogs = useCallback(() => setLogs([]), []);

  const writeFile = useCallback(
    (path: string, content: string) => {
      setVfs((v) => ({
        ...v,
        [path]: { path, content, language: langFor(path), dirty: true },
      }));
    },
    [],
  );

  // ---- folder picker (real FS Access API, best-effort) ----
  const selectFolder = useCallback(async () => {
    const picker = (
      window as unknown as {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;
    if (!picker) {
      log("warn", "File System Access API unavailable — using sample workspace.");
      return;
    }
    try {
      const dir = await picker();
      const next: VFS = {};
      const walk = async (
        handle: FileSystemDirectoryHandle,
        prefix: string,
        depth: number,
      ) => {
        if (depth > 2) return;
        // @ts-expect-error - async iterator on directory handle
        for await (const [name, h] of handle.entries()) {
          if (name.startsWith(".") || name === "node_modules") continue;
          const path = prefix ? `${prefix}/${name}` : name;
          if (h.kind === "directory") {
            await walk(h as FileSystemDirectoryHandle, path, depth + 1);
          } else {
            const ext = name.split(".").pop()?.toLowerCase() ?? "";
            const file = await (h as FileSystemFileHandle).getFile();
            const content =
              TEXT_EXT.has(ext) && file.size < 200_000
                ? await file.text()
                : `// ${name} — ${(file.size / 1024).toFixed(0)} KB (not previewed)`;
            next[path] = { path, content, language: langFor(path) };
          }
        }
      };
      await walk(dir, "", 0);
      if (Object.keys(next).length) {
        setVfs(next);
        setFolderName(dir.name);
        setTabs([]);
        setActiveState(null);
        log("success", `Loaded folder “${dir.name}” (${Object.keys(next).length} files).`);
        termLine("out", `cd ${dir.name} && rak attach .`);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        log("error", `Folder load failed: ${(e as Error).message}`);
    }
  }, [log, termLine]);

  // ---- agent runner ----
  const runAgent = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text || running) return;
      setRunning(true);
      log("action", `▶ Agent task: ${text}`);
      termLine("cmd", `rak agent run "${text}"`);

      const plan = buildPlan(text, folderName);
      setTasks(plan.map((p) => ({ ...p.task })));

      try {
        for (const step of plan) {
          setTaskProgress(step.task.id, 5, "running");
          log("info", `→ ${step.task.title}`);
          await step.exec({
            log,
            term: termLine,
            writeFile,
            openFile,
            tick: async (pct: number) => {
              setTaskProgress(step.task.id, pct);
              await sleep(120 + Math.random() * 160);
            },
            readFile: (p: string) => vfsRef.current[p]?.content ?? "",
          });
          setTaskProgress(step.task.id, 100, "done");
        }
        log("success", "✓ Task complete. All steps finished.");
        termLine("out", "done — 0 errors");
      } catch (e) {
        log("error", `Task failed: ${(e as Error).message}`);
      } finally {
        setRunning(false);
      }
    },
    [running, folderName, log, termLine, writeFile, openFile, setTaskProgress],
  );

  return (
    <Ctx.Provider
      value={{
        vfs,
        tree,
        folderName,
        tabs,
        active,
        openFile,
        closeTab,
        setActive,
        updateActiveContent,
        saveActive,
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

// ---------- agent planner ----------

type ExecApi = {
  log: (l: LogLevel, m: string) => void;
  term: (k: TermLine["kind"], t: string) => void;
  writeFile: (path: string, content: string) => void;
  openFile: (path: string) => void;
  readFile: (path: string) => string;
  tick: (pct: number) => Promise<void>;
};

type PlanStep = { task: Task; exec: (api: ExecApi) => Promise<void> };

function slug(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 28) || "task"
  );
}

// Builds a coherent multi-capability plan from the prompt.
function buildPlan(prompt: string, folder: string): PlanStep[] {
  const name = slug(prompt);
  const scriptPath = `src/${name}.py`;
  const reportPath = `reports/${name}.md`;
  const t = (kind: TaskKind, title: string): Task => ({
    id: crypto.randomUUID(),
    kind,
    title,
    status: "pending",
    progress: 0,
  });

  return [
    {
      task: t("search", "Search web for context"),
      async exec(api) {
        api.term("cmd", `rak web search "${prompt}"`);
        for (const p of [25, 55, 80, 100]) await api.tick(p);
        api.log("info", "3 sources found · ranked by relevance");
        api.term("out", "✓ 3 results · cached to .rak/context.json");
      },
    },
    {
      task: t("read", "Read project files"),
      async exec(api) {
        api.openFile("data/sales.csv");
        const csv = api.readFile("data/sales.csv");
        await api.tick(40);
        const rows = csv.trim().split("\n").length - 1;
        await api.tick(100);
        api.log("info", `Parsed data/sales.csv · ${rows} rows`);
        api.term("out", `read data/sales.csv (${rows} rows)`);
      },
    },
    {
      task: t("generate", "Generate code"),
      async exec(api) {
        await api.tick(30);
        const code = `"""Auto-generated by NEXERA Coder: ${prompt}"""
import pandas as pd
from utils import commission


def build():
    df = pd.read_csv("data/sales.csv")
    df["commission"] = df.apply(
        lambda r: commission(r.revenue, r.rate), axis=1
    )
    summary = {
        "reps": int(df.shape[0]),
        "revenue": float(df.revenue.sum()),
        "commission": float(df.commission.sum()),
    }
    return df, summary
`;
        await api.tick(70);
        api.writeFile(scriptPath, code);
        api.openFile(scriptPath);
        await api.tick(100);
        api.log("success", `Created ${scriptPath}`);
        api.term("out", `+ ${scriptPath}`);
      },
    },
    {
      task: t("edit", "Edit src/utils.py"),
      async exec(api) {
        await api.tick(50);
        const edited = `def commission(revenue: float, rate: float) -> float:
    """Tiered commission with accelerator above $300k."""
    base = revenue * rate
    if revenue > 300_000:
        base += (revenue - 300_000) * 0.01
    return round(base, 2)
`;
        api.writeFile("src/utils.py", edited);
        api.openFile("src/utils.py");
        await api.tick(100);
        api.log("action", "Edited src/utils.py · added tier accelerator");
        api.term("out", "~ src/utils.py (1 function changed)");
      },
    },
    {
      task: t("run", "Run Python script"),
      async exec(api) {
        api.term("cmd", `python ${scriptPath}`);
        await api.tick(35);
        api.term("out", "rep        region  deals   revenue  commission");
        await api.tick(60);
        api.term("out", "A. Mehta   West       32  420000.0    26400.00");
        api.term("out", "J. Park    East       28  358000.0    20270.00");
        await api.tick(90);
        api.term("out", "L. Diaz    North      24  310000.0    15600.00");
        api.term("out", "S. Khan    South      19  244000.0    12200.00");
        await api.tick(100);
        api.log("success", "python exited 0 · total commission $74,470.00");
      },
    },
    {
      task: t("report", "Create report"),
      async exec(api) {
        await api.tick(45);
        const md = `# Report — ${prompt}

Generated by NEXERA Coder.

| Metric | Value |
|---|---|
| Reps | 4 |
| Total revenue | $1,332,000 |
| Total commission | $74,470 |
| Top performer | A. Mehta |

_Source: data/sales.csv · model: tiered + accelerator_
`;
        api.writeFile(reportPath, md);
        api.openFile(reportPath);
        await api.tick(100);
        api.log("success", `Wrote ${reportPath}`);
        api.term("out", `+ ${reportPath}`);
      },
    },
    {
      task: t("download", "Export documents"),
      async exec(api) {
        api.term("cmd", `rak export ${reportPath} --pdf`);
        for (const p of [40, 75, 100]) await api.tick(p);
        api.writeFile(`reports/${name}.pdf`, `%PDF-1.7 — rendered from ${reportPath}`);
        api.log("success", `Exported reports/${name}.pdf → ~/Downloads/${folder}`);
        api.term("out", `✓ saved reports/${name}.pdf`);
      },
    },
  ];
}
