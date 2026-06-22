"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MODULE_BY_SLUG } from "@/lib/fpa/modules";

type Msg = { id: string; role: "user" | "ai"; text: string; streaming?: boolean };

const DEFAULT_PROMPTS = [
  "Summarize this month's performance",
  "What needs my attention before close?",
  "Draft the CFO update",
];

export default function AIAssistant({ open }: { open: boolean }) {
  const path = usePathname();
  const slug = path.startsWith("/fpa/") ? path.slice(5) : null;
  const mod = slug ? MODULE_BY_SLUG[slug] : null;
  const prompts = mod?.prompts ?? DEFAULT_PROMPTS;
  const moduleName = mod?.name ?? "Executive";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep a ref to the latest history so send() doesn't depend on `messages`.
  const historyRef = useRef<Msg[]>([]);
  historyRef.current = messages;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;

      const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text: t };
      const id = crypto.randomUUID();
      // Snapshot history (incl. the new user turn) for the API call.
      const payloadMessages = [...historyRef.current, userMsg].map((m) => ({
        role: m.role,
        text: m.text,
      }));

      setMessages((m) => [
        ...m,
        userMsg,
        { id, role: "ai", text: "", streaming: true },
      ]);
      setInput("");
      setBusy(true);

      const setAi = (updater: (prev: string) => string) =>
        setMessages((m) =>
          m.map((msg) =>
            msg.id === id ? { ...msg, text: updater(msg.text) } : msg,
          ),
        );

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: payloadMessages,
            moduleSlug: slug,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setAi((prev) => prev + chunk);
        }
      } catch {
        setAi(
          (prev) =>
            prev || "Copilot unreachable. Check the connection and retry.",
        );
      } finally {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === id ? { ...msg, streaming: false } : msg,
          ),
        );
        setBusy(false);
      }
    },
    [busy, slug],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 340, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex h-full flex-none flex-col overflow-hidden border-l border-black/10 bg-white/60 backdrop-blur-xl"
        >
          <div className="flex w-[340px] flex-none items-center gap-2.5 border-b border-black/10 px-4 py-3.5">
            <span className="relative grid h-8 w-8 place-items-center rounded-lg glass-strong">
              <span className="font-mono text-[11px] font-bold text-gradient-emerald">
                AI
              </span>
              <span className="absolute inset-0 rounded-lg ring-1 ring-navy/40" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Ledger Assistant</p>
              <p className="font-mono text-[10px] text-black/40">
                context: {moduleName}
              </p>
            </div>
          </div>

          {/* messages */}
          <div
            ref={scrollRef}
            className="min-h-0 w-[340px] flex-1 overflow-y-auto p-3"
          >
            {messages.length === 0 ? (
              <div className="px-1 pt-2">
                <p className="text-sm text-black/55">
                  Ask anything about{" "}
                  <span className="text-ink">{moduleName}</span>. I can model
                  scenarios, explain variances and draft commentary.
                </p>
                <p className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-widest text-black/35">
                  Suggested
                </p>
                <div className="space-y-1.5">
                  {prompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="w-full rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-left text-[13px] text-black/70 transition-colors hover:border-navy/30 hover:text-ink"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <Bubble key={m.id} msg={m} />
                ))}
              </div>
            )}
          </div>

          {/* composer */}
          <div className="w-[340px] flex-none border-t border-black/10 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-black/10 bg-black/[0.04] p-1.5 focus-within:border-navy/40">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                aria-label="Ask Ledger"
                placeholder="Ask the copilot…"
                className="max-h-28 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-black/35 outline-none"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || busy}
                aria-label="Send to copilot"
                className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-navy text-white transition-transform hover:scale-105 disabled:opacity-30"
              >
                ↑
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
          isUser
            ? "bg-navy/12 text-ink"
            : "border border-black/10 bg-black/[0.03] text-black/80"
        }`}
      >
        <Rendered text={msg.text} />
        {msg.streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-navy animate-blink" />
        )}
      </div>
    </div>
  );
}

function Rendered({ text }: { text: string }) {
  return (
    <span className="whitespace-pre-wrap">
      {text.split(/(\*\*[^*]+\*\*)/).map((seg, i) =>
        seg.startsWith("**") && seg.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {seg.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{seg}</span>
        ),
      )}
    </span>
  );
}
