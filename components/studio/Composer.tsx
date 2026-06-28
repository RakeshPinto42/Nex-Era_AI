"use client";

/* NEX-ERA TERMINAL — the Studio command bar.
   Streaming generation (/api/run) into canvas blocks, model selector, file
   attach, voice dictation, slash commands, temperature and skill routing. */

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useDashboard, modelKey, type ChatMessage, type ChatAttachment,
} from "@/components/dashboard/store";
import { useStudio, blocksFromText, type Skill } from "./store";
import { HudCorners, I } from "./ui";

function withDocs(content: string, atts?: ChatAttachment[]) {
  const docs = (atts ?? []).filter((a) => a.text?.trim());
  if (!docs.length) return content;
  return `${docs.map((a) => `[File: ${a.name}]\n${a.text}`).join("\n\n")}\n\n${content}`;
}

const SKILL_INTENT: Record<Exclude<Skill, "auto">, string> = {
  chat: "general", code: "coding", research: "research", analyze: "reasoning",
};
const SKILLS: { key: Skill; label: string }[] = [
  { key: "auto", label: "Auto" }, { key: "chat", label: "Chat" }, { key: "code", label: "Code" },
  { key: "research", label: "Research" }, { key: "analyze", label: "Analyze" },
];
const SLASH: { cmd: string; desc: string }[] = [
  { cmd: "/note", desc: "Add a markdown note block" },
  { cmd: "/table", desc: "Paste CSV rows → table block" },
  { cmd: "/canvas", desc: "Toggle canvas / stream layout" },
  { cmd: "/split", desc: "Toggle split view" },
  { cmd: "/clear", desc: "Clear this world’s blocks" },
];

export function Composer() {
  const {
    model, autoRoute, setAutoRoute, availableModels, activeModel, setActiveModel,
    resolveSendModel, addTokens, setAgentStatus, setWorkflow, advanceWorkflow,
    conversations, activeId: dashActiveId, createConversation, selectConversation, updateMessages,
  } = useDashboard();
  const {
    tabs, activeId, openChatTab, addFiles, logTool, updateTool,
    addBlock, updateBlock, blocksFor, removeBlock, toggleSplit,
    canvasMode, setCanvasMode, temperature, setTemperature, skill, setSkill,
  } = useStudio();

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Resolved client-side after mount so SSR + first client render agree (no hydration mismatch).
  const [speechOk, setSpeechOk] = useState(false);
  useEffect(() => { setSpeechOk("webkitSpeechRecognition" in window || "SpeechRecognition" in window); }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recRef = useRef<any>(null);

  const activeTab = tabs.find((t) => t.id === activeId);
  const slashOpen = input.startsWith("/") && !input.includes(" ");

  const worldId = useCallback(() => {
    let id = activeTab?.kind === "chat" ? activeTab.convId : dashActiveId ?? undefined;
    if (!id) id = createConversation();
    selectConversation(id);
    return id;
  }, [activeTab, dashActiveId, createConversation, selectConversation]);

  // ---- slash commands (instant ones) ----
  const runSlash = useCallback(
    (text: string): boolean => {
      const [cmd, ...rest] = text.split(" ");
      const arg = rest.join(" ");
      const wid = worldId();
      switch (cmd) {
        case "/canvas": setCanvasMode(canvasMode === "stream" ? "canvas" : "stream"); return true;
        case "/split": toggleSplit(); return true;
        case "/clear": blocksFor(wid).forEach((b) => removeBlock(b.id)); return true;
        case "/note":
          if (arg.trim()) { openChatTab(wid, "Notes"); addBlock({ worldId: wid, kind: "note", text: arg }); }
          return true;
        case "/table": {
          const rows = arg.split("\\n").map((r) => r.split(",").map((c) => c.trim()));
          if (rows.length > 1) { openChatTab(wid, "Data"); addBlock({ worldId: wid, kind: "table", rows }); }
          return true;
        }
        default: return false;
      }
    },
    [worldId, canvasMode, setCanvasMode, toggleSplit, blocksFor, removeBlock, openChatTab, addBlock],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      if (text.startsWith("/") && runSlash(text)) { setInput(""); return; }

      const wid = worldId();
      openChatTab(wid, text.slice(0, 40) || "Chat");

      // routing — biased by the active skill pill
      let routed = resolveSendModel(text);
      if (skill !== "auto") {
        const want = SKILL_INTENT[skill];
        const pick = availableModels.find((m) => m.intent === want) ?? availableModels.find((m) => m.intent === "general") ?? activeModel ?? availableModels[0];
        if (pick) routed = { providerId: pick.providerId, model: pick.model, label: pick.label, intent: want };
      }

      const history = conversations.find((c) => c.id === wid)?.messages ?? [];
      const payload = [...history, { role: "user", content: text }].map((m: any) => ({ role: m.role, content: withDocs(m.content, m.attachments) }));

      addBlock({ worldId: wid, kind: "prompt", text });
      const respId = addBlock({ worldId: wid, kind: "response", text: "", streaming: true, model: routed.label, intent: routed.intent });
      addTokens(Math.ceil(text.length / 4), 0);
      setInput("");
      setBusy(true);

      setWorkflow([
        { label: "Parse request", state: "active" },
        { label: skill === "auto" ? `Auto-route → ${routed.label}` : `${skill} → ${routed.label}`, state: "pending" },
        { label: "Generate response", state: "pending" },
        { label: "Verify output", state: "pending" },
      ]);
      setAgentStatus("thinking");
      setTimeout(() => advanceWorkflow(), 300);

      const tool = logTool({ tool: "model", label: `Run · ${routed.label}`, status: "running", detail: `temp ${temperature}` });
      const controller = new AbortController();
      abortRef.current = controller;

      let final = "";
      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId: routed.providerId, model: routed.model, messages: payload, temperature }),
          signal: controller.signal,
        });
        setAgentStatus("running");
        advanceWorkflow();
        if (!res.body) throw new Error("no stream");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = dec.decode(value, { stream: true });
          final += chunk;
          updateBlock(respId, { text: final });
          addTokens(0, Math.max(1, Math.round(chunk.length / 4)));
        }
        updateBlock(respId, { streaming: false, versions: [final] });
        // Promote code + tables into their own interactive blocks.
        const { code, tables } = blocksFromText(final);
        code.forEach((c) => addBlock({ worldId: wid, kind: "code", lang: c.lang, code: c.code }));
        tables.forEach((rows) => addBlock({ worldId: wid, kind: "table", rows }));
        updateTool(tool, { status: "done", detail: `${final.length.toLocaleString()} chars` });
      } catch (err) {
        updateTool(tool, { status: "error", detail: (err as Error)?.name === "AbortError" ? "stopped" : "failed" });
        updateBlock(respId, { streaming: false, text: final || ((err as Error)?.name === "AbortError" ? "_⏹ Stopped._" : "Request failed. Check your provider in Admin.") });
      } finally {
        abortRef.current = null;
        // Persist to the conversation so Worlds + Command Center stay in sync.
        updateMessages(wid, (m) => [
          ...m,
          { id: crypto.randomUUID(), role: "user", content: text },
          { id: crypto.randomUUID(), role: "assistant", content: final, intent: routed.intent, model: routed.label },
        ] as ChatMessage[]);
        setAgentStatus("done");
        advanceWorkflow();
        setBusy(false);
      }
    },
    [busy, runSlash, worldId, openChatTab, resolveSendModel, skill, availableModels, activeModel, conversations, addBlock, addTokens, setWorkflow, setAgentStatus, advanceWorkflow, logTool, updateTool, updateBlock, updateMessages, temperature],
  );

  const stop = () => abortRef.current?.abort();

  const toggleVoice = useCallback(() => {
    if (!speechOk) return;
    if (listening) { recRef.current?.stop(); return; }
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onresult = (e: any) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; setInput((p) => (p ? p + " " : "") + t.trim()); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  }, [speechOk, listening]);
  useEffect(() => () => recRef.current?.stop?.(), []);

  const onSubmit = (e: FormEvent) => { e.preventDefault(); send(input); };

  return (
    <div className="flex-none px-4 pb-4 pt-2">
      <div className="relative mx-auto max-w-4xl">
        <HudCorners color="rgba(139,92,246,0.5)" />

        {/* slash command menu */}
        <AnimatePresence>
          {slashOpen && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute bottom-full left-0 z-50 mb-2 w-72 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop backdrop-blur-xl">
              {SLASH.filter((s) => s.cmd.startsWith(input)).map((s) => (
                <button key={s.cmd} onClick={() => { if (!runSlash(s.cmd)) setInput(s.cmd + " "); else setInput(""); document.getElementById("studio-composer")?.focus(); }} className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:bg-surface-2">
                  <span className="font-mono text-[13px] text-success">{s.cmd}</span>
                  <span className="text-[11px] text-faint">{s.desc}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-2xl border border-violet/25 bg-surface p-3 shadow-[0_0_40px_-16px_rgba(139,92,246,0.6)] backdrop-blur-xl">
          {/* control row */}
          <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">NEX·ERA Terminal</span>
            <ModelChip open={pickerOpen} setOpen={setPickerOpen} autoRoute={autoRoute} model={model} models={availableModels} activeModel={activeModel} onAuto={() => { setAutoRoute(true); setPickerOpen(false); }} onPick={(k) => { setActiveModel(k); setAutoRoute(false); setPickerOpen(false); }} />
            {/* skill pills */}
            <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
              {SKILLS.map((s) => (
                <button key={s.key} onClick={() => setSkill(s.key)} className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${skill === s.key ? "bg-surface-3 text-ink" : "text-faint hover:text-ink"}`}>{s.label}</button>
              ))}
            </div>
            <TempControl value={temperature} onChange={setTemperature} />
            <span className="flex-1" />
            <KbdHint />
          </div>

          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <span className="select-none pb-2.5 pl-1 font-mono text-success" aria-hidden>{">"}</span>
            <textarea
              id="studio-composer"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !slashOpen) { e.preventDefault(); send(input); } }}
              rows={1}
              aria-label="NEX-ERA terminal command"
              placeholder="Ask, build, analyze — or type / for commands"
              className="max-h-40 flex-1 resize-none bg-transparent py-2 font-mono text-[15px] text-success placeholder:text-faint outline-none"
            />
            <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files ?? []); e.target.value = ""; }} />
            <button type="button" onClick={() => fileRef.current?.click()} aria-label="Attach files" title="Attach files (PDF, Excel, Word, images, audio, video, code)" className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition-colors hover:bg-surface-2 hover:text-ink">{I.attach}</button>
            <button type="button" onClick={toggleVoice} disabled={!speechOk} aria-label={listening ? "Stop voice" : "Voice input"} aria-pressed={listening} title={speechOk ? (listening ? "Listening…" : "Voice input") : "Voice not supported here"} className={`grid h-9 w-9 place-items-center rounded-full border transition-colors disabled:opacity-30 ${listening ? "border-danger/40 bg-danger/15 text-danger" : "border-line text-muted hover:bg-surface-2 hover:text-ink"}`}>
              {listening ? <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger/60" /><span className="relative inline-flex h-3 w-3 rounded-full bg-danger" /></span> : I.mic}
            </button>
            {busy ? (
              <button type="button" onClick={stop} aria-label="Stop generating" className="grid h-9 w-12 place-items-center rounded-xl bg-white/15 text-ink transition hover:bg-surface-2">{I.stop}</button>
            ) : (
              <button type="submit" disabled={!input.trim()} aria-label="Send" className="grid h-9 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand to-violet text-white transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-30">{I.send}</button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function TempControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1" title="Sampling temperature">
      <span className="font-mono text-[10px] uppercase tracking-wider text-faint">temp</span>
      <input type="range" min={0} max={1} step={0.1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-1 w-16 cursor-pointer accent-brand" aria-label="Temperature" />
      <span className="w-6 font-mono text-[11px] tabular-nums text-muted">{value.toFixed(1)}</span>
    </label>
  );
}

function ModelChip({ open, setOpen, autoRoute, model, models, activeModel, onAuto, onPick }: {
  open: boolean; setOpen: (v: boolean) => void; autoRoute: boolean; model: string;
  models: ReturnType<typeof useDashboard>["availableModels"]; activeModel: ReturnType<typeof useDashboard>["activeModel"];
  onAuto: () => void; onPick: (k: string) => void;
}) {
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink transition-colors hover:bg-surface-3">
        {autoRoute ? <span className="font-mono font-semibold text-brand">✦ Auto</span> : <span className="max-w-[130px] truncate">{model}</span>}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faint"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute bottom-full left-0 z-50 mb-2 max-h-72 w-72 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-pop backdrop-blur-xl">
              <button onClick={onAuto} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${autoRoute ? "bg-brand/[0.12] text-white" : "text-muted hover:bg-surface-2"}`}><span className="text-brand">✦</span> Auto <span className="ml-auto text-[11px] text-faint">routes by task</span></button>
              {models.length === 0 && <p className="px-2.5 py-2 text-xs text-faint">No models — add a provider in Admin.</p>}
              {models.map((m) => {
                const k = modelKey(m);
                const active = !autoRoute && activeModel && modelKey(activeModel) === k;
                return (
                  <button key={k} onClick={() => onPick(k)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${active ? "bg-surface-3 text-ink" : "text-muted hover:bg-surface-2"}`}>
                    <span className="min-w-0 flex-1 truncate">{m.label}</span>
                    <span className="font-mono text-[10px] text-faint">{m.providerName}</span>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function KbdHint() {
  return (
    <span className="hidden items-center gap-1 font-mono text-[10px] text-faint sm:flex">
      <kbd className="rounded border border-line bg-surface-2 px-1">/</kbd> cmds
      <kbd className="rounded border border-line bg-surface-2 px-1">⏎</kbd> send
    </span>
  );
}
