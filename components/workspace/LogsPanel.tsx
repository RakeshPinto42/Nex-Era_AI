"use client";

import { useEffect, useRef } from "react";
import { useWorkspace, type LogLevel } from "./store";

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: "#8fc1ff",
  action: "#3b82f6",
  success: "#3b82f6",
  warn: "#f0c178",
  error: "#ff8a8a",
  output: "#8a93a6",
};

export default function LogsPanel() {
  const { logs, clearLogs } = useWorkspace();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-none items-center justify-between border-b border-white/[0.08] px-3 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">
          Logs
        </span>
        {logs.length > 0 && (
          <button
            onClick={clearLogs}
            className="font-mono text-[11px] text-white/40 hover:text-white"
          >
            clear
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-white/30">No logs yet.</p>
        ) : (
          logs.map((l) => (
            <div key={l.id} className="flex gap-2">
              <span className="flex-none text-white/30">{l.ts}</span>
              <span
                className="flex-none uppercase"
                style={{ color: LEVEL_COLOR[l.level], width: 56 }}
              >
                {l.level}
              </span>
              <span className="text-white/70">{l.msg}</span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
