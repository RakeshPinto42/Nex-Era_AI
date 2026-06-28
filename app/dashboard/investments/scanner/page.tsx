"use client";

/* ============================================================================
   AI Market Scanner (Investment Hub Phase 4).
   ----------------------------------------------------------------------------
   Continuously discovers opportunities across configurable markets via signals,
   shortlists the top picks for the Investment Intelligence Agent to research,
   and renders dynamic feeds. Scanner discovers; the IIA researches; Hermes
   orchestrates. No advice, no guaranteed returns, no trading.
   ========================================================================== */

import { useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import {
  MARKET_LABELS,
  SIGNAL_LABELS,
  type Candidate,
  type Feed,
  type MarketKey,
  type ScanResult,
} from "@/lib/investments/scanner/types";

const ALL_MARKETS = Object.keys(MARKET_LABELS) as MarketKey[];

export default function MarketScannerPage() {
  const [markets, setMarkets] = useState<MarketKey[]>(["us", "etf", "crypto"]);
  const [holdings, setHoldings] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (m: MarketKey) =>
    setMarkets((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const scan = async () => {
    if (markets.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/investments/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markets, holdings: holdings.split(",").map((s) => s.trim()).filter(Boolean) }),
      }).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="AI Market Scanner"
      subtitle="Discovers opportunities across markets and shortlists them for the Investment Intelligence Agent. Not advice."
      action={
        <Link href="/dashboard/investments" className="text-sm font-medium text-brand hover:underline">
          ← Investments
        </Link>
      }
    >
      {/* config */}
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-faint">Markets</p>
        <div className="flex flex-wrap gap-2">
          {ALL_MARKETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => toggle(m)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                markets.includes(m) ? "border-brand/40 bg-brand/[0.10] text-brand" : "border-line text-muted hover:text-ink"
              }`}
            >
              {MARKET_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={holdings}
            onChange={(e) => setHoldings(e.target.value)}
            placeholder="Your holdings (optional, comma-separated) — used to diversify… e.g. MSFT, AAPL, NVDA"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-brand/40"
          />
          <button
            type="button"
            onClick={scan}
            disabled={busy || markets.length === 0}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
          >
            {busy ? "Scanning…" : "▶ Scan Market"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {/* status */}
      {result && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Status" value="Idle" sub={`scanned ${new Date(result.status.lastScan).toLocaleTimeString()}`} />
          <Stat label="Companies Scanned" value={String(result.status.companiesScanned)} />
          <Stat label="Candidates Found" value={String(result.status.candidatesFound)} />
          <Stat label="Analysis Queue" value={String(result.status.queueDepth)} />
          <Stat label="Data" value={result.status.mockData ? "Mock" : "Live"} />
        </div>
      )}

      {/* feeds */}
      {result && (
        <div className="mt-6 space-y-6">
          {result.feeds.map((f) => <FeedRow key={f.key} feed={f} />)}
          {result.feeds.length === 0 && <p className="text-sm text-muted">No candidates surfaced — try more markets.</p>}
        </div>
      )}
    </PageShell>
  );
}

function FeedRow({ feed }: { feed: Feed }) {
  return (
    <section>
      <p className="mb-2 text-sm font-semibold text-ink">{feed.emoji} {feed.title} <span className="text-[11px] font-normal text-muted">({feed.candidates.length})</span></p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {feed.candidates.map((c) => <CandidateCard key={`${feed.key}-${c.ticker}`} c={c} />)}
      </div>
    </section>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  const up = c.changePct >= 0;
  return (
    <div className="w-64 flex-none rounded-2xl border border-line bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/dashboard/investments/research/${encodeURIComponent(c.ticker)}`} className="font-semibold text-ink hover:text-brand">{c.ticker}</Link>
        <span className={`font-mono text-[12px] ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "+" : ""}{c.changePct.toFixed(2)}%</span>
      </div>
      <p className="truncate text-[11px] text-muted">{c.company} · {MARKET_LABELS[c.market]}</p>
      <p className="mt-1 font-mono text-[11px] text-faint">{c.currency === "INR" ? "₹" : "$"}{c.price} · score {c.score}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        {c.signals.slice(0, 4).map((s) => (
          <span key={s} className="rounded bg-surface-3 px-1 py-0.5 text-[9px] text-muted">{SIGNAL_LABELS[s]}</span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted"><span className="text-faint">Reason:</span> {c.reason}</p>

      {c.research && (
        <div className="mt-2 border-t border-line pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">IIA · {Math.round(c.research.confidence * 100)}%</p>
          <p className="mt-0.5 line-clamp-3 text-[11px] text-ink">{c.research.investmentThesis}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
      {sub && <p className="text-[10px] text-faint">{sub}</p>}
    </div>
  );
}
