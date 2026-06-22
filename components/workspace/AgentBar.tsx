"use client";

import { useState } from "react";
import { useWorkspace } from "./store";

const CAPS = [
  "Read files",
  "Edit files",
  "Create files",
  "Generate code",
  "Run Python",
  "Create reports",
  "Download docs",
  "Search web",
];

export default function AgentBar() {
  const { runAgent, running } = useWorkspace();
  const [cmd, setCmd] = useState("Build a sales commission dashboard");

  const submit = () => {
    if (!cmd.trim() || running) return;
    runAgent(cmd);
  };

  return (
    <div className="flex-none border-t border-black/10 bg-white/60 px-3 py-3 backdrop-blur-xl">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {CAPS.map((c) => (
          <span
            key={c}
            className="rounded-full border border-black/10 bg-black/[0.03] px-2 py-0.5 font-mono text-[10px] text-black/45"
          >
            {c}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.04] p-1.5 focus-within:border-navy/40">
        <span className="pl-2 font-mono text-sm text-navy">▸</span>
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Tell the agent what to do…"
          disabled={running}
          className="flex-1 bg-transparent py-1.5 text-sm text-ink placeholder:text-black/35 outline-none disabled:opacity-50"
        />
        <button
          onClick={submit}
          disabled={!cmd.trim() || running}
          className="flex items-center gap-2 rounded-lg bg-navy px-4 py-1.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-40"
        >
          {running ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-obsidian border-t-transparent" />
              Running
            </>
          ) : (
            "Run Agent"
          )}
        </button>
      </div>
    </div>
  );
}
