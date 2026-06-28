"use client";

/* NEX-ERA RESEARCH HUB — shell + research bar + orchestration.
   Sources come from /api/research (web/website/youtube) or /api/extract (PDF);
   the cited summary streams from /api/run (shared model infra). Save-to-World
   writes a dashboard conversation; export emits Markdown / PDF. */

import { useCallback, useRef, useState } from "react";
import { useDashboard, type ChatMessage } from "@/components/dashboard/store";
import { useResearch, domainQuality, confidenceOf, type Mode, type Source } from "./store";
import { LeftPanel, Canvas, RightPanel } from "./views";

const MODES: { id: Mode; label: string; ph: string }[] = [
  { id: "web", label: "Web", ph: "Ask anything — deep web research across many sources…" },
  { id: "pdf", label: "PDF", ph: "Upload a PDF, then add an optional focus question…" },
  { id: "youtube", label: "YouTube", ph: "Paste a YouTube URL or video id…" },
  { id: "website", label: "Website", ph: "Paste a URL to analyze…" },
];

export default function ResearchHub() {
  const { resolveSendModel, createConversation, updateMessages } = useDashboard();
  const { active, create, update, addEvent } = useResearch();
  const [mode, setMode] = useState<Mode>("web");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const streamSummary = useCallback(
    async (id: string, topic: string, sources: Source[]) => {
      const routed = resolveSendModel(`research: ${topic}`);
      update(id, { model: routed.label, streaming: true });
      addEvent(id, `Summarizing with ${routed.label}`);
      const blocks = sources.map((s) => `[${s.id}] ${s.title} — ${s.url}\n${s.content.slice(0, 1500)}`).join("\n\n");
      const prompt =
        `You are a meticulous research analyst. Using ONLY the numbered SOURCES, write a briefing on the TOPIC.\n` +
        `- Open with a 2–3 sentence direct answer.\n- Then "## Key findings" as bullets, each ending with citations like [1][2].\n` +
        `- Add "## Caveats" noting any disagreement or gaps.\n- Cite every claim; never invent facts beyond the sources.\n\n` +
        `TOPIC: ${topic}\n\nSOURCES:\n${blocks}`;
      let final = "";
      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerId: routed.providerId, model: routed.model, messages: [{ role: "user", content: prompt }] }),
        });
        if (!res.body) throw new Error("no stream");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          final += dec.decode(value, { stream: true });
          update(id, { summary: final });
        }
      } catch {
        final = final || "Could not generate a summary — check your model provider in Admin.";
        update(id, { summary: final });
      } finally {
        update(id, { streaming: false, confidence: confidenceOf({ sources, summary: final }) });
        addEvent(id, "Summary complete");
      }
    },
    [resolveSendModel, update, addEvent],
  );

  const run = useCallback(
    async (overrideMode?: Mode) => {
      const m = overrideMode ?? mode;
      const value = input.trim();
      if (busy) return;
      if (m === "web" && !value) return;
      if ((m === "website" || m === "youtube") && !value) return;

      setBusy(true);
      const r = create(m, m === "web" ? value : m === "pdf" ? "PDF research" : value, m === "website" || m === "youtube" ? value : undefined);
      setInput("");
      try {
        let sources: Source[] = [];
        if (m === "web" || m === "website" || m === "youtube") {
          const res = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: m, query: value, url: value }) });
          const d = await res.json();
          if (!res.ok) { update(r.id, { summary: `⚠ ${d.error}` }); addEvent(r.id, "Source gathering failed"); setBusy(false); return; }
          sources = (d.sources as Source[]).map((s) => ({ ...s, quality: domainQuality(s.url) }));
        }
        update(r.id, { sources });
        addEvent(r.id, `Found ${sources.length} source${sources.length === 1 ? "" : "s"}`);
        if (sources.length) await streamSummary(r.id, r.title, sources);
      } finally {
        setBusy(false);
      }
    },
    [mode, input, busy, create, update, addEvent, streamSummary],
  );

  // PDF: extract text client→/api/extract, then summarize as a source.
  const onPdf = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || busy) return;
      setBusy(true);
      const file = files[0];
      const r = create("pdf", file.name);
      addEvent(r.id, `Uploaded ${file.name}`);
      try {
        const form = new FormData(); form.append("file", file);
        const res = await fetch("/api/extract", { method: "POST", body: form });
        const d = await res.json();
        const text: string = d.files?.[0]?.text ?? "";
        if (!text) { update(r.id, { summary: "⚠ Could not extract text from that PDF." }); setBusy(false); return; }
        const sources: Source[] = [{ id: 1, title: file.name, url: "#", content: text.slice(0, 12000), kind: "pdf", quality: 75 }];
        update(r.id, { sources });
        addEvent(r.id, "Extracted PDF text");
        const topic = input.trim() ? input.trim() : `Summarize ${file.name}`;
        await streamSummary(r.id, topic, sources);
        setInput("");
      } finally {
        setBusy(false);
      }
    },
    [busy, create, update, addEvent, input, streamSummary],
  );

  /* ---- export / save ---- */
  const exportMd = useCallback(() => {
    if (!active) return;
    const md = `# ${active.title}\n\n_Research mode: ${active.mode} · ${new Date(active.createdAt).toLocaleString()}_\n\n` +
      `${active.summary}\n\n## Sources\n${active.sources.map((s) => `${s.id}. [${s.title}](${s.url}) — quality ${s.quality}`).join("\n")}\n` +
      (active.notes ? `\n## Notes\n${active.notes}\n` : "");
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${active.title.replace(/\W+/g, "_").slice(0, 40)}.md`; a.click();
  }, [active]);

  const exportPdf = useCallback(async () => {
    if (!active) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = 515, M = 40; let y = M;
    const write = (text: string, size: number, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
      for (const line of doc.splitTextToSize(text, W)) {
        if (y > 780) { doc.addPage(); y = M; }
        doc.text(line, M, y); y += size + 4;
      }
    };
    write(active.title, 16, true); y += 6;
    write(`Research mode: ${active.mode} · ${new Date(active.createdAt).toLocaleString()}`, 9); y += 8;
    write(active.summary.replace(/[#*`]/g, ""), 11); y += 10;
    write("Sources", 13, true);
    active.sources.forEach((s) => write(`[${s.id}] ${s.title} — ${s.url}`, 9));
    doc.save(`${active.title.replace(/\W+/g, "_").slice(0, 40)}.pdf`);
  }, [active]);

  const saveWorld = useCallback(() => {
    if (!active || !active.summary) return;
    const id = createConversation();
    updateMessages(id, () => [
      { id: crypto.randomUUID(), role: "user", content: `Research: ${active.title}` },
      { id: crypto.randomUUID(), role: "assistant", content: `${active.summary}\n\n**Sources**\n${active.sources.map((s) => `${s.id}. ${s.title} — ${s.url}`).join("\n")}`, intent: "research", model: active.model },
    ] as ChatMessage[]);
    update(active.id, { savedWorldId: id });
    addEvent(active.id, "Saved to World");
  }, [active, createConversation, updateMessages, update, addEvent]);

  const cur = MODES.find((x) => x.id === mode)!;

  return (
    <div className="flex h-full flex-col bg-surface text-ink">
      {/* research bar */}
      <div className="flex-none border-b border-line bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
            {MODES.map((mm) => (
              <button key={mm.id} onClick={() => setMode(mm.id)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === mm.id ? "bg-gradient-to-r from-brand to-violet text-white" : "text-muted hover:text-ink"}`}>{mm.label}</button>
            ))}
          </div>
          {mode === "pdf" ? (
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex-1 rounded-xl border border-dashed border-line bg-surface-2 px-4 py-2.5 text-left text-sm text-muted hover:bg-surface-2 disabled:opacity-50">
              📎 {busy ? "Reading PDF…" : "Click to upload a PDF — then it’s summarized with citations"}
            </button>
          ) : (
            <div className="relative flex flex-1 items-center">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") run(); }}
                placeholder={cur.ph}
                disabled={busy}
                className="w-full rounded-xl border border-line bg-surface-2 py-2.5 pl-4 pr-24 text-sm text-ink placeholder:text-faint outline-none focus:border-brand/40"
              />
              <button onClick={() => run()} disabled={busy || !input.trim()} className="absolute right-1.5 rounded-lg bg-gradient-to-br from-brand to-violet px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
                {busy ? "…" : "Research"}
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => { onPdf(e.target.files); e.target.value = ""; }} />
        </div>
      </div>

      {/* 3-pane */}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[260px] flex-none border-r border-line bg-surface lg:block"><LeftPanel /></aside>
        <section className="min-w-0 flex-1"><Canvas /></section>
        <aside className="hidden w-[320px] flex-none border-l border-line bg-surface xl:block"><RightPanel onExportMd={exportMd} onExportPdf={exportPdf} onSaveWorld={saveWorld} /></aside>
      </div>
    </div>
  );
}
