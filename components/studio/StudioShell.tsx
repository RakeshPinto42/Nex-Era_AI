"use client";

/* NEX-ERA STUDIO — shell. Telemetry ribbon + 3-pane collapsible layout, split
   view, global drag-drop upload, and keyboard shortcuts. Composes the rails,
   canvas viewers and the terminal composer. */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/components/dashboard/store";
import { useStudio, type Tab } from "./store";
import { StudioLeft, StudioRight, TabsBar } from "./panels";
import { FileViewer, ArtifactView } from "./Viewers";
import { BlockCanvas } from "./Blocks";
import { Composer } from "./Composer";
import { HudCorners, I } from "./ui";

export default function StudioShell() {
  const { addFiles, leftOpen, rightOpen, toggleLeft, toggleRight, toggleSplit, tabs, activeId, splitId, activate, closeTab } = useStudio();
  const [dragOver, setDragOver] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const typing = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); document.getElementById("studio-composer")?.focus(); return; }
      if (mod && e.key === "\\") { e.preventDefault(); toggleSplit(); return; }
      if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); toggleLeft(); return; }
      if (mod && e.key.toLowerCase() === "j") { e.preventDefault(); toggleRight(); return; }
      if (mod && e.key.toLowerCase() === "w" && activeId) { e.preventDefault(); closeTab(activeId); return; }
      if (mod && /^[1-9]$/.test(e.key)) { const t = tabs[Number(e.key) - 1]; if (t) { e.preventDefault(); activate(t.id); } return; }
      if (!typing && e.key === "?") { e.preventDefault(); setHelpOpen((v) => !v); return; }
      if (e.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSplit, toggleLeft, toggleRight, closeTab, activate, activeId, tabs]);

  return (
    <div
      className="relative flex h-full flex-col bg-surface text-ink"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
    >
      <TelemetryRibbon onToggleLeft={toggleLeft} onToggleRight={toggleRight} onHelp={() => setHelpOpen(true)} />

      <div className="flex min-h-0 flex-1">
        {/* LEFT */}
        <AnimatePresence initial={false}>
          {leftOpen && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 248, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="flex-none overflow-hidden border-r border-line bg-surface">
              <div className="h-full w-[248px]"><StudioLeft /></div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* CENTER */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TabsBar />
          <div className="min-h-0 flex-1">
            {tabs.length === 0 ? (
              <CanvasEmpty />
            ) : splitId ? (
              <div className="grid h-full grid-cols-2 divide-x divide-line">
                <CanvasPane tabId={activeId} />
                <CanvasPane tabId={splitId} secondary />
              </div>
            ) : (
              <CanvasPane tabId={activeId} />
            )}
          </div>
          <Composer />
        </div>

        {/* RIGHT */}
        <AnimatePresence initial={false}>
          {rightOpen && (
            <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 336, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="flex-none overflow-hidden border-l border-line bg-surface">
              <div className="h-full w-[336px]"><StudioRight /></div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* drag overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-4 z-30 grid place-items-center rounded-2xl border-2 border-dashed border-brand/50 bg-brand/10 backdrop-blur-sm">
            <p className="text-sm font-semibold text-brand">Drop to add — PDF, Excel, Word, images, video, audio, code…</p>
          </motion.div>
        )}
      </AnimatePresence>

      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

/* ---- canvas pane: routes a tab to its viewer ---- */
function CanvasPane({ tabId, secondary }: { tabId: string | null; secondary?: boolean }) {
  const { tabs, files, artifacts, activate } = useStudio();
  const tab = tabs.find((t) => t.id === tabId) as Tab | undefined;
  return (
    <div className="relative flex h-full min-w-0 flex-col" onMouseDown={() => tab && secondary && activate(tab.id)}>
      {secondary && tab && (
        <div className="flex-none border-b border-line bg-violet/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-violet/80">Split · {tab.title}</div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {!tab ? <div className="grid h-full place-items-center text-sm text-faint">Select a tab</div>
          : tab.kind === "chat" ? (tab.convId ? <BlockCanvas worldId={tab.convId} /> : null)
          : tab.kind === "artifact" ? (() => { const a = artifacts.find((x) => x.id === tab.artifactId); return a ? <ArtifactView artifact={a} /> : <Missing />; })()
          : (() => { const f = files.find((x) => x.id === tab.fileId); return f ? <FileViewer file={f} /> : <Missing />; })()}
      </div>
    </div>
  );
}
function Missing() {
  return <div className="grid h-full place-items-center text-sm text-faint">Content closed.</div>;
}

function CanvasEmpty() {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-line bg-gradient-to-br from-brand/20 to-violet/20">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 7v10l8 5 8-5V7z" /><path d="m4 7 8 5 8-5M12 22V12" /></svg>
        </div>
        <h2 className="text-xl font-semibold text-ink">One canvas for everything</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Chat with the router, drop in PDFs, spreadsheets, code, images, audio or video — each opens
          as a tab you can split, preview and pin. Ask in the terminal below or press
          <kbd className="mx-1 rounded border border-line bg-surface-2 px-1.5 font-mono text-[11px]">⌘K</kbd>.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2 text-[12px] text-faint">
          {["Drag & drop files", "⌘\\ split view", "⌘B / ⌘J panels", "? shortcuts"].map((s) => (
            <span key={s} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 font-mono">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- telemetry ribbon (reference's SYSTEM ONLINE strip) ---- */
function TelemetryRibbon({ onToggleLeft, onToggleRight, onHelp }: { onToggleLeft: () => void; onToggleRight: () => void; onHelp: () => void }) {
  const { availableModels, agentStatus, tokensIn, tokensOut } = useDashboard();
  const { canvasMode, setCanvasMode } = useStudio();
  const mem = Math.min(100, Math.round(((tokensIn + tokensOut) / 128000) * 100));
  const agentLive = agentStatus === "running" || agentStatus === "thinking";
  return (
    <div className="relative flex h-9 flex-none items-center gap-3 border-b border-line bg-surface px-3 font-mono text-[11px] backdrop-blur-xl">
      <button onClick={onToggleLeft} title="Toggle worlds (⌘B)" className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">{I.panelLeft}</button>
      <span className="flex items-center gap-1.5 text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_6px_#34f5a0]" /> SYSTEM ONLINE
      </span>
      <Sep />
      <span className="text-muted"><span className="text-ink">{availableModels.length}</span> MODELS</span>
      <Sep />
      <span className="text-muted capitalize"><span className={agentLive ? "text-success" : "text-ink"}>AGENT</span> {agentStatus}</span>
      <Sep />
      <span className="hidden text-muted sm:inline">MEMORY <span className="text-ink">{mem}%</span></span>
      <span className="flex-1" />
      <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
        {(["stream", "canvas"] as const).map((m) => (
          <button key={m} onClick={() => setCanvasMode(m)} className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors ${canvasMode === m ? "bg-surface-3 text-ink" : "text-faint hover:text-ink"}`}>{m}</button>
        ))}
      </div>
      <button onClick={onHelp} title="Shortcuts (?)" className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">?</button>
      <button onClick={onToggleRight} title="Toggle panel (⌘J)" className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">{I.panelRight}</button>
    </div>
  );
}
function Sep() { return <span className="text-faint">|</span>; }

function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const keys: [string, string][] = [
    ["⌘K", "Focus terminal"], ["⌘\\", "Toggle split view"], ["⌘B", "Toggle worlds rail"],
    ["⌘J", "Toggle right panel"], ["⌘1–9", "Jump to tab"], ["⌘W", "Close tab"],
    ["⏎ / ⇧⏎", "Send / newline"], ["?", "This help"],
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 grid place-items-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }} onClick={(e) => e.stopPropagation()} className="relative w-[340px] rounded-2xl border border-line bg-surface p-5 shadow-pop">
            <HudCorners />
            <h3 className="mb-3 font-mono text-[12px] uppercase tracking-[0.16em] text-muted">Keyboard shortcuts</h3>
            <div className="space-y-1.5">
              {keys.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">{v}</span>
                  <kbd className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink">{k}</kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
