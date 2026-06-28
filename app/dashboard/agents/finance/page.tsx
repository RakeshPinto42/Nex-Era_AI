"use client";

/* ============================================================================
   Finance Agent — FP&A intelligence layer (Phase 5).
   ----------------------------------------------------------------------------
   Upload financial data (Excel/CSV/statements) → structured insights: summary,
   detected metrics, trends, anomalies, variance drivers, KPI recommendations,
   suggested commentary/dashboard, suggested next agent. Reasons via the AI
   Router; reuses the extraction pipeline. Augments Finance OS — no engine,
   no ledger, no calculations beyond high-level analysis.
   ========================================================================== */

import { useRef, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { getAgent } from "@/lib/agents/registry";
import { getTool } from "@/lib/tools/registry";
import { HEALTH_META } from "@/lib/agents/runtime";
import type { FinanceInsights } from "@/lib/agents/finance-agent/types";

const AGENT = getAgent("finance")!;

export default function FinanceAgentPage() {
  const [insights, setInsights] = useState<FinanceInsights | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyze = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("file", f));
      const res = await fetch("/api/agents/finance", { method: "POST", body: fd }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setInsights(res.insights);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Finance Agent"
      subtitle="FP&A intelligence — reasons over financial data and prepares insights for downstream agents."
      action={
        <Link href="/dashboard/agents" className="text-sm font-medium text-brand hover:underline">
          ← Mission Control
        </Link>
      }
    >
      <AgentCard />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          analyze(e.dataTransfer.files);
        }}
        className="mt-4 rounded-2xl border border-dashed border-line bg-surface-2 p-8 text-center"
      >
        <p className="text-sm text-ink">Drop financial files here, or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
        >
          {busy ? "Analyzing…" : "Choose files"}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => analyze(e.target.files)} />
        <p className="mt-3 font-mono text-[11px] text-faint">Excel · CSV · PDF statements</p>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {insights && <InsightsView insights={insights} />}
    </PageShell>
  );
}

function AgentCard() {
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
              <span className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">v{AGENT.version}</span>
            </div>
            <p className="mt-0.5 max-w-xl text-[13px] text-faint">{AGENT.description}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: health.color }} />
          {health.label}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {[...AGENT.capabilities, ...tools].map((c) => (
          <span key={c} className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">{c}</span>
        ))}
      </div>
    </div>
  );
}

function InsightsView({ insights }: { insights: FinanceInsights }) {
  const i = insights;
  const dirArrow = (d: string) => (d === "up" ? "▲" : d === "down" ? "▼" : "▬");
  return (
    <div className="mt-4 space-y-4">
      <Panel title="Financial Summary">
        <p className="text-[14px] leading-relaxed text-ink">{i.financialSummary}</p>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
          <span className={`rounded-md px-1.5 py-0.5 ${i.mode === "ai" ? "bg-brand/[0.10] text-brand" : "bg-surface-3"}`}>
            {i.mode === "ai" ? "AI reasoning" : "structural fallback"}
          </span>
          <span>{Math.round(i.confidence * 100)}% confidence</span>
          {i.sources.length > 0 && <span className="font-mono">{i.sources.join(", ")}</span>}
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        {i.detectedMetrics.length > 0 && (
          <Panel title="Detected Metrics">
            <ChipRow items={i.detectedMetrics} />
          </Panel>
        )}
        {i.kpiRecommendations.length > 0 && (
          <Panel title="KPI Recommendations">
            <ul className="space-y-1.5">
              {i.kpiRecommendations.map((k, n) => (
                <li key={n} className="text-[13px]">
                  <span className="font-medium text-ink">{k.name}</span>
                  <span className="ml-1 text-muted">— {k.rationale}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {i.trends.length > 0 && (
          <Panel title="Trends">
            <List items={i.trends} />
          </Panel>
        )}
        {i.anomalies.length > 0 && (
          <Panel title="Anomalies">
            <List items={i.anomalies} />
          </Panel>
        )}
      </div>

      {i.varianceDrivers.length > 0 && (
        <Panel title="Variance Drivers">
          <ul className="space-y-1.5">
            {i.varianceDrivers.map((v, n) => (
              <li key={n} className="flex items-start gap-2 text-[13px]">
                <span className="text-muted">{dirArrow(v.direction)}</span>
                <span><span className="font-medium text-ink">{v.driver}</span> <span className="text-muted">— {v.impact}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Suggested Commentary">
          <p className="text-[13px] text-ink">{i.suggestedCommentary || "—"}</p>
        </Panel>
        <Panel title="Suggested Dashboard">
          <p className="text-[13px] text-ink">{i.suggestedDashboard || "—"}</p>
        </Panel>
      </div>

      <Panel title="Suggested Next Agents">
        <div className="flex flex-wrap gap-1.5">
          {i.suggestedNextAgents.map((id) => {
            const a = getAgent(id);
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[12px] text-ink">
                {a?.icon} {a?.name ?? id}
              </span>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-faint">Hermes decides what runs next.</p>
      </Panel>
    </div>
  );
}

/* primitives */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
      {children}
    </section>
  );
}
function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((it, n) => (
        <li key={n} className="text-[13px] text-ink">• {it}</li>
      ))}
    </ul>
  );
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
