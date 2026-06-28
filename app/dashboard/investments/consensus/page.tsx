"use client";

/* ============================================================================
   Multi-Agent Consensus (Investment Hub Phase 7).
   ----------------------------------------------------------------------------
   Above a configurable confidence threshold, Hermes orchestrates private
   specialists and synthesizes conviction — explaining agreement AND
   disagreement, never a blind average. Specialists are internal; this view
   shows their synthesized output. No advice.
   ========================================================================== */

import { useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import type { ConsensusResult, SpecialistVerdict } from "@/lib/investments/consensus/types";

export default function ConsensusPage() {
  const [ticker, setTicker] = useState("");
  const [threshold, setThreshold] = useState(0.6);
  const [res, setRes] = useState<ConsensusResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!ticker.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/investments/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: ticker.trim(), threshold }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setRes(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Multi-Agent Consensus"
      subtitle="Hermes orchestrates private specialists above a confidence threshold and explains where they agree and disagree. Not advice."
      action={<Link href="/dashboard/investments" className="text-sm font-medium text-brand hover:underline">← Investments</Link>}
    >
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input value={ticker} onChange={(e) => setTicker(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="Ticker… e.g. AAPL, NVDA, BTC" className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none focus:border-brand/50" />
          <label className="text-[12px] text-muted">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-faint">Threshold: {Math.round(threshold * 100)}%</span>
            <input type="range" min={0} max={0.9} step={0.05} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="w-40 accent-brand" />
          </label>
          <button type="button" onClick={run} disabled={busy || !ticker.trim()} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50">
            {busy ? "Convening…" : "Run Consensus"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {res && <ConsensusView r={res} />}
    </PageShell>
  );
}

function ConsensusView({ r }: { r: ConsensusResult }) {
  if (r.gated) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[13px] text-amber-800">
        <p className="font-semibold">{r.company} ({r.ticker}) — below threshold</p>
        <p className="mt-1">{r.researchSummary}</p>
      </div>
    );
  }
  const cColor = r.overallConviction >= 66 ? "#10b981" : r.overallConviction >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="mt-4 space-y-4">
      {/* synthesis header */}
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-2xl font-semibold" style={{ color: cColor }}>{r.overallConviction}</p>
            <p className="text-[10px] uppercase tracking-wider text-faint">conviction</p>
          </div>
          <div className="text-[12px] text-muted">
            <p>{r.company} · {r.ticker}</p>
            <p>{Math.round(r.overallConfidence * 100)}% confidence · dispersion {r.dispersion} · {r.summaryMode}{r.fromMock ? " · mock" : ""}</p>
          </div>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{r.researchSummary}</p>
      </div>

      {/* specialists */}
      <div className="grid gap-3 sm:grid-cols-2">
        {r.verdicts.map((v) => <SpecialistCard key={v.id} v={v} />)}
      </div>

      {/* agreement / disagreement */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Areas of Agreement">
          {r.agreement.length ? <ul className="space-y-1">{r.agreement.map((a, i) => <li key={i} className="text-[13px] text-ink">• {a}</li>)}</ul> : <Empty>—</Empty>}
        </Panel>
        <Panel title="Areas of Disagreement">
          {r.disagreements.length ? (
            <ul className="space-y-2">
              {r.disagreements.map((d, i) => (
                <li key={i} className="text-[13px]">
                  <span className="font-medium text-ink">{d.between[0]} vs {d.between[1]}</span>
                  <span className="ml-1 font-mono text-[11px] text-faint">Δ{d.spread}</span>
                  <p className="text-[12px] text-muted">{d.explanation}</p>
                </li>
              ))}
            </ul>
          ) : <Empty>Specialists broadly aligned.</Empty>}
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Key Risks">
          {r.keyRisks.length ? <ul className="space-y-1">{r.keyRisks.map((k, i) => <li key={i} className="text-[13px] text-ink">⚠ {k}</li>)}</ul> : <Empty>None flagged.</Empty>}
        </Panel>
        <Panel title="Supporting Evidence">
          {r.supportingEvidence.length ? <ul className="space-y-1">{r.supportingEvidence.map((e, i) => <li key={i} className="text-[13px] text-muted">• {e}</li>)}</ul> : <Empty>—</Empty>}
        </Panel>
      </div>
    </div>
  );
}

function SpecialistCard({ v }: { v: SpecialistVerdict }) {
  const color = v.score >= 60 ? "#10b981" : v.score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">{v.name}</span>
        <span className="font-mono text-[12px]" style={{ color }}>{Math.round(v.score)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <span className="block h-full rounded-full" style={{ width: `${v.score}%`, background: color }} />
      </div>
      <p className="mt-1 text-[10px] text-faint">{Math.round(v.confidence * 100)}% confidence</p>
      {v.evidence.length > 0 && <p className="mt-1.5 text-[11px] text-muted"><span className="text-faint">Evidence:</span> {v.evidence.join("; ")}</p>}
      {v.concerns.length > 0 && <p className="mt-0.5 text-[11px] text-muted"><span className="text-faint">Concerns:</span> {v.concerns.join("; ")}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
