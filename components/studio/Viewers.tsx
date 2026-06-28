"use client";

/* Content viewers for the Studio canvas. One component per ContentKind, routed
   by <CanvasTab>. Every viewer is self-contained and reusable. */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import CodeBlock from "@/components/dashboard/CodeBlock";
import { NexeraMark } from "@/components/Logo";
import { INTENTS, intentEmoji, type Intent } from "@/lib/brand/intent";
import { useDashboard, type ChatMessage } from "@/components/dashboard/store";
import { useStudio, type StudioFile, type Artifact } from "./store";
import { KindIcon, KIND_COLOR } from "./ui";

/* ============================================================ Markdown */

/** Compact markdown: fenced code → CodeBlock; prose → headings/lists/bold. */
export function Markdown({ text }: { text: string }) {
  const parts = text.split(/```/);
  return (
    <div className="text-[15px] leading-relaxed text-ink">
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const nl = part.indexOf("\n");
          const lang = nl > -1 ? part.slice(0, nl).trim() : "code";
          const body = nl > -1 ? part.slice(nl + 1) : part;
          return <CodeBlock key={i} code={body.replace(/\n$/, "")} lang={lang || "code"} />;
        }
        return <Prose key={i} text={part} />;
      })}
    </div>
  );
}

function Prose({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: JSX.Element[] = [];
  let list: string[] = [];
  const flushList = (k: number) => {
    if (!list.length) return;
    out.push(
      <ul key={`l${k}`} className="my-1.5 list-disc space-y-0.5 pl-5 marker:text-faint">
        {list.map((it, j) => <li key={j}>{inline(it)}</li>)}
      </ul>,
    );
    list = [];
  };
  lines.forEach((line, i) => {
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    const b = /^\s*[-*]\s+(.*)$/.exec(line);
    if (b) { list.push(b[1]); return; }
    flushList(i);
    if (h) {
      out.push(<p key={i} className="mb-1 mt-3 font-semibold text-ink first:mt-0">{inline(h[2])}</p>);
    } else if (line.trim()) {
      out.push(<p key={i} className="[&:not(:first-child)]:mt-2 whitespace-pre-wrap">{inline(line)}</p>);
    }
  });
  flushList(999);
  return <>{out}</>;
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**"))
      return <strong key={i} className="font-semibold text-ink">{seg.slice(2, -2)}</strong>;
    if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 1)
      return <code key={i} className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[0.85em] text-ink">{seg.slice(1, -1)}</code>;
    return <span key={i}>{seg}</span>;
  });
}

/* ============================================================ Chat view */

export function ChatView({ convId }: { convId?: string }) {
  const { conversations } = useDashboard();
  const { pinMemory } = useStudio();
  const convo = conversations.find((c) => c.id === convId);
  const messages = convo?.messages ?? [];

  if (messages.length === 0)
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div className="max-w-sm">
          <div className="relative mx-auto mb-5 w-fit">
            <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-gradient-to-br from-brand/25 to-violet/25 blur-2xl" />
            <NexeraMark size={52} />
          </div>
          <h2 className="text-xl font-semibold text-ink">Collaborative canvas</h2>
          <p className="mt-2 text-sm text-muted">
            Type in the terminal below, drop in files, or ask an agent to build. Responses, code and
            documents open as tabs you can split and pin.
          </p>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-6" role="log" aria-live="polite">
      {messages.map((m) => (
        <Bubble key={m.id} m={m} onPin={() => pinMemory(m.content, m.model ?? "chat")} />
      ))}
    </div>
  );
}

function Bubble({ m, onPin }: { m: ChatMessage; onPin: () => void }) {
  if (m.role === "user")
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-surface-3 px-4 py-2.5 text-[15px] leading-relaxed text-ink">
          {m.attachments?.map((a, i) => (
            <span key={i} className="mb-1.5 mr-1.5 inline-flex items-center gap-1 rounded-md bg-surface-3 px-2 py-0.5 font-mono text-[11px] text-muted">▣ {a.name}</span>
          ))}
          {m.content}
        </div>
      </motion.div>
    );
  const it = m.intent ? INTENTS[m.intent as Intent] : undefined;
  const hex = it?.hex ?? "#3b82f6";
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="group flex gap-3">
      <div className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-xl text-[15px]" style={{ background: `linear-gradient(135deg, ${hex}22, ${hex}0a)`, boxShadow: `inset 0 0 0 1px ${hex}33` }}>
        {intentEmoji(m.intent)}
      </div>
      <div className="min-w-0 flex-1">
        {m.model && (
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-sm font-medium text-ink">{m.model}</span>
            {it && <span className="rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider" style={{ background: `${hex}14`, color: hex }}>{it.label}</span>}
          </div>
        )}
        <div className="rounded-2xl rounded-tl-md border border-line bg-surface-2 px-4 py-3">
          {m.streaming && !m.content ? <Thinking /> : <Markdown text={m.content} />}
          {m.streaming && <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-brand" />}
        </div>
        {!m.streaming && m.content && (
          <button onClick={onPin} className="mt-1.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-faint opacity-0 transition hover:bg-surface-2 hover:text-ink group-hover:opacity-100">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" /></svg>
            Pin to memory
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-2 py-0.5 text-muted">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-white/55" animate={{ opacity: [0.25, 1, 0.25], y: [0, -2.5, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.16 }} />
        ))}
      </span>
      <span className="text-[13px]">Thinking…</span>
    </div>
  );
}

/* ============================================================ Files */

export function FileViewer({ file }: { file: StudioFile }) {
  if (file.status === "parsing")
    return <Centered><Spinner /> <span className="text-sm text-muted">Reading {file.name}…</span></Centered>;
  if (file.status === "error")
    return <Centered><span className="text-sm text-danger">⚠ {file.error ?? "Could not open file"}</span></Centered>;

  switch (file.kind) {
    case "image":
      return (
        <div className="grid h-full place-items-center bg-black/30 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.url} alt={file.name} className="max-h-full max-w-full rounded-lg object-contain shadow-lg" />
        </div>
      );
    case "pdf":
      return file.url ? (
        <object data={file.url} type="application/pdf" className="h-full w-full">
          <Centered><span className="text-sm text-muted">PDF preview unavailable. Extracted text:</span></Centered>
          {file.text && <pre className="whitespace-pre-wrap px-5 py-4 text-[13px] text-ink">{file.text}</pre>}
        </object>
      ) : <Centered>No preview</Centered>;
    case "video":
      return <div className="grid h-full place-items-center bg-black/40 p-4"><video src={file.url} controls className="max-h-full max-w-full rounded-lg" /></div>;
    case "audio":
      return <Centered><audio src={file.url} controls className="w-80" /></Centered>;
    case "sheet":
      return <SheetView rows={file.rows} text={file.text} />;
    case "code":
      return <div className="px-5 py-4"><CodeBlock code={file.text ?? ""} lang={file.lang ?? "code"} /></div>;
    case "doc":
    case "text":
    default:
      return (
        <div className="mx-auto max-w-3xl px-5 py-5">
          {file.text ? <Markdown text={file.text} /> : <span className="text-sm text-muted">No text content.</span>}
        </div>
      );
  }
}

function SheetView({ rows, text }: { rows?: string[][]; text?: string }) {
  if (!rows?.length)
    return text ? <pre className="whitespace-pre-wrap px-5 py-4 text-[13px] text-ink">{text}</pre> : <Centered>Empty sheet</Centered>;
  const head = rows[0];
  const body = rows.slice(1);
  return (
    <div className="h-full overflow-auto p-4">
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0">
          <tr>
            {head.map((c, j) => (
              <th key={j} className="border border-line bg-surface px-3 py-1.5 text-left font-semibold text-ink">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="odd:bg-surface-2/60">
              {head.map((_, j) => (
                <td key={j} className="border border-line px-3 py-1.5 align-top text-ink">{r[j] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 font-mono text-[11px] text-faint">{body.length} rows × {head.length} cols (first sheet, capped at 200)</p>
    </div>
  );
}

/* ============================================================ Artifact */

export function ArtifactView({ artifact }: { artifact: Artifact }) {
  const [tab, setTab] = useState<"preview" | "source">(artifact.kind === "html" ? "preview" : "source");
  return (
    <div className="flex h-full flex-col">
      {artifact.kind === "html" && (
        <div className="flex flex-none gap-1 border-b border-line px-4 py-2">
          {(["preview", "source"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${tab === t ? "bg-surface-3 text-ink" : "text-faint hover:text-ink"}`}>{t}</button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {artifact.kind === "html" && tab === "preview" ? (
          <iframe title={artifact.title} sandbox="allow-scripts" srcDoc={artifact.content} className="h-full w-full bg-white" />
        ) : artifact.kind === "markdown" ? (
          <div className="mx-auto max-w-3xl px-5 py-5"><Markdown text={artifact.content} /></div>
        ) : (
          <div className="px-5 py-4"><CodeBlock code={artifact.content} lang={artifact.lang ?? "tsx"} /></div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ helpers */

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="grid h-full place-items-center gap-2 px-6 text-center">{children}</div>;
}
function Spinner() {
  return <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />;
}

/** Tab title with its kind glyph — exported for the tabs bar + file rail. */
export function TabGlyph({ kind }: { kind: Parameters<typeof KindIcon>[0]["kind"] }) {
  return <span style={{ color: KIND_COLOR[kind] }}><KindIcon kind={kind} size={14} /></span>;
}
