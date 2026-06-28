"use client";

/* ============================================================================
   Workspace Intelligence — reusable context (Phase 1B).
   ----------------------------------------------------------------------------
   The shared workspace state every future agent + workspace UI consumes:
   current workspace, current folder, selected files, structural metadata,
   recent changes, and a read-only activity log. Discovery (open/recent/pinned)
   lives here too. No editing, no execution, no LLM.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Workspace,
  WorkspaceRef,
  WorkspaceSummary,
  WorkspaceActivity,
  WorkspaceActivityType,
  WorkspaceContextSnapshot,
  WsTreeNode,
} from "@/lib/workspace/model";

const RECENT_KEY = "nexera.ws.recent";
const PINNED_KEY = "nexera.ws.pinned";
const MAX_RECENT = 8;

type WorkspaceIntelValue = {
  workspace: Workspace | null;
  tree: WsTreeNode[];
  summary: WorkspaceSummary | null;
  currentFolder: string;
  selectedFiles: string[];
  activity: WorkspaceActivity[];
  recent: WorkspaceRef[];
  pinned: WorkspaceRef[];
  loading: boolean;
  error: string | null;

  openFolder: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  setCurrentFolder: (rel: string) => void;
  toggleSelect: (path: string) => void;
  clearSelection: () => void;
  pin: (ref: WorkspaceRef) => void;
  unpin: (id: string) => void;
  isPinned: (id: string) => boolean;

  /** Reusable snapshot for future agents. */
  snapshot: () => WorkspaceContextSnapshot;
};

const Ctx = createContext<WorkspaceIntelValue | null>(null);

function loadList(key: string): WorkspaceRef[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as WorkspaceRef[];
  } catch {
    return [];
  }
}

function refOf(ws: Workspace): WorkspaceRef {
  return { id: ws.id, name: ws.name, path: ws.path, openedAt: ws.openedAt };
}

export function WorkspaceIntelProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activity, setActivity] = useState<WorkspaceActivity[]>([]);
  const [recent, setRecent] = useState<WorkspaceRef[]>([]);
  const [pinned, setPinned] = useState<WorkspaceRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    setRecent(loadList(RECENT_KEY));
    setPinned(loadList(PINNED_KEY));
  }, []);

  const log = useCallback((type: WorkspaceActivityType, detail: string) => {
    setActivity((prev) =>
      [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, detail, at: new Date().toISOString() }, ...prev].slice(0, 50),
    );
  }, []);

  const pushRecent = useCallback((ref: WorkspaceRef) => {
    setRecent((prev) => {
      const next = [ref, ...prev.filter((r) => r.path !== ref.path)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  // Pull current root → tree + summary, assemble the Workspace.
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rootRes = await fetch("/api/workspace/root").then((r) => r.json());
      const root: string | null = rootRes.root ?? null;
      if (!root) {
        setWorkspace(null);
        prevPath.current = null;
        setLoading(false);
        return;
      }

      const [treeRes, sumRes] = await Promise.all([
        fetch("/api/workspace/tree").then((r) => r.json()),
        fetch("/api/workspace/summary").then((r) => r.json()),
      ]);

      const tree: WsTreeNode[] = treeRes.tree ?? [];
      const summary: WorkspaceSummary | null = sumRes.summary ?? null;
      const name = summary?.name ?? root.split(/[\\/]/).pop() ?? root;

      const changed = prevPath.current !== null && prevPath.current !== root;
      const opened = prevPath.current === null;

      const ws: Workspace = {
        id: root,
        name,
        path: root,
        type: summary?.type ?? "unknown",
        rootFolder: root,
        openedAt: new Date().toISOString(),
        files: summary?.totalFiles ?? 0,
        folders: summary?.totalFolders ?? 0,
        tree,
        metadata: summary,
        currentFolder: "",
        selectedFiles: [],
        recentActivity: [],
      };

      setWorkspace((prev) => ({
        ...ws,
        // preserve in-session selection/folder when re-refreshing same root
        currentFolder: prev && prev.path === root ? prev.currentFolder : "",
        selectedFiles: prev && prev.path === root ? prev.selectedFiles : [],
      }));

      if (opened || changed) {
        pushRecent(refOf(ws));
        log(changed ? "workspace-changed" : "workspace-opened", name);
      } else {
        log("context-refreshed", name);
      }
      prevPath.current = root;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [log, pushRecent]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openFolder = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/workspace/root", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        }).then((r) => r.json());
        if (res.error) throw new Error(res.error);
        await refresh();
      } catch (e) {
        setError((e as Error).message);
        setLoading(false);
      }
    },
    [refresh],
  );

  const setCurrentFolder = useCallback(
    (rel: string) => {
      setWorkspace((prev) => (prev ? { ...prev, currentFolder: rel } : prev));
      log("folder-expanded", rel || "(root)");
    },
    [log],
  );

  const toggleSelect = useCallback(
    (path: string) => {
      setWorkspace((prev) => {
        if (!prev) return prev;
        const has = prev.selectedFiles.includes(path);
        const selectedFiles = has
          ? prev.selectedFiles.filter((p) => p !== path)
          : [...prev.selectedFiles, path];
        return { ...prev, selectedFiles };
      });
      log("files-selected", path);
    },
    [log],
  );

  const clearSelection = useCallback(() => {
    setWorkspace((prev) => (prev ? { ...prev, selectedFiles: [] } : prev));
  }, []);

  const pin = useCallback((ref: WorkspaceRef) => {
    setPinned((prev) => {
      if (prev.some((r) => r.id === ref.id)) return prev;
      const next = [...prev, ref];
      try {
        localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const unpin = useCallback((id: string) => {
    setPinned((prev) => {
      const next = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const isPinned = useCallback((id: string) => pinned.some((r) => r.id === id), [pinned]);

  const snapshot = useCallback(
    (): WorkspaceContextSnapshot => ({
      workspace: workspace ? refOf(workspace) : null,
      currentFolder: workspace?.currentFolder ?? "",
      selectedFiles: workspace?.selectedFiles ?? [],
      metadata: workspace?.metadata ?? null,
      recentChanges: workspace?.metadata?.recentlyChanged ?? [],
    }),
    [workspace],
  );

  const value = useMemo<WorkspaceIntelValue>(
    () => ({
      workspace,
      tree: workspace?.tree ?? [],
      summary: workspace?.metadata ?? null,
      currentFolder: workspace?.currentFolder ?? "",
      selectedFiles: workspace?.selectedFiles ?? [],
      activity,
      recent,
      pinned,
      loading,
      error,
      openFolder,
      refresh,
      setCurrentFolder,
      toggleSelect,
      clearSelection,
      pin,
      unpin,
      isPinned,
      snapshot,
    }),
    [workspace, activity, recent, pinned, loading, error, openFolder, refresh, setCurrentFolder, toggleSelect, clearSelection, pin, unpin, isPinned, snapshot],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspaceIntel(): WorkspaceIntelValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspaceIntel must be used within WorkspaceIntelProvider");
  return v;
}
