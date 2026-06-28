"use client";

/* ============================================================================
   Investment Research Workspace (Investment Hub Phase 9).
   ----------------------------------------------------------------------------
   The primary place to research a company. Any ticker clicked anywhere in the
   Hub opens here. Reuses the Investment Intelligence Agent (/api/agents/stock)
   and Multi-Agent Consensus (/api/investments/consensus) — no new APIs. Every
   section updates independently; notes persist locally.
   ========================================================================== */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import type { NormalizedMarketData } from "@/lib/agents/stock-agent/market-data";
import type { InvestmentInsights } from "@/lib/agents/stock-agent/types";
import type { ConsensusResult } from "@/lib/investments/consensus/types";

const PEERS: Record<string, string[]> = {
  AAPL: ["MSFT", "GOOGL", "SAMSUNG", "DELL"],
  MSFT: ["AAPL", "GOOGL", "AMZN", "ORCL"],
  NVDA: ["AMD", "INTC", "TSM", "AVGO"],
  GOOGL: ["META", "MSFT", "AMZN"],
  AMZN: ["WMT", "MSFT", "GOOGL"],
  TSLA: ["BYD", "GM", "F", "RIVN"],
  BTC: ["ETH", "SOL", "BNB"],
  ETH: ["BTC", "SOL", "ADA"],
  SPY: ["VOO", "QQQ", "VTI"],
  QQQ: ["SPY", "VGT", "XLK"],
};
const SECTOR_LEADERS = ["AAPL", "MSFT", "NVDA", "JPM", "UNH", "XOM"];

export default function ResearchWorkspacePage() {
  const params = useParams();
  const ticker = decodeURIComponent(String(params.ticker || "")).toUpperCase();

  const [data, setData] = useState<NormalizedMarketData | null>(null);
  const [insights, setInsights] = useState<InvestmentInsights | null>(null);
  const [stockBusy, setStockBusy] = useState(true);
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
  const [consBusy, setConsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStock = useCallback(async () => {
    setStockBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/agents/stock?ticker=${encodeURIComponent(ticker)}`).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setData(r.data);
      setInsights(r.insights);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStockBusy(false);
    }
  }, [ticker]);

  const loadConsensus = useCallback(async () => {
    setConsBusy(true);
    try {
      const r = await fetch("/api/investments/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, threshold: 0.4 }),
      }).then((x) => x.json());
      if (!r.error) setConsensus(r);
    } finally {
      setConsBusy(false);
    }
  }, [ticker]);

  useEffect(() => { loadStock(); loadConsensus(); }, [loadStock, loadConsensus]);

  return (
    <PageShell
      title={ticker || "Research"}
      subtitle="AI research workspace — reuses the Investment Intelligence Agent + Consensus. Not advice."
      action={<Link href="/dashboard/investments/overview" className="text-sm font-medium text-brand hover:underline">← Hub</Link>}
    >
      {error && <p className="mb-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-4">
        <Header data={data} busy={stockBusy} onRefresh={loadStock} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Research insights={insights} data={data} busy={stockBusy} />
            <Consensus c={consensus} busy={consBusy} onRefresh={loadConsensus} />
            <Timeline data={data} insights={insights} ticker={ticker} />
          </div>
          <div className="space-y-4">
            <Notes ticker={ticker} />
            <Related ticker={ticker} sector={data?.sector} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

/* ---------- helpers ---------- */
const card = "rounded-2xl border border-line bg-surface-2 p-4";
const head = "mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted";
const fmtCap = (n: number) => (n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${n}`);
function Skel({ rows = 3 }: { rows?: number }) { return <div className="space-y-2">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-4 animate-pulse rounded bg-surface-3" />)}</div>; }
function valuationZone(pe: number, ps: number) { const s = pe <= 0 ? 50 : 100 - pe * 2.2 - ps * 1.5; return s >= 66 ? "Undervalued" : s >= 45 ? "Fair Value" : "Rich"; }

function Header({ data, busy, onRefresh }: { data: NormalizedMarketData | null; busy: boolean; onRefresh: () => void }) {
  if (busy && !data) return <div className={card}><Skel rows={2} /></div>;
  if (!data) return null;
  const up = data.changePct >= 0;
  const pos = data.technicals.high52w > data.technicals.low52w ? ((data.price - data.technicals.low52w) / (data.technicals.high52w - data.technicals.low52w)) * 100 : 50;
  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">{data.company} <span className="font-mono text-sm text-faint">{data.ticker}</span></h2>
          <p className="text-[12px] text-muted">{data.exchange} · {data.sector} · {data.industry}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-ink">{data.currency === "INR" ? "₹" : "$"}{data.price.toLocaleString()}</p>
          <p className={up ? "text-emerald-600" : "text-red-600"}>{up ? "▲" : "▼"} {Math.abs(data.changePct).toFixed(2)}%</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini label="Market Cap" value={fmtCap(data.marketCap)} />
        <Mini label="Avg Volume" value={data.avgVolume ? fmtCap(data.avgVolume).replace("$", "") : "—"} />
        <Mini label="52W High" value={String(data.technicals.high52w)} />
        <Mini label="52W Low" value={String(data.technicals.low52w)} />
      </div>
      {data.beta != null && (
        <p className="mt-2 text-[11px] text-faint">Beta {data.beta} · Shares {data.sharesOutstanding ? fmtCap(data.sharesOutstanding).replace("$", "") : "—"}{data.dividend && data.dividend.yieldPct > 0 ? ` · Dividend ${data.dividend.yieldPct}% (${data.dividend.frequency})` : ""}</p>
      )}
      <Sparkline series={data.priceHistory?.["1M"] ?? data.priceHistory?.["3M"] ?? data.priceHistory?.["1Y"]} up={data.changePct >= 0} />
      {/* 52w range bar (no intraday series in the normalized schema) */}
      <div className="mt-3">
        <div className="relative h-2 rounded-full bg-surface-3">
          <div className="absolute -top-0.5 h-3 w-1 rounded bg-brand" style={{ left: `${Math.max(0, Math.min(100, pos))}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-faint"><span>52W low</span><span>position {Math.round(pos)}%</span><span>52W high</span></div>
      </div>
      <button type="button" onClick={onRefresh} disabled={busy} className="mt-3 text-[11px] text-brand hover:underline disabled:opacity-50">{busy ? "Refreshing…" : "↻ Refresh"}</button>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-line bg-surface p-2"><p className="text-[9px] uppercase tracking-wider text-faint">{label}</p><p className="font-mono text-[13px] text-ink">{value}</p></div>;
}

function Sparkline({ series, up }: { series?: number[]; up: boolean }) {
  if (!series || series.length < 2) return null;
  const w = 600, h = 48;
  const lo = Math.min(...series), hi = Math.max(...series);
  const rng = hi - lo || 1;
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - lo) / rng) * h}`).join(" ");
  const color = up ? "#10b981" : "#ef4444";
  return (
    <div className="mt-3">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-faint">Price History ({series.length}d)</p>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-12 w-full">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Research({ insights, data, busy }: { insights: InvestmentInsights | null; data: NormalizedMarketData | null; busy: boolean }) {
  if (busy && !insights) return <section className={card}><p className={head}>AI Research</p><Skel rows={6} /></section>;
  if (!insights || !data) return null;
  const pos = data.news.filter((n) => n.sentiment === "positive").length;
  const neg = data.news.filter((n) => n.sentiment === "negative").length;
  const sentiment = pos > neg ? "Positive" : neg > pos ? "Negative" : "Neutral";
  const zone = valuationZone(data.valuation.peRatio, data.valuation.priceToSales);
  const zoneColor = zone === "Undervalued" ? "#10b981" : zone === "Fair Value" ? "#f59e0b" : "#ef4444";
  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">AI Research</p>
        <span className="flex items-center gap-2 text-[11px]">
          <span className="rounded px-1.5 py-0.5" style={{ background: `${zoneColor}1f`, color: zoneColor }}>{zone}</span>
          <span className="text-muted">{Math.round(insights.confidence * 100)}% conf · {insights.suggestedHoldingPeriod}</span>
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Block t="Business Quality" b={insights.businessQuality} />
        <Block t="Financial Health" b={insights.financialHealth} />
        <Block t="Growth" b={insights.growth} />
        <Block t="Valuation" b={insights.valuation} />
        <Block t="Technical Trend" b={insights.technicalOutlook} />
        <Block t={`News Summary · ${sentiment}`} b={insights.newsSummary} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ListBlock t="Catalysts" items={insights.catalysts} />
        <ListBlock t="Risks" items={insights.risks} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Block t="Bull Case" b={insights.bullCase} />
        <Block t="Base Case" b={insights.baseCase} />
        <Block t="Bear Case" b={insights.bearCase} />
      </div>
      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">Investment Thesis</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink">{insights.investmentThesis}</p>
      </div>
    </section>
  );
}
function Block({ t, b }: { t: string; b: string }) {
  return <div className="rounded-xl border border-line bg-surface p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-faint">{t}</p><p className="mt-1 text-[12px] leading-relaxed text-ink">{b || "—"}</p></div>;
}
function ListBlock({ t, items }: { t: string; items: string[] }) {
  return <div className="rounded-xl border border-line bg-surface p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-faint">{t}</p>{items.length ? <ul className="mt-1 space-y-0.5">{items.map((i, n) => <li key={n} className="text-[12px] text-ink">• {i}</li>)}</ul> : <p className="mt-1 text-[12px] text-muted">—</p>}</div>;
}

function Consensus({ c, busy, onRefresh }: { c: ConsensusResult | null; busy: boolean; onRefresh: () => void }) {
  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Consensus</p>
        <button type="button" onClick={onRefresh} disabled={busy} className="text-[11px] text-brand hover:underline disabled:opacity-50">{busy ? "Convening…" : "↻"}</button>
      </div>
      {!c ? <Skel rows={4} /> : c.gated ? <p className="text-[12px] text-muted">{c.researchSummary}</p> : (
        <>
          <div className="mb-2 flex items-center gap-2 text-[12px]">
            <span className="text-lg font-semibold text-brand">{c.overallConviction}</span>
            <span className="text-faint">Hermes Overall · {Math.round(c.overallConfidence * 100)}% · dispersion {c.dispersion}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {c.verdicts.map((v) => {
              const color = v.score >= 60 ? "#10b981" : v.score >= 40 ? "#f59e0b" : "#ef4444";
              return (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-2 py-1 text-[11px]">
                  <span className="text-ink">{v.name.replace(" Specialist", "")}</span>
                  <span className="font-mono" style={{ color }}>{Math.round(v.score)}</span>
                </div>
              );
            })}
          </div>
          {c.disagreements[0] && <p className="mt-2 text-[11px] text-muted"><span className="text-faint">Disagreement:</span> {c.disagreements[0].explanation}</p>}
        </>
      )}
    </section>
  );
}

type TLItem = { at: number; type: string; text: string };
function Timeline({ data, insights, ticker }: { data: NormalizedMarketData | null; insights: InvestmentInsights | null; ticker: string }) {
  const items: TLItem[] = [];
  if (data) {
    for (const n of data.news) items.push({ at: n.date ? +new Date(n.date) : Date.now(), type: "News", text: n.title });
    if (data.earnings.nextDate) items.push({ at: +new Date(data.earnings.nextDate), type: "Earnings", text: `Upcoming earnings (${data.earnings.nextDate})` });
    items.push({ at: Date.now(), type: "Price", text: `${ticker} ${data.changePct >= 0 ? "+" : ""}${data.changePct.toFixed(2)}% today` });
  }
  if (insights) items.push({ at: Date.now(), type: "AI", text: `Investment Intelligence updated (${Math.round(insights.confidence * 100)}% confidence)` });
  try {
    const notes = JSON.parse(localStorage.getItem(`nexera.research.${ticker}`) || "{}");
    if (notes?.notes) items.push({ at: notes.updatedAt ?? Date.now(), type: "Note", text: "Research note saved" });
  } catch { /* */ }
  items.sort((a, b) => b.at - a.at);
  const color = (t: string) => ({ News: "#3b82f6", Earnings: "#8b5cf6", Price: "#f59e0b", AI: "#10b981", Note: "#94a3b8" }[t] ?? "#94a3b8");
  return (
    <section className={card}>
      <p className={head}>Timeline</p>
      {items.length === 0 ? <Skel rows={3} /> : (
        <ul className="space-y-2">
          {items.slice(0, 12).map((i, n) => (
            <li key={n} className="flex items-start gap-2 text-[12px]">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: color(i.type) }} />
              <span className="flex-none font-mono text-[10px] text-faint">{new Date(i.at).toLocaleDateString()}</span>
              <span className="text-faint">{i.type}</span>
              <span className="min-w-0 text-ink">{i.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- notes (localStorage per ticker) ---------- */
type NoteState = { notes: string; rating: number; tags: string[]; bookmarked: boolean; checklist: { label: string; done: boolean }[]; updatedAt: number };
const DEFAULT_CHECK = ["Understand the business", "Reviewed financials", "Checked valuation", "Identified key risks", "Defined exit plan"];
function Notes({ ticker }: { ticker: string }) {
  const key = `nexera.research.${ticker}`;
  const [s, setS] = useState<NoteState>({ notes: "", rating: 0, tags: [], bookmarked: false, checklist: DEFAULT_CHECK.map((label) => ({ label, done: false })), updatedAt: Date.now() });
  const [tagInput, setTagInput] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "null");
      if (raw) setS({ checklist: DEFAULT_CHECK.map((label) => ({ label, done: false })), tags: [], rating: 0, notes: "", bookmarked: false, updatedAt: Date.now(), ...raw });
    } catch { /* */ }
  }, [key]);

  const persist = (next: NoteState) => { setS(next); try { localStorage.setItem(key, JSON.stringify({ ...next, updatedAt: Date.now() })); } catch { /* */ } setSaved(true); setTimeout(() => setSaved(false), 1200); };
  const addTag = () => { const t = tagInput.trim(); if (t && !s.tags.includes(t)) persist({ ...s, tags: [...s.tags, t] }); setTagInput(""); };

  return (
    <section className={card}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Research Notes {saved && <span className="text-[10px] text-emerald-600">saved</span>}</p>
        <button type="button" onClick={() => persist({ ...s, bookmarked: !s.bookmarked })} className={s.bookmarked ? "text-brand" : "text-faint hover:text-ink"}>{s.bookmarked ? "★" : "☆"}</button>
      </div>
      <div className="mb-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => persist({ ...s, rating: n })} className={n <= s.rating ? "text-amber-500" : "text-faint"}>★</button>
        ))}
        <span className="ml-1 text-[10px] text-muted">conviction rating</span>
      </div>
      <textarea value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} onBlur={() => persist(s)} rows={3} placeholder="Your notes…" className="w-full resize-none rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-brand/40" />
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {s.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">{t}<button type="button" onClick={() => persist({ ...s, tags: s.tags.filter((x) => x !== t) })} className="hover:text-red-600">×</button></span>)}
        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="tag" className="w-16 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-ink outline-none focus:border-brand/40" />
      </div>
      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">Checklist</p>
        <ul className="mt-1 space-y-1">
          {s.checklist.map((c, i) => (
            <li key={i} className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={c.done} onChange={() => persist({ ...s, checklist: s.checklist.map((x, n) => (n === i ? { ...x, done: !x.done } : x)) })} className="h-3 w-3 accent-brand" />
              <span className={c.done ? "text-faint line-through" : "text-ink"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Related({ ticker, sector }: { ticker: string; sector?: string }) {
  const peers = PEERS[ticker] ?? SECTOR_LEADERS.filter((t) => t !== ticker).slice(0, 5);
  return (
    <section className={card}>
      <p className={head}>Related Companies</p>
      <p className="mb-1 text-[10px] text-faint">{PEERS[ticker] ? "Peers & competitors" : `Sector leaders${sector ? ` · ${sector}` : ""}`}</p>
      <div className="flex flex-wrap gap-1.5">
        {peers.map((p) => (
          <Link key={p} href={`/dashboard/investments/research/${encodeURIComponent(p)}`} className="rounded-md border border-line px-2 py-0.5 text-[12px] text-ink hover:border-brand/40">{p}</Link>
        ))}
      </div>
    </section>
  );
}
