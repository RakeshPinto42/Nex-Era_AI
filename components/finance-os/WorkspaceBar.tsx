"use client";

// Explicit Save / Load / Export / Import for a session workspace. No automatic
// persistence — every action here is user-initiated.

import { useEffect, useRef, useState } from "react";
import {
  deleteWorkspace,
  exportWorkspaceFile,
  importWorkspaceFile,
  listWorkspaces,
  saveWorkspace,
  type Workspace,
} from "@/lib/finance-os/workspace";

export function WorkspaceBar({
  getWorkspace,
  onLoad,
}: {
  getWorkspace: () => Workspace;
  onLoad: (ws: Workspace) => void;
}) {
  const [saved, setSaved] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => listWorkspaces().then(setSaved).catch(() => {});
  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2500);
  };

  const save = async () => {
    const ws = getWorkspace();
    const name = window.prompt("Name this workspace:", ws.name || "Workspace");
    if (!name) return;
    try {
      await saveWorkspace({ ...ws, name });
      flash("Saved to this device");
      refresh();
    } catch (e) {
      flash((e as Error).message);
    }
  };

  const load = async (ws: Workspace) => {
    onLoad(ws);
    setOpen(false);
    flash(`Loaded "${ws.name}"`);
  };

  const importFile = async (file: File) => {
    try {
      onLoad(await importWorkspaceFile(file));
      flash("Imported workspace file");
    } catch (e) {
      flash((e as Error).message);
    }
  };

  const btn =
    "rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20";

  return (
    <div className="relative flex items-center gap-2">
      {msg && <span className="text-xs text-white/90">{msg}</span>}
      <button className={btn} onClick={save}>
        Save Workspace
      </button>
      <button className={btn} onClick={() => setOpen((o) => !o)}>
        Load ▾
      </button>
      <button className={btn} onClick={() => exportWorkspaceFile(getWorkspace())}>
        Export file
      </button>
      <button className={btn} onClick={() => fileRef.current?.click()}>
        Import file
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.nexera.json,application/json"
        hidden
        onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
      />

      {open && (
        <div className="absolute right-0 top-9 z-20 w-72 rounded-xl border border-line bg-white p-2 shadow-lg">
          <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
            Saved on this device
          </p>
          {saved.length === 0 && <p className="px-2 py-2 text-xs text-muted">None saved yet.</p>}
          {saved.map((ws) => (
            <div key={ws.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-canvas">
              <button onClick={() => load(ws)} className="min-w-0 flex-1 truncate text-left text-sm text-ink">
                {ws.name}
                <span className="ml-2 font-mono text-[10px] text-muted">
                  {new Date(ws.savedAt).toLocaleDateString()}
                </span>
              </button>
              <button
                onClick={async () => {
                  await deleteWorkspace(ws.id);
                  refresh();
                }}
                className="text-muted hover:text-rose-600"
                aria-label="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
