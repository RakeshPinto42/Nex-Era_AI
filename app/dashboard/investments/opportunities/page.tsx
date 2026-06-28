"use client";

/* ============================================================================
   Opportunity Ranking Engine (Investment Hub Phase 6).
   ----------------------------------------------------------------------------
   Ranks opportunities by overall CONVICTION (multi-factor composite), never by
   price alone. Every card shows its factor breakdown, confidence, catalysts and
   an explicit reason for ranking. No advice.
   ========================================================================== */

import { useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { MARKET_LABELS, type MarketKey } from "@/lib/investments/scanner/types";
import type { Opportunity, OpportunityResult, FactorScores } from "@/lib/investments/opportunity/types";

const ALL_MARKETS = Object.keys(MARKET_LABELS) as MarketKey[];

export default function OpportunitiesPage() {
  const [markets, setMarkets] = useState<MarketKey[]>(["us", "etf", "crypto"]);
  const [result, setResult] = useState<OpportunityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (m: MarketKey) => setMarkets((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));

  const rank = async () => {
    if (!markets.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/investments/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markets }),
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
      title="Opportunity Engine"
      subtitle="Ranks opportunities by conviction — a multi-factor composite, never by price. Every pick explains why. Not advice."
      action={<Link href="/dashboard/investments" className="text-sm font-medium text-brand hover:underline">← Investments</Link>}
    >
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <div className="flex flex-wrap gap-2">
          {ALL_MARKETS.map((m) => (
            <button key={m} type="button" onClick={() => toggle(m)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${markets.includes(m) ? "border-brand/40 bg-brand/[0.10] text-brand" : "border-line text-muted hover:text-ink"}`}>
              {MARKET_LABELS[m]}
            </button>
          ))}
          <button type="button" onClick={rank} disabled={busy || !markets.length} className="ml-auto rounded-lg bg-brand px-5 py-1.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50">
            {busy ? "Ranking…" : "Rank Opportunities"}
          </button>
        </div>
        {result && <p className="mt-2 text-[11px] text-faint">{result.scanned} scanned · {new Date(result.asOf).toLocaleTimeString()}{result.mockData ? " · mock data" : ""}</p>}
      </div>

      {error && <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {result && (
        <div className="mt-6 space-y-6">
          {result.categories.map((cat) => (
            <section key={cat.key}>
              <p className="mb-2 text-sm font-semibold text-ink">{cat.emoji} {cat.title} <span className="text-[11px] font-normal text-muted">({cat.items.length})</span></p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cat.items.map((o, i) => <OppCard key={`${cat.key}-${o.ticker}`} o={o} rank={i + 1} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

const FACTOR_ROWS: { key: keyof FactorScores; label: string; invert?: boolean }[] = [
  { key: "businessQuality", label: "Business Quality" },
  { key: "financialHealth", label: "Financial Health" },
  { key: "growth", label: "Growth" },
  { key: "valuation", label: "Valuation" },
  { key: "technical", label: "Technical Trend" },
  { key: "newsImpact", label: "News Impact" },
  { key: "risk", label: "Risk", invert: true },
];

function OppCard({ o, rank }: { o: Opportunity; rank: number }) {
  const up = o.changePct >= 0;
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-faint">#{rank}</span>
            <Link href={`/dashboard/investments/research/${encodeURIComponent(o.ticker)}`} className="font-semibold text-ink hover:text-brand">{o.ticker}</Link>
          </p>
          <p className="truncate text-[11px] text-muted">{o.company} · {o.sector}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-brand">{o.conviction}</p>
          <p className="text-[10px] uppercase tracking-wider text-faint">conviction</p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <span className="font-mono text-ink">{o.currency === "INR" ? "₹" : "$"}{o.price}</span>
        <span className={`font-mono ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "▲" : "▼"} {Math.abs(o.changePct).toFixed(2)}%</span>
        <span className="ml-auto text-muted">{Math.round(o.confidence * 100)}% conf</span>
      </div>

      {/* factor bars */}
      <div className="mt-3 space-y-1">
        {FACTOR_ROWS.map((f) => {
          const v = o.factors[f.key];
          const good = f.invert ? 100 - v : v;
          const color = good >= 66 ? "#10b981" : good >= 40 ? "#f59e0b" : "#ef4444";
          return (
            <div key={f.key} className="flex items-center gap-2">
              <span className="w-24 flex-none text-[10px] text-muted">{f.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                <span className="block h-full rounded-full" style={{ width: `${v}%`, background: color }} />
              </span>
              <span className="w-6 text-right font-mono text-[10px] text-faint">{Math.round(v)}</span>
            </div>
          );
        })}
      </div>

      {o.catalysts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {o.catalysts.map((c) => <span key={c} className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">{c}</span>)}
        </div>
      )}

      <p className="mt-2 text-[11px] text-ink"><span className="text-faint">Why:</span> {o.reason}</p>
    </div>
  );
}
