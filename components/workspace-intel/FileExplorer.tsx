"use client";

/* ============================================================================
   Workspace Intelligence — reusable File Explorer (Phase 1B).
   ----------------------------------------------------------------------------
   Read-only tree: folders, files, icons, search, expand/collapse, selection,
   preview. NO editing, rename, delete, drag, or create. Pure view over the
   WsTreeNode[] supplied by the workspace context.
   ========================================================================== */

import { useMemo, useState } from "react";
import type { WsTreeNode } from "@/lib/workspace/model";

type Props = {
  tree: WsTreeNode[];
  selected: string[];
  activePreview: string | null;
  onToggleSelect: (path: string) => void;
  onPreview: (path: string) => void;
  onExpandFolder?: (path: string) => void;
};

const FILE_ICON: Record<string, string> = {
  ts: "🟦", tsx: "⚛️", js: "🟨", jsx: "⚛️", json: "🟫", md: "📄", txt: "📄",
  css: "🎨", scss: "🎨", html: "🌐", py: "🐍", go: "🐹", rs: "🦀", java: "☕",
  csv: "📊", xlsx: "📊", yml: "⚙️", yaml: "⚙️", toml: "⚙️", sql: "🗄️",
  sh: "🐚", svg: "🖼️", png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️", pdf: "📕",
};

function iconFor(node: WsTreeNode): string {
  if (node.isDir) return "📁";
  const ext = node.name.includes(".") ? node.name.split(".").pop()!.toLowerCase() : "";
  return FILE_ICON[ext] ?? "📄";
}

// Keep nodes whose name matches, plus any folder that has a matching descendant.
function filterTree(nodes: WsTreeNode[], q: string): WsTreeNode[] {
  const lower = q.toLowerCase();
  const out: WsTreeNode[] = [];
  for (const n of nodes) {
    if (n.isDir) {
      const kids = filterTree(n.children ?? [], q);
      if (kids.length || n.name.toLowerCase().includes(lower)) {
        out.push({ ...n, children: kids });
      }
    } else if (n.name.toLowerCase().includes(lower)) {
      out.push(n);
    }
  }
  return out;
}

export default function FileExplorer({
  tree,
  selected,
  activePreview,
  onToggleSelect,
  onPreview,
  onExpandFolder,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const searching = query.trim().length > 0;
  const view = useMemo(
    () => (searching ? filterTree(tree, query.trim()) : tree),
    [tree, query, searching],
  );

  const toggleOpen = (path: string) => {
    setOpen((prev) => {
      const next = !prev[path];
      if (next) onExpandFolder?.(path);
      return { ...prev, [path]: next };
    });
  };

  const renderNodes = (nodes: WsTreeNode[], depth: number) =>
    nodes.map((node) => {
      const isOpen = searching || open[node.path];
      const pad = { paddingLeft: `${depth * 12 + 8}px` };
      if (node.isDir) {
        return (
          <div key={node.path}>
            <button
              type="button"
              onClick={() => toggleOpen(node.path)}
              style={pad}
              className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[13px] text-ink hover:bg-surface-2"
            >
              <span className="w-3 text-[10px] text-muted">{isOpen ? "▾" : "▸"}</span>
              <span>{iconFor(node)}</span>
              <span className="truncate">{node.name}</span>
            </button>
            {isOpen && node.children && renderNodes(node.children, depth + 1)}
          </div>
        );
      }
      const isSel = selected.includes(node.path);
      const isActive = activePreview === node.path;
      return (
        <div
          key={node.path}
          style={pad}
          className={`group flex items-center gap-1.5 rounded-md py-1 pr-2 text-[13px] ${
            isActive ? "bg-brand/[0.10] text-brand" : "text-faint hover:bg-surface-2 hover:text-ink"
          }`}
        >
          <span className="w-3" />
          <input
            type="checkbox"
            checked={isSel}
            onChange={() => onToggleSelect(node.path)}
            aria-label={`Select ${node.name}`}
            className="h-3 w-3 flex-none accent-brand"
          />
          <button
            type="button"
            onClick={() => onPreview(node.path)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            <span>{iconFor(node)}</span>
            <span className="truncate">{node.name}</span>
          </button>
        </div>
      );
    });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files…"
          className="w-full rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink placeholder:text-faint outline-none focus:border-brand/40"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {view.length === 0 ? (
          <p className="px-3 py-4 text-[13px] text-muted">
            {searching ? "No files match." : "Empty workspace."}
          </p>
        ) : (
          renderNodes(view, 0)
        )}
      </div>
    </div>
  );
}
