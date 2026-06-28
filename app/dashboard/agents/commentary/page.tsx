"use client";

/* ============================================================================
   Commentary Agent — executive narrative engine (Phase 6).
   ----------------------------------------------------------------------------
   Consumes FinanceInsights (from the Finance Agent) and writes executive
   commentary for a chosen audience / tone / format. Never re-analyzes files —
   it runs the Finance Agent once to obtain insights, then generates narrative.
   The Export Tool handles formatting; this agent only produces content.
   ========================================================================== */

import { useRef, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { getAgent } from "@/lib/agents/registry";
import type { FinanceInsights } from "@/lib/agents/finance-agent/types";
import {
  AUDIENCE_PROFILES,
  COMMENTARY_TONES,
  OUTPUT_FORMATS,
  type AudienceProfile,
  type CommentaryTone,
  type OutputFormat,
  type CommentaryOutput,
} from "@/lib/agents/commentary-agent/types";

const AGENT = getAgent("commentary")!;

export default function CommentaryAgentPage() {
  const [insights, setInsights] = useState<FinanceInsights | null>(null);
  const [commentary, setCommentary] = useState<CommentaryOutput | null>(null);
  const [audience, setAudience] = useState<AudienceProfile>("Chief Financial Officer");
  const [tone, setTone] = useState<CommentaryTone>("Executive");
  const [format, setFormat] = useState<OutputFormat>("Monthly Business Review");
  const [busy, setBusy] = useState<"idle" | "finance" | "commentary">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Step 1: run Finance Agent to obtain insights (the thinking).
  const ingest = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy("finance");
    setError(null);
    setCommentary(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("file", f));
      const res = await fetch("/api/agents/finance", { method: "POST", body: fd }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setInsights(res.insights);
      await write(res.insights, audience, tone, format);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("idle");
    }
  };

  // Step 2: generate commentary from insights (the writing).
  const write = async (ins: FinanceInsights, a: AudienceProfile, t: CommentaryTone, f: OutputFormat) => {
    setBusy("commentary");
    setError(null);
    try {
      const res = await fetch("/api/agents/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insights: ins, audience: a, tone: t, format: f }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setCommentary(res.commentary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("idle");
    }
  };

  const regenerate = () => insights && write(insights, audience, tone, format);

  return (
    <PageShell
      title="Commentary Agent"
      subtitle="Executive narrative — turns Finance Agent insights into board-ready commentary. Finance thinks; Commentary writes."
      action={
        <Link href="/dashboard/agents" className="text-sm font-medium text-brand hover:underline">
          ← Mission Control
        </Link>
      }
    >
      <div className="rounded-2xl border border-line bg-gradient-to-br from-brand/[0.06] to-violet/[0.05] p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-xl">{AGENT.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">{AGENT.name}</h2>
              <span className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">v{AGENT.version}</span>
            </div>
            <p className="mt-0.5 max-w-xl text-[13px] text-faint">{AGENT.description}</p>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Select label="Audience" value={audience} options={AUDIENCE_PROFILES} onChange={(v) => setAudience(v as AudienceProfile)} />
        <Select label="Tone" value={tone} options={COMMENTARY_TONES} onChange={(v) => setTone(v as CommentaryTone)} />
        <Select label="Format" value={format} options={OUTPUT_FORMATS} onChange={(v) => setFormat(v as OutputFormat)} />
      </div>

      {/* upload */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          ingest(e.dataTransfer.files);
        }}
        className="mt-4 rounded-2xl border border-dashed border-line bg-surface-2 p-8 text-center"
      >
        <p className="text-sm text-ink">Drop financial files here, or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== "idle"}
          className="mt-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
        >
          {busy === "finance" ? "Finance Agent thinking…" : busy === "commentary" ? "Writing…" : "Choose files"}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => ingest(e.target.files)} />
        <p className="mt-3 font-mono text-[11px] text-faint">Runs Finance Agent → Commentary Agent</p>
        {insights && (
          <button
            type="button"
            onClick={regenerate}
            disabled={busy !== "idle"}
            className="mt-3 block w-full text-xs font-medium text-brand hover:underline disabled:opacity-50"
          >
            ↻ Regenerate with current audience / tone / format
          </button>
        )}
      </div>

      {error && <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {insights && (
        <Panel title="Source Insights (Finance Agent)" className="mt-4">
          <p className="text-[13px] text-ink">{insights.financialSummary}</p>
          <p className="mt-1 text-[11px] text-muted">
            {Math.round(insights.confidence * 100)}% confidence · {insights.mode}
          </p>
        </Panel>
      )}

      {commentary && <CommentaryView c={commentary} />}
    </PageShell>
  );
}

function CommentaryView({ c }: { c: CommentaryOutput }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3 text-[12px]">
        <Tag>{c.audience}</Tag>
        <Tag>{c.tone}</Tag>
        <Tag>{c.format}</Tag>
        <span className={`rounded-md px-1.5 py-0.5 ${c.mode === "ai" ? "bg-brand/[0.10] text-brand" : "bg-surface-3 text-muted"}`}>
          {c.mode === "ai" ? "AI" : "fallback"}
        </span>
        <span className="text-muted">{Math.round(c.confidence * 100)}% confidence</span>
      </div>

      {c.uncertaintyNote && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-[13px] text-amber-800">
          ⚠ {c.uncertaintyNote}
        </p>
      )}

      {/* sections */}
      <div className="space-y-3">
        {c.sections.map((s) => (
          <section key={s.key} className={`rounded-2xl border bg-surface-2 p-4 ${s.uncertain ? "border-dashed border-line" : "border-line"}`}>
            <div className="mb-1.5 flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
              {s.uncertain && <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">uncertain</span>}
            </div>
            <p className="text-[13px] leading-relaxed text-ink">{s.body}</p>
            {s.references.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-faint">refs:</span>
                {s.references.map((r, i) => (
                  <span key={i} className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">{r}</span>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* traceability + handoff */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Referenced KPIs">
          {c.referencedKpis.length ? <ChipRow items={c.referencedKpis} /> : <Empty>None.</Empty>}
        </Panel>
        <Panel title="Referenced Variance Drivers">
          {c.referencedDrivers.length ? <ChipRow items={c.referencedDrivers} /> : <Empty>None.</Empty>}
        </Panel>
        <Panel title="Suggested Export Formats">
          <ChipRow items={c.suggestedExportFormats} />
          <p className="mt-2 text-[11px] text-faint">The Export Tool handles formatting.</p>
        </Panel>
        <Panel title="Suggested Next Workflow">
          <p className="text-[13px] text-ink">{c.suggestedNextWorkflow}</p>
        </Panel>
      </div>
    </div>
  );
}

/* primitives */
function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink outline-none focus:border-brand/50"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface-2 p-4 ${className}`}>
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
      {children}
    </section>
  );
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-ink">{children}</span>;
}
function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span key={it} className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">{it}</span>
      ))}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
