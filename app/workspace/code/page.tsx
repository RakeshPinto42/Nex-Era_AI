"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

type TreeNode = {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
};

type Applied = { path: string; action: string };
type AgentResult = {
  summary: string;
  notes: string;
  applied: Applied[];
  errors: { path: string; error: string }[];
  provider: string;
  model: string;
};

type ModelLite = { providerId: string; model: string; label: string };

export default function CodeWorkspace() {
  const [root, setRoot] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState("");
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [rootError, setRootError] = useState<string | null>(null);

  const [models, setModels] = useState<ModelLite[]>([]);
  const [sel, setSel] = useState("");

  const [instruction, setInstruction] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    const res = await fetch("/api/workspace/tree");
    const data = await res.json();
    if (res.ok) {
      setRoot(data.root);
      setTree(data.tree);
    }
  }, []);

  useEffect(() => {
    fetch("/api/workspace/root")
      .then((r) => r.json())
      .then((d) => {
        if (d.root) {
          setRoot(d.root);
          setPathInput(d.root);
          loadTree();
        }
      });
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => {
        const list: ModelLite[] = d.models ?? [];
        setModels(list);
        if (list[0]) setSel(`${list[0].providerId}:${list[0].model}`);
      });
  }, [loadTree]);

  const openFolder = async () => {
    setRootError(null);
    const res = await fetch("/api/workspace/root", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setRootError(data.error);
      return;
    }
    setRoot(data.root);
    await loadTree();
  };

  const openFile = async (p: string) => {
    setOpenPath(p);
    const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(p)}`);
    const data = await res.json();
    setFileContent(res.ok ? data.content : data.error);
  };

  const run = async () => {
    if (!instruction.trim()) return;
    setRunning(true);
    setAgentError(null);
    setResult(null);
    try {
      const [providerId, model] = sel.split(/:(.*)/);
      const res = await fetch("/api/workspace/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, providerId, model }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAgentError(data.error + (data.raw ? `\n\n${data.raw}` : ""));
        return;
      }
      setResult(data);
      await loadTree();
      if (openPath) await openFile(openPath);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#f6f7f9] text-neutral-900">
      <header className="flex h-14 flex-none items-center justify-between border-b border-black/10 px-5">
        <div className="flex items-center gap-3">
          <Logo size={26} variant="terminal" />
          <span className="text-black/30">/</span>
          <span className="text-sm font-medium">Code Workspace</span>
          {root && (
            <span className="ml-2 truncate font-mono text-[11px] text-black/40">
              {root}
            </span>
          )}
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg border border-black/10 px-3 py-1.5 text-xs text-black/65 hover:text-neutral-900"
        >
          ← Dashboard
        </Link>
      </header>

      {/* folder bar */}
      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-black/10 px-5 py-3">
        <input
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && openFolder()}
          placeholder="Paste a folder path  (e.g. D:\\Projects\\my-app)"
          className="min-w-[280px] flex-1 rounded-lg border border-black/10 bg-black/[0.04] px-3 py-2 font-mono text-sm outline-none focus:border-navy/40"
        />
        <button
          onClick={openFolder}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:scale-[1.02]"
        >
          Open folder
        </button>
        {rootError && <span className="text-xs text-[#ff8a8a]">✕ {rootError}</span>}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* tree */}
        <aside className="w-64 flex-none overflow-auto border-r border-black/10 p-2">
          {tree.length === 0 ? (
            <p className="p-3 text-xs text-black/35">
              {root ? "Empty folder" : "Open a folder to start"}
            </p>
          ) : (
            <Tree nodes={tree} openPath={openPath} onOpen={openFile} depth={0} />
          )}
        </aside>

        {/* editor */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-none border-b border-black/10 px-4 py-2 font-mono text-[11px] text-black/40">
            {openPath ?? "No file open"}
          </div>
          <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-[12.5px] leading-relaxed text-black/85">
            {fileContent || (root ? "Select a file to view it." : "")}
          </pre>
        </main>

        {/* agent */}
        <aside className="flex w-[380px] flex-none flex-col border-l border-black/10">
          <div className="flex-none space-y-2 border-b border-black/10 p-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-black/35">
                Model
              </span>
              <select
                value={sel}
                onChange={(e) => setSel(e.target.value)}
                className="flex-1 rounded-lg border border-black/10 bg-black/[0.04] px-2 py-1.5 text-xs outline-none focus:border-navy/40"
              >
                {models.length === 0 && <option value="">No models</option>}
                {models.map((m) => (
                  <option key={`${m.providerId}:${m.model}`} value={`${m.providerId}:${m.model}`}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Tell the agent what to build or change in this folder…"
              rows={4}
              className="w-full resize-none rounded-lg border border-black/10 bg-black/[0.04] px-3 py-2 text-sm outline-none focus:border-navy/40"
            />
            <button
              onClick={run}
              disabled={running || !instruction.trim() || !root}
              className="w-full rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
            >
              {running ? "Working…" : "Build it"}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-3 text-sm">
            {agentError && (
              <pre className="whitespace-pre-wrap rounded-lg border border-[#ff8a8a]/30 bg-[#ff8a8a]/[0.06] p-3 text-xs text-[#ff8a8a]">
                {agentError}
              </pre>
            )}
            {result && (
              <div className="space-y-3">
                <p className="text-black/85">{result.summary}</p>
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-black/35">
                    Changed {result.applied.length} files · {result.model}
                  </p>
                  <ul className="space-y-1">
                    {result.applied.map((a) => (
                      <li
                        key={a.path}
                        className="flex items-center gap-2 font-mono text-xs"
                      >
                        <span
                          className={
                            a.action === "delete"
                              ? "text-[#ff8a8a]"
                              : a.action === "create"
                                ? "text-navy"
                                : "text-ice"
                          }
                        >
                          {a.action === "delete" ? "−" : a.action === "create" ? "+" : "~"}
                        </span>
                        <button
                          onClick={() => openFile(a.path)}
                          className="truncate text-black/70 hover:text-neutral-900"
                        >
                          {a.path}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                {result.errors.length > 0 && (
                  <p className="text-xs text-[#ff8a8a]">
                    {result.errors.length} write errors
                  </p>
                )}
                {result.notes && (
                  <p className="rounded-lg border border-black/10 bg-black/[0.03] p-2.5 text-xs text-black/60">
                    {result.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Tree({
  nodes,
  openPath,
  onOpen,
  depth,
}: {
  nodes: TreeNode[];
  openPath: string | null;
  onOpen: (p: string) => void;
  depth: number;
}) {
  return (
    <ul>
      {nodes.map((n) => (
        <TreeItem key={n.path} node={n} openPath={openPath} onOpen={onOpen} depth={depth} />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  openPath,
  onOpen,
  depth,
}: {
  node: TreeNode;
  openPath: string | null;
  onOpen: (p: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 1);
  const pad = { paddingLeft: `${depth * 12 + 8}px` };
  if (node.isDir) {
    return (
      <li>
        <button
          onClick={() => setOpen((v) => !v)}
          style={pad}
          className="flex w-full items-center gap-1.5 rounded py-1 text-left text-xs text-black/70 hover:bg-black/5"
        >
          <span className="text-black/30">{open ? "▾" : "▸"}</span>
          {node.name}
        </button>
        {open && node.children && (
          <Tree nodes={node.children} openPath={openPath} onOpen={onOpen} depth={depth + 1} />
        )}
      </li>
    );
  }
  return (
    <li>
      <button
        onClick={() => onOpen(node.path)}
        style={pad}
        className={`flex w-full items-center rounded py-1 text-left text-xs hover:bg-black/5 ${
          openPath === node.path ? "bg-black/[0.06] text-navy" : "text-black/60"
        }`}
      >
        {node.name}
      </button>
    </li>
  );
}
