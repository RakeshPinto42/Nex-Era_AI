"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useWorkspace } from "./store";
import FileExplorer from "./FileExplorer";
import Editor from "./Editor";
import Terminal from "./Terminal";
import TaskQueue from "./TaskQueue";
import LogsPanel from "./LogsPanel";
import AgentBar from "./AgentBar";

export default function Workspace() {
  const { running, folderName } = useWorkspace();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f6f7f9] text-neutral-900">
      {/* app bar */}
      <header className="flex h-12 flex-none items-center gap-4 border-b border-black/10 bg-white/60 px-4 backdrop-blur-xl">
        <Logo size={28} variant="terminal" />
        <span className="text-black/20">/</span>
        <span className="font-mono text-sm text-black/70">{folderName}</span>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
            running
              ? "border-ice/40 text-ice"
              : "border-navy/40 text-navy"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full bg-current ${running ? "animate-pulse" : ""}`}
          />
          {running ? "Agent running" : "Agent idle"}
        </span>
        <div className="flex-1" />
        <Link
          href="/dashboard"
          className="rounded-lg border border-black/10 px-3 py-1.5 text-xs text-black/65 transition-colors hover:bg-black/5 hover:text-neutral-900"
        >
          ← Dashboard
        </Link>
      </header>

      {/* main 3-pane body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_340px]">
        {/* explorer */}
        <div className="hidden min-h-0 border-r border-black/10 md:block">
          <FileExplorer />
        </div>

        {/* center: editor over terminal */}
        <div className="grid min-h-0 grid-rows-[1fr_38%]">
          <div className="min-h-0 border-b border-black/10">
            <Editor />
          </div>
          <div className="min-h-0">
            <Terminal />
          </div>
        </div>

        {/* right: tasks over logs */}
        <div className="hidden min-h-0 grid-rows-2 border-l border-black/10 xl:grid">
          <div className="min-h-0 border-b border-black/10">
            <TaskQueue />
          </div>
          <div className="min-h-0">
            <LogsPanel />
          </div>
        </div>
      </div>

      <AgentBar />
    </div>
  );
}
