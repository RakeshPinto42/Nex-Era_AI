"use client";

/* ============================================================================
   File Agent — universal document understanding (Phase 3).
   ----------------------------------------------------------------------------
   Read-only. Upload files → structural understanding + reusable context
   (detected types, relationships, suggested next agents). Reuses the existing
   upload + extraction pipeline. No editing, no business reasoning, no AI
   commentary. Lives inside the dashboard Chrome (sidebar/top bar/right panel
   reused).
   ========================================================================== */

import { useRef, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { getAgent } from "@/lib/agents/registry";
import { getTool } from "@/lib/tools/registry";
import { HEALTH_META } from "@/lib/agents/runtime";
import {
  SUPPORTED_FORMATS,
  type FileAgentContext,
  type FileUnderstanding,
} from "@/lib/agents/file-agent/types";

const AGENT = getAgent("file")!;

export default function FileAgentPage() {
  const [ctx, setCtx] = useState<FileAgentContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processed, setProcessed] = useState<{ name: string; category: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyze = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("file", f));
      const res = await fetch("/api/agents/file", { method: "POST", body: fd }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      const c: FileAgentContext = res.context;
      setCtx(c);
      setProcessed((prev) =>
        [...c.understandings.map((u) => ({ name: u.name, category: u.category })), ...prev].slice(0, 12),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="File Agent"
      subtitle="The eyes of the ecosystem — read-only document understanding for every workspace."
      action={
        <Link href="/dashboard/agents" className="text-sm font-medium text-brand hover:underline">
          ← Mission Control
        </Link>
      }
    >
      {/* agent status card */}
      <AgentCard processedCount={processed.length} />

      {/* uploader */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          analyze(e.dataTransfer.files);
        }}
        className="mt-4 rounded-2xl border border-dashed border-line bg-surface-2 p-8 text-center"
      >
        <p className="text-sm text-ink">Drop files here, or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
        >
          {busy ? "Understanding…" : "Choose files"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => analyze(e.target.files)}
        />
        <p className="mt-3 font-mono text-[11px] text-faint">
          {SUPPORTED_FORMATS.map((f) => f.label).filter((v, i, a) => a.indexOf(v) === i).join(" · ")}
        </p>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* results */}
      {ctx && <ContextView ctx={ctx} />}

      {/* recently processed */}
      {processed.length > 0 && (
        <Panel title="Recently Processed" className="mt-4">
          <ul className="space-y-1">
            {processed.map((p, i) => (
              <li key={`${p.name}-${i}`} className="flex items-center justify-between text-[13px]">
                <span className="truncate font-mono text-[12px] text-faint">{p.name}</span>
                <span className="flex-none text-[11px] text-muted">{p.category}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </PageShell>
  );
}

function AgentCard({ processedCount }: { processedCount: number }) {
  const health = HEALTH_META[AGENT.health];
  const tools = AGENT.tools.map((t) => getTool(t)?.name ?? t);
  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-brand/[0.06] to-violet/[0.05] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-xl">
            {AGENT.icon}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">{AGENT.name}</h2>
              <span className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                v{AGENT.version}
              </span>
            </div>
            <p className="mt-0.5 max-w-xl text-[13px] text-faint">{AGENT.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: health.color }} />
            {health.label}
          </span>
          <span className="text-faint">Status: {AGENT.status}</span>
          <span className="text-faint">{processedCount} processed this session</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniBlock label="Capabilities">
          <ChipRow items={AGENT.capabilities} />
        </MiniBlock>
        <MiniBlock label="Tools (via runtime)">
          <ChipRow items={tools} />
        </MiniBlock>
        <MiniBlock label="Workspace Coverage">
          <ChipRow items={["all workspaces"]} />
        </MiniBlock>
      </div>
    </div>
  );
}

function ContextView({ ctx }: { ctx: FileAgentContext }) {
  return (
    <div className="mt-4 space-y-4">
      <Panel title="File Understanding">
        <div className="space-y-3">
          {ctx.understandings.map((u) => (
            <FileRow key={u.name} u={u} />
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Detected Types">
          <ChipRow items={ctx.detectedTypes} />
        </Panel>
        <Panel title="Suggested Next Agents">
          {ctx.suggestedAgents.length === 0 ? (
            <Empty>None.</Empty>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {ctx.suggestedAgents.map((id) => {
                const a = getAgent(id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[12px] text-ink">
                    {a?.icon} {a?.name ?? id}
                  </span>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-[11px] text-faint">Hermes decides what runs next.</p>
        </Panel>
      </div>

      {ctx.relationships.length > 0 && (
        <Panel title="Document Relationships">
          <ul className="space-y-1.5">
            {ctx.relationships.map((r, i) => (
              <li key={i} className="text-[13px] text-ink">
                {r.label}
                <span className="ml-1 font-mono text-[11px] text-muted">({r.files.join(", ")})</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function FileRow({ u }: { u: FileUnderstanding }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-ink">{u.name}</span>
        <span className="rounded-full border border-brand/40 px-2 py-0.5 text-[11px] font-medium text-brand">
          {u.category}
        </span>
        <span className="font-mono text-[11px] text-muted">{Math.round(u.confidence * 100)}% conf</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
        <span>{u.kind}</span>
        <span>{formatBytes(u.sizeBytes)}</span>
        {u.sheets != null && <span>{u.sheets} sheet(s)</span>}
        {u.pages != null && <span>{u.pages} page(s)</span>}
        <span>{u.encoding}</span>
        {u.language && <span>lang: {u.language}</span>}
        {u.hasTables && <span>tables</span>}
        {u.hasHeaders && <span>headers</span>}
      </div>
      <p className="mt-1.5 text-[12px] text-faint">{u.structure}</p>
      {u.error && <p className="mt-1 text-[12px] text-red-600">{u.error}</p>}
    </div>
  );
}

/* primitives */
function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface-2 p-4 ${className}`}>
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
      {children}
    </section>
  );
}
function MiniBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</p>
      {children}
    </div>
  );
}
function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span key={it} className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">
          {it}
        </span>
      ))}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
