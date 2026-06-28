"use client";

/* ============================================================================
   Stock Agent — investment research console (Investment Hub Phase 1).
   ----------------------------------------------------------------------------
   Search a ticker → normalized market data (Market Intelligence Tool, mocked) →
   AI Router reasoning → structured Investment Insights. Research only: no
   buy/sell advice, no price prediction. Every conclusion references supplied
   data.
   ========================================================================== */

import { useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { getAgent } from "@/lib/agents/registry";
import { SUPPORTED_MARKETS } from "@/lib/agents/stock-agent/market-data";
import type { InvestmentInsights } from "@/lib/agents/stock-agent/types";

const AGENT = getAgent("market")!;

export default function StockAgentPage() {
  const [ticker, setTicker] = useState("");
  const [insights, setInsights] = useState<InvestmentInsights | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<{ ticker: string; company: string }[]>([]);

  const run = async (t: string) => {
    const q = t.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/stock?ticker=${encodeURIComponent(q)}`).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      const ins: InvestmentInsights = res.insights;
      setInsights(ins);
      setRecent((prev) => [{ ticker: ins.ticker, company: ins.company }, ...prev.filter((r) => r.ticker !== ins.ticker)].slice(0, 8));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Investment Intelligence Agent"
      subtitle="Evidence-based investment research over normalized market data — Investment Hub's primary reasoning engine. Research only, never advice."
      action={
        <Link href="/dashboard/agents" className="text-sm font-medium text-brand hover:underline">
          ← Mission Control
        </Link>
      }
    >
      {/* status card */}
      <div className="rounded-2xl border border-line bg-gradient-to-br from-brand/[0.06] to-violet/[0.05] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
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
          <div className="text-right text-[11px] text-muted">
            <p className="font-semibold uppercase tracking-wider text-faint">Supported Markets</p>
            <p className="mt-1">{SUPPORTED_MARKETS.join(" · ")}</p>
          </div>
        </div>
      </div>

      {/* search */}
      <div className="mt-4 flex gap-2">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(ticker)}
          placeholder="Search ticker… e.g. AAPL, MSFT, NVDA, RELIANCE"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none focus:border-brand/50"
        />
        <button
          type="button"
          onClick={() => run(ticker)}
          disabled={busy || !ticker.trim()}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
        >
          {busy ? "Researching…" : "Research"}
        </button>
      </div>

      {error && <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {insights && <InsightsView i={insights} />}

      {recent.length > 0 && (
        <Panel title="Recent Analyses" className="mt-4">
          <div className="flex flex-wrap gap-1.5">
            {recent.map((r) => (
              <button
                key={r.ticker}
                type="button"
                onClick={() => { setTicker(r.ticker); run(r.ticker); }}
                className="rounded-md border border-line px-2 py-0.5 text-[12px] text-ink hover:border-brand/40"
              >
                {r.ticker} <span className="text-muted">· {r.company}</span>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </PageShell>
  );
}

function InsightsView({ i }: { i: InvestmentInsights }) {
  return (
    <div className="mt-4 space-y-4">
      {/* header */}
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-ink">{i.company}</h3>
          <span className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] text-muted">{i.ticker}</span>
          <span className="text-[12px] text-muted">{i.exchange} · {i.sector} · {i.industry}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`rounded-md px-1.5 py-0.5 ${i.mode === "ai" ? "bg-brand/[0.10] text-brand" : "bg-surface-3 text-muted"}`}>
            {i.mode === "ai" ? "AI reasoning" : "structural fallback"}
          </span>
          <span className="text-muted">{Math.round(i.confidence * 100)}% confidence</span>
          <span className="font-mono text-faint">{i.dataFreshness}</span>
        </div>
        {i.fromMockData && (
          <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-800">
            ⚠ Data is mocked — the Market Intelligence Tool is not built yet (Phase 1). Numbers are placeholders.
          </p>
        )}
      </div>

      {/* sections */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Sec title="Company Summary" body={i.companySummary} />
        <Sec title="Business Quality" body={i.businessQuality} />
        <Sec title="Economic Moat" body={i.economicMoat} />
        <Sec title="Financial Health" body={i.financialHealth} />
        <Sec title="Growth" body={i.growth} />
        <Sec title="Profitability" body={i.profitability} />
        <Sec title="Valuation" body={i.valuation} />
        <Sec title="Technical Outlook" body={i.technicalOutlook} />
      </div>

      <Sec title="News Summary" body={i.newsSummary} />

      <div className="grid gap-3 sm:grid-cols-2">
        <ListSec title="Catalysts" items={i.catalysts} />
        <ListSec title="Investment Risks" items={i.risks} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Sec title="Bull Case" body={i.bullCase} />
        <Sec title="Base Case" body={i.baseCase} />
        <Sec title="Bear Case" body={i.bearCase} />
      </div>

      <Panel title="Investment Thesis">
        <p className="text-[13px] leading-relaxed text-ink">{i.investmentThesis}</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-muted">
          <span>Holding period: <span className="text-ink">{i.suggestedHoldingPeriod}</span></span>
          <span>Review date: <span className="text-ink">{i.suggestedReviewDate}</span></span>
        </div>
      </Panel>

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
        <p className="mt-2 text-[11px] text-faint">Hermes decides what runs next. Research only — not investment advice.</p>
      </Panel>
    </div>
  );
}

/* primitives */
function Sec({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
      <p className="text-[13px] leading-relaxed text-ink">{body || "—"}</p>
    </section>
  );
}
function ListSec({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
      {items.length ? (
        <ul className="space-y-1">{items.map((it, n) => <li key={n} className="text-[13px] text-ink">• {it}</li>)}</ul>
      ) : (
        <p className="text-sm text-muted">—</p>
      )}
    </section>
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
