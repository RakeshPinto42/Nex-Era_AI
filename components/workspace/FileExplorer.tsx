"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace } from "./store";
import type { TreeNode } from "@/lib/workspace/vfs";

export default function FileExplorer() {
  const { tree, active, openFile, folderName, selectFolder, vfs } =
    useWorkspace();
  const fileCount = Object.keys(vfs).length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white/40">
      <div className="flex flex-none items-center justify-between border-b border-black/10 px-3 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-widest text-black/40">
          Explorer
        </span>
        <button
          onClick={selectFolder}
          className="rounded-md border border-black/10 bg-black/[0.04] px-2 py-1 text-[11px] text-black/70 transition-colors hover:border-navy/40 hover:text-ink"
        >
          Open Folder
        </button>
      </div>

      <div className="flex flex-none items-center gap-2 px-3 py-2 text-xs text-black/60">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2z" />
        </svg>
        <span className="truncate font-medium text-black/80">{folderName}</span>
        <span className="ml-auto font-mono text-[10px] text-black/30">
          {fileCount}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        {tree.map((node) => (
          <Node
            key={node.path}
            node={node}
            depth={0}
            active={active}
            onOpen={openFile}
          />
        ))}
      </div>
    </div>
  );
}

function Node({
  node,
  depth,
  active,
  onOpen,
}: {
  node: TreeNode;
  depth: number;
  active: string | null;
  onOpen: (p: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-[13px] text-black/70 hover:bg-black/[0.04]"
          style={{ paddingLeft: depth * 12 + 6 }}
        >
          <motion.span
            animate={{ rotate: open ? 90 : 0 }}
            className="text-black/40"
          >
            ▸
          </motion.span>
          <span>{node.name}</span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {node.children?.map((c) => (
                <Node
                  key={c.path}
                  node={c}
                  depth={depth + 1}
                  active={active}
                  onOpen={onOpen}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const isActive = node.path === active;
  return (
    <button
      onClick={() => onOpen(node.path)}
      className={`flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-[13px] ${
        isActive
          ? "bg-navy/12 text-ink"
          : "text-black/55 hover:bg-black/[0.04] hover:text-black/80"
      }`}
      style={{ paddingLeft: depth * 12 + 18 }}
    >
      <FileDot name={node.name} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

function FileDot({ name }: { name: string }) {
  const ext = name.split(".").pop();
  const color =
    ext === "py" ? "#7fb4ff"
      : ext === "md" ? "#3b82f6"
      : ext === "csv" ? "#f0c178"
      : ext === "pdf" ? "#ff8a8a"
      : ext?.startsWith("ts") || ext === "js" ? "#7fe7b0"
      : "#8a93a6";
  return <span className="h-2 w-2 flex-none rounded-sm" style={{ background: color }} />;
}
