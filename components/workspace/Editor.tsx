"use client";

import { useRef } from "react";
import { useWorkspace } from "./store";
import { highlight } from "./highlight";

export default function Editor() {
  const { vfs, tabs, active, setActive, closeTab, updateActiveContent, saveActive } =
    useWorkspace();

  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const file = active ? vfs[active] : null;
  const lineCount = file ? file.content.split("\n").length : 0;

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = el.scrollTop;
      preRef.current.scrollLeft = el.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = el.scrollTop;
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white/40">
      {/* tabs */}
      <div className="flex flex-none items-center overflow-x-auto border-b border-black/10 bg-neutral-100/40">
        {tabs.length === 0 && (
          <span className="px-4 py-2.5 text-xs text-black/35">No open files</span>
        )}
        {tabs.map((path) => {
          const f = vfs[path];
          const isActive = path === active;
          return (
            <button
              key={path}
              onClick={() => setActive(path)}
              className={`group flex flex-none items-center gap-2 border-r border-black/10 px-3 py-2.5 text-xs ${
                isActive
                  ? "bg-white/60 text-ink"
                  : "text-black/45 hover:bg-black/[0.03] hover:text-black/70"
              }`}
            >
              <FileDot path={path} />
              <span>{path.split("/").pop()}</span>
              {f?.dirty && <span className="h-1.5 w-1.5 rounded-full bg-navy" />}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(path);
                }}
                className="ml-1 rounded px-1 text-black/30 opacity-0 hover:bg-black/10 hover:text-ink group-hover:opacity-100"
              >
                ×
              </span>
            </button>
          );
        })}
      </div>

      {/* code area */}
      {!file ? (
        <div className="grid flex-1 place-items-center text-sm text-black/35">
          Select a file from the explorer.
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1">
          {/* gutter */}
          <div
            ref={gutterRef}
            className="select-none overflow-hidden border-r border-black/5 bg-neutral-100/30 px-3 py-3 text-right font-mono text-xs leading-[1.6] text-black/25"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* highlighted overlay + transparent textarea */}
          <div className="relative min-w-0 flex-1">
            <pre
              ref={preRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre px-4 py-3 font-mono text-[13px] leading-[1.6]"
            >
              {highlight(file.content, file.language)}
            </pre>
            <textarea
              value={file.content}
              spellCheck={false}
              onChange={(e) => updateActiveContent(e.target.value)}
              onScroll={syncScroll}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                  e.preventDefault();
                  saveActive();
                }
              }}
              className="absolute inset-0 resize-none overflow-auto whitespace-pre bg-transparent px-4 py-3 font-mono text-[13px] leading-[1.6] text-transparent caret-navy outline-none"
            />
          </div>
        </div>
      )}

      {/* status bar */}
      <div className="flex flex-none items-center justify-between border-t border-black/10 bg-neutral-100/40 px-3 py-1.5 font-mono text-[11px] text-black/40">
        <span>{file ? file.path : "—"}</span>
        <span className="flex items-center gap-3">
          {file && <span className="uppercase">{file.language}</span>}
          {file?.dirty ? (
            <span className="text-navy">● unsaved · ⌘S</span>
          ) : (
            <span>saved</span>
          )}
          <span>{lineCount} ln</span>
        </span>
      </div>
    </div>
  );
}

function FileDot({ path }: { path: string }) {
  const ext = path.split(".").pop();
  const color =
    ext === "py"
      ? "#7fb4ff"
      : ext === "md"
        ? "#3b82f6"
        : ext === "csv"
          ? "#f0c178"
          : ext?.startsWith("ts") || ext === "js"
            ? "#7fe7b0"
            : "#8a93a6";
  return (
    <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
  );
}
