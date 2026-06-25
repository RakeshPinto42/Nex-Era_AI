"use client";

import Link from "next/link";
import { NexeraMark } from "@/components/Logo";
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
    <div className="flex h-screen flex-col overflow-hidden bg-obsidian text-white" style={{ colorScheme: "dark" }}>
      {/* app bar */}
      <header className="flex h-12 flex-none items-center gap-4 border-b border-white/[0.08] bg-obsidian-100/70 px-4 backdrop-blur-xl">
        <span className="flex items-center gap-2">
          <NexeraMark size={24} />
          <span className="font-display text-[14px] font-semibold tracking-tight text-white">nexera</span>
        </span>
        <span className="text-white/25">/</span>
        <span className="font-mono text-sm text-white/70">{folderName}</span>
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
          className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          ← Dashboard
        </Link>
      </header>

      {/* main 3-pane body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_340px]">
        {/* explorer */}
        <div className="hidden min-h-0 border-r border-white/[0.08] md:block">
          <FileExplorer />
        </div>

        {/* center: editor over terminal */}
        <div className="grid min-h-0 grid-rows-[1fr_38%]">
          <div className="min-h-0 border-b border-white/[0.08]">
            <Editor />
          </div>
          <div className="min-h-0">
            <Terminal />
          </div>
        </div>

        {/* right: tasks over logs */}
        <div className="hidden min-h-0 grid-rows-2 border-l border-white/[0.08] xl:grid">
          <div className="min-h-0 border-b border-white/[0.08]">
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
