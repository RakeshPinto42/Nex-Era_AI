"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import CodeBlock from "./CodeBlock";
import { NexeraMark } from "@/components/Logo";
import {
  useDashboard,
  type ChatMessage as Message,
  type ChatAttachment as Attachment,
} from "./store";

const SUGGESTIONS = [
  "Build a sales commission dashboard",
  "Refactor this React component",
  "Forecast Q4 revenue from my CSV",
  "Summarize this research paper",
];

export default function ChatInterface() {
  const {
    setAgentStatus,
    addTokens,
    advanceWorkflow,
    setWorkflow,
    model,
    autoRoute,
    resolveSendModel,
    activeConversation,
    activeId,
    createConversation,
    updateMessages,
  } = useDashboard();

  const messages = useMemo(
    () => activeConversation?.messages ?? [],
    [activeConversation],
  );
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Folder mode: when a workspace folder is open, messages route to the coding
  // agent (reads + edits real files) instead of plain chat.
  const [mode, setMode] = useState<"chat" | "code">("chat");
  const [folderRoot, setFolderRoot] = useState<string | null>(null);
  const [folderInput, setFolderInput] = useState("");
  const [folderErr, setFolderErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace/root")
      .then((r) => r.json())
      .then((d) => d.root && setFolderRoot(d.root))
      .catch(() => {});
  }, []);

  const openFolder = useCallback(async () => {
    setFolderErr(null);
    const res = await fetch("/api/workspace/root", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: folderInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFolderErr(data.error || "Could not open folder");
      return;
    }
    setFolderRoot(data.root);
  }, [folderInput]);

  const codeReady = mode === "code" && Boolean(folderRoot);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Latest history for the API payload without re-creating send().
  const historyRef = useRef<Message[]>([]);
  historyRef.current = messages;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;

      // Ensure a conversation exists to write into (lazy-create on first send).
      const convId = activeId ?? createConversation();

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        attachments: attachments.length ? attachments : undefined,
      };
      const aiId = crypto.randomUUID();

      // Payload = prior turns + this one (before placeholder).
      const payload = [...historyRef.current, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      updateMessages(convId, (m) => [
        ...m,
        userMsg,
        { id: aiId, role: "assistant", content: "", streaming: true },
      ]);
      addTokens(Math.ceil(trimmed.length / 4), 0);
      setInput("");
      setAttachments([]);
      setBusy(true);

      // Resolve target model (auto-routes by task in Auto mode).
      const routed = resolveSendModel(trimmed);

      setWorkflow([
        { label: "Parse request", state: "active" },
        {
          label: autoRoute
            ? `Auto-route → ${routed.label}`
            : `Route → ${routed.label}`,
          state: "pending",
        },
        { label: "Generate response", state: "pending" },
        { label: "Verify output", state: "pending" },
      ]);
      setAgentStatus("thinking");
      setTimeout(() => advanceWorkflow(), 300);

      const setAi = (updater: (prev: string) => string) =>
        updateMessages(convId, (m) =>
          m.map((msg) =>
            msg.id === aiId ? { ...msg, content: updater(msg.content) } : msg,
          ),
        );

      try {
        if (mode === "code" && folderRoot) {
          // NEXERA Code → coding agent edits real files, returns a JSON plan.
          const res = await fetch("/api/workspace/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instruction: trimmed,
              providerId: routed.providerId,
              model: routed.model,
            }),
          });
          setAgentStatus("running");
          advanceWorkflow();
          const data = await res.json();
          if (!res.ok) {
            setAi(() => `⚠ ${data.error || "Folder agent failed."}`);
          } else {
            const applied: { path: string; action: string }[] = data.applied ?? [];
            const lines =
              applied
                .map((a) => `- \`${a.action}\` ${a.path}`)
                .join("\n") || "_(no file changes)_";
            setAi(
              () =>
                `**${data.summary || "Done."}**\n\nChanged ${applied.length} file(s) via ${data.model}:\n${lines}${
                  data.notes ? `\n\n${data.notes}` : ""
                }`,
            );
          }
        } else {
          const res = await fetch("/api/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              providerId: routed.providerId,
              model: routed.model,
              messages: payload,
            }),
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
            setAi((prev) => prev + chunk);
            addTokens(0, Math.max(1, Math.round(chunk.length / 4)));
          }
        }
      } catch {
        setAi((prev) => prev || "Request failed. Check your provider in Admin.");
      } finally {
        updateMessages(convId, (m) =>
          m.map((msg) =>
            msg.id === aiId ? { ...msg, streaming: false } : msg,
          ),
        );
        setAgentStatus("done");
        advanceWorkflow();
        setBusy(false);
      }
    },
    [
      attachments,
      busy,
      addTokens,
      setWorkflow,
      setAgentStatus,
      advanceWorkflow,
      autoRoute,
      resolveSendModel,
      folderRoot,
      mode,
      activeId,
      createConversation,
      updateMessages,
    ],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).map((f) => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
    }));
    setAttachments((a) => [...a, ...next]);
  };

  const empty = messages.length === 0;

  return (
    <div
      className="relative flex h-full flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      {dragOver && (
        <div className="absolute inset-3 z-20 grid place-items-center rounded-2xl border-2 border-dashed border-navy/50 bg-navy/5 backdrop-blur-sm">
          <p className="text-sm font-medium text-navy">
            Drop files to attach
          </p>
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl">
          {empty ? (
            <EmptyState onPick={send} />
          ) : (
            <div
              className="space-y-6"
              role="log"
              aria-live="polite"
              aria-label="Conversation"
            >
              {messages.map((m) => (
                <MessageRow key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* composer */}
      <div className="px-4 pb-5">
        <div className="mx-auto max-w-3xl">
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 flex flex-wrap gap-2"
              >
                {attachments.map((a, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs text-black/70"
                  >
                    <span className="text-black/45">▣</span>
                    {a.name}
                    <span className="text-black/35">{a.size}</span>
                    <button
                      onClick={() =>
                        setAttachments((arr) =>
                          arr.filter((_, idx) => idx !== i),
                        )
                      }
                      className="text-black/40 hover:text-neutral-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* mode switch: NEXERA Chat · NEXERA Code · NEXERA Workspace */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-black/10 bg-black/[0.03] p-0.5">
              <button
                type="button"
                onClick={() => setMode("chat")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "chat" ? "bg-black/10 text-neutral-900" : "text-black/55 hover:text-neutral-900"
                }`}
              >
                NEXERA Chat
              </button>
              <button
                type="button"
                onClick={() => setMode("code")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "code" ? "bg-black/10 text-neutral-900" : "text-black/55 hover:text-neutral-900"
                }`}
              >
                NEXERA Code
              </button>
            </div>
            <a
              href="/workspace/code"
              className="rounded-lg border border-black/10 px-3 py-1.5 text-xs text-black/50 hover:text-neutral-900"
              title="Full code workspace with file tree"
            >
              NEXERA Workspace ↗
            </a>
            {mode === "code" && folderRoot && (
              <span className="flex items-center gap-2 rounded-lg border border-navy/30 bg-navy/[0.06] px-2.5 py-1.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-navy" />
                <span className="max-w-[260px] truncate font-mono text-navy">
                  {folderRoot}
                </span>
                <button
                  type="button"
                  onClick={() => setFolderRoot(null)}
                  className="text-black/40 hover:text-neutral-900"
                  title="Close folder"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          {/* folder picker when NEXERA Code has no folder yet */}
          {mode === "code" && !folderRoot && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <input
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), openFolder())}
                placeholder="Paste a folder path to edit  (e.g. D:\\Projects\\my-app)"
                className="min-w-[240px] flex-1 rounded-lg border border-black/10 bg-black/[0.04] px-3 py-2 font-mono text-xs outline-none focus:border-navy/40"
              />
              <button
                type="button"
                onClick={openFolder}
                disabled={!folderInput.trim()}
                className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-30"
              >
                Open folder
              </button>
              {folderErr && <span className="text-xs text-[#ff8a8a]">✕ {folderErr}</span>}
            </div>
          )}

          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-line bg-white p-2 shadow-sm transition-all focus-within:border-brand/40 focus-within:shadow-md focus-within:shadow-brand/5 focus-within:ring-4 focus-within:ring-brand/10"
          >
            <textarea
              value={input}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              aria-label="Message NEXERA"
              placeholder={
                mode === "code"
                  ? codeReady
                    ? "Tell NEXERA Code what to build or change in the folder…"
                    : "Open a folder above, then describe the change…"
                  : "Ask, build, analyze, automate…"
              }
              className="max-h-40 w-full resize-none bg-transparent px-3 py-2 text-[15px] text-neutral-900 placeholder:text-black/35 outline-none"
            />
            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="grid h-8 w-8 place-items-center rounded-lg text-black/45 transition-colors hover:bg-black/5 hover:text-neutral-900"
                  aria-label="Attach files"
                  title="Attach files"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m21.4 11.05-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.33 3.33 0 1 1 4.71 4.71L9.84 17.9a1.67 1.67 0 0 1-2.36-2.36l8.49-8.48" />
                  </svg>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => onFiles(e.target.files)}
                />
                <span className="font-mono text-[11px] text-black/30">
                  {autoRoute ? "✦ Auto-route" : model}
                </span>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || busy || (mode === "code" && !folderRoot)}
                aria-label="Send message"
                className="grid h-8 w-8 place-items-center rounded-lg bg-navy text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {busy ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-obsidian border-t-transparent" aria-hidden="true" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
                  </svg>
                )}
              </button>
            </div>
          </form>
          <p className="mt-2 text-center text-[11px] text-black/30">
            NEXERA can make mistakes. Verify critical financial outputs.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-20 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.21, 0.5, 0.27, 1] }}
        className="relative"
      >
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-gradient-to-br from-brand/25 to-violet/25 blur-2xl" />
        <NexeraMark size={64} />
      </motion.div>
      <motion.h2
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mt-7 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
      >
        One Interface.{" "}
        <span className="text-gradient-emerald">Infinite Models.</span>
      </motion.h2>
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.18, duration: 0.5 }}
        className="mt-3 max-w-md text-[15px] leading-relaxed text-muted"
      >
        Chat, code, research, generate media and automate workflows through
        decentralized intelligence.
      </motion.p>
      <div className="mt-9 grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="group rounded-xl border border-line bg-white px-4 py-3 text-left text-[15px] text-ink/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md hover:shadow-brand/5"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const attachments = message.attachments?.map((a, i) => (
    <span
      key={i}
      className="mb-2 mr-2 inline-flex items-center gap-1.5 rounded-md bg-black/30 px-2 py-1 font-mono text-xs text-black/70"
    >
      ▣ {a.name}
    </span>
  ));

  // ChatGPT pattern: user turn = compact right-aligned bubble; assistant turn =
  // full-width plain text, no card, just a small mark in the gutter.
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-black/[0.08] px-4 py-2.5 text-[15px] leading-relaxed text-neutral-900">
          {attachments}
          <Content text={message.content} streaming={message.streaming} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3"
    >
      <div className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg bg-gradient-to-br from-navy to-ice text-[11px] font-bold text-white">
        ◈
      </div>
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-md border border-black/10 bg-white px-4 py-2.5 text-[15px] leading-relaxed text-black/90 shadow-sm">
        {attachments}
        <Content text={message.content} streaming={message.streaming} />
      </div>
    </motion.div>
  );
}

// Splits content on triple-backtick fences and renders CodeBlock for code parts.
function Content({
  text,
  streaming,
}: {
  text: string;
  streaming?: boolean;
}) {
  const parts = text.split(/```/);
  return (
    <div>
      {parts.map((part, i) => {
        const isCode = i % 2 === 1;
        if (isCode) {
          const nl = part.indexOf("\n");
          const lang = nl > -1 ? part.slice(0, nl).trim() : "code";
          const body = nl > -1 ? part.slice(nl + 1) : part;
          return <CodeBlock key={i} code={body.replace(/\n$/, "")} lang={lang || "code"} />;
        }
        return (
          <span key={i} className="whitespace-pre-wrap">
            {renderInline(part)}
          </span>
        );
      })}
      {streaming && (
        <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-navy animate-blink" />
      )}
    </div>
  );
}

// Minimal **bold** inline rendering.
function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-neutral-900">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{seg}</span>;
  });
}
