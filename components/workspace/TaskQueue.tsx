"use client";

import { motion } from "framer-motion";
import { useWorkspace, type Task, type TaskKind } from "./store";

const KIND_ICON: Record<TaskKind, string> = {
  search: "⌕",
  read: "▤",
  generate: "✦",
  edit: "✎",
  create: "+",
  run: "▶",
  report: "▦",
  download: "↓",
};

export default function TaskQueue() {
  const { tasks } = useWorkspace();
  const done = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-none items-center justify-between border-b border-black/10 px-3 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-widest text-black/40">
          Task Queue
        </span>
        {tasks.length > 0 && (
          <span className="font-mono text-[11px] text-black/45">
            {done}/{tasks.length}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tasks.length === 0 ? (
          <p className="px-1 text-xs text-black/35">
            Idle. Give the agent a command below.
          </p>
        ) : (
          <ol className="space-y-2">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const color =
    task.status === "done"
      ? "#3b82f6"
      : task.status === "running"
        ? "#5e9dff"
        : task.status === "error"
          ? "#ff8a8a"
          : "rgba(255,255,255,0.2)";

  return (
    <li className="rounded-lg border border-black/10 bg-black/[0.03] p-2.5">
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-6 w-6 flex-none place-items-center rounded-md text-xs"
          style={{
            background: `${color}22`,
            color,
          }}
        >
          {task.status === "running" ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : task.status === "done" ? (
            "✓"
          ) : (
            KIND_ICON[task.kind]
          )}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-[13px] ${
            task.status === "pending" ? "text-black/40" : "text-black/85"
          }`}
        >
          {task.title}
        </span>
        <span className="font-mono text-[10px] uppercase text-black/35">
          {task.kind}
        </span>
      </div>
      {task.status !== "pending" && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            animate={{ width: `${task.progress}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      )}
    </li>
  );
}
