"use client";

/* ============================================================================
   Live Market Terminal (Investment Hub Phase 5).
   ----------------------------------------------------------------------------
   Live, polling terminal — independently updating widgets, animated prices
   (green up / red down), no page reload. Reuses the NEX·ERA design system and
   the Market Intelligence Tool. No advice, no trading.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { TerminalProvider, useTerminal } from "@/components/investments/terminal/store";
import { economicCalendar } from "@/lib/investments/terminal/calendar";
import type { LiteQuote, AIOpportunity } from "@/lib/investments/terminal/types";

export default function TerminalPage() {
  return (
    <TerminalProvider>
      <PageShell
        title="Live Market Terminal"
        subtitle="Live market intelligence — independently updating widgets, no reload. Not advice."
        action={<Link href="/dashboard/investments" className="text-sm font-medium text-brand hover:underline">← Investments</Link>}
      >
        <Terminal />
      </PageShell>
    </TerminalProvider>
  );
}

function Terminal() {
  const { snap, live, updatedAt, error } = useTerminal();

  if (error && !snap) return <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>;
  if (!snap) return <p className="text-sm text-muted">Connecting to live market…</p>;

  return (
    <div className="space-y-4">
      {/* live status bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500 pulse-dot" : "bg-faint"}`} />
          {live ? "LIVE" : "Reconnecting"}
        </span>
        <Breadth />
        <span className="ml-auto font-mono text-faint">updated {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "—"}{snap.mockData ? " · mock" : ""}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Widget title="📊 Market Overview" className="lg:col-span-3"><Overview /></Widget>
        <Widget title="🟢 Top Gainers"><QuoteList items={snap.gainers} /></Widget>
        <Widget title="🔴 Top Losers"><QuoteList items={snap.losers} /></Widget>
        <Widget title="⚡ Most Active"><QuoteList items={snap.mostActive} /></Widget>
        <Widget title="🔥 Trending"><QuoteList items={snap.trending} /></Widget>
        <Widget title="🧭 Sector Rotation"><Sectors /></Widget>
        <Widget title="🗺 Heat Map"><HeatMap /></Widget>
        <Widget title="🤖 AI Opportunities"><AIOpps items={snap.aiOpportunities} /></Widget>
        <Widget title="🧠 AI Activity"><AIActivity opps={snap.aiOpportunities} /></Widget>
        <Widget title="📅 Upcoming Earnings"><Earnings /></Widget>
        <Widget title="🗓 Economic Calendar"><Calendar /></Widget>
        <Widget title="⭐ Watchlist"><Watchlist /></Widget>
        <Widget title="💼 Portfolio"><Portfolio /></Widget>
        <Widget title="📰 Breaking News" className="lg:col-span-3"><News /></Widget>
      </div>
    </div>
  );
}

/* ---- shared ---- */

function Widget({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface-2 p-4 ${className}`}>
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
      {children}
    </section>
  );
}

const fmtPrice = (q: { price: number; currency: string }) => `${q.currency === "INR" ? "₹" : "$"}${q.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fmtCap = (n: number) => (n >= 1e12 ? `${(n / 1e12).toFixed(1)}T` : n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : String(n));

function FlashPrice({ value, currency }: { value: number; currency: string }) {
  const prev = useRef(value);
  const [bg, setBg] = useState("transparent");
  useEffect(() => {
    if (value > prev.current) setBg("rgba(16,185,129,0.18)");
    else if (value < prev.current) setBg("rgba(239,68,68,0.18)");
    prev.current = value;
    const t = setTimeout(() => setBg("transparent"), 700);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span className="rounded px-1 font-mono tabular-nums transition-colors" style={{ backgroundColor: bg, transitionDuration: "700ms" }}>
      {fmtPrice({ price: value, currency })}
    </span>
  );
}

function ChangePct({ v }: { v: number }) {
  const up = v >= 0;
  return <span className={`font-mono tabular-nums ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "▲" : "▼"} {Math.abs(v).toFixed(2)}%</span>;
}

function QuoteRow({ q }: { q: LiteQuote }) {
  return (
    <li className="flex items-center justify-between gap-2 py-1 text-[12px]">
      <span className="min-w-0 flex-1 truncate"><span className="font-semibold text-ink">{q.ticker}</span> <span className="text-faint">{fmtCap(q.marketCap)}</span></span>
      <FlashPrice value={q.price} currency={q.currency} />
      <span className="w-20 text-right"><ChangePct v={q.changePct} /></span>
    </li>
  );
}

function QuoteList({ items }: { items: LiteQuote[] }) {
  if (!items.length) return <p className="text-[13px] text-muted">—</p>;
  return <ul className="divide-y divide-line">{items.map((q) => <QuoteRow key={q.ticker} q={q} />)}</ul>;
}

/* ---- widgets ---- */

function Breadth() {
  const { snap } = useTerminal();
  if (!snap) return null;
  const b = snap.breadth;
  const total = b.advancers + b.decliners + b.unchanged || 1;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-emerald-600">▲ {b.advancers}</span>
      <span className="text-red-600">▼ {b.decliners}</span>
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-red-500/30">
        <span className="block h-full bg-emerald-500" style={{ width: `${(b.advancers / total) * 100}%` }} />
      </span>
      <span className="text-faint">A/D {b.ratio}</span>
    </span>
  );
}

function Overview() {
  const { snap } = useTerminal();
  if (!snap) return null;
  const avg = snap.quotes.length ? snap.quotes.reduce((s, q) => s + q.changePct, 0) / snap.quotes.length : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Avg Move" value={`${avg >= 0 ? "+" : ""}${avg.toFixed(2)}%`} color={avg >= 0 ? "#10b981" : "#ef4444"} />
      <Stat label="Advancers" value={String(snap.breadth.advancers)} color="#10b981" />
      <Stat label="Decliners" value={String(snap.breadth.decliners)} color="#ef4444" />
      <Stat label="Tracked" value={String(snap.quotes.length)} />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 text-lg font-semibold" style={{ color: color ?? "var(--ink, #1a1a1a)" }}>{value}</p>
    </div>
  );
}

function Sectors() {
  const { snap } = useTerminal();
  if (!snap) return null;
  return (
    <ul className="space-y-1.5">
      {snap.sectors.map((s) => {
        const up = s.avgChangePct >= 0;
        return (
          <li key={s.sector} className="flex items-center justify-between text-[12px]">
            <span className="truncate text-ink">{s.sector}</span>
            <span className={`font-mono ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "+" : ""}{s.avgChangePct}%</span>
          </li>
        );
      })}
    </ul>
  );
}

function HeatMap() {
  const { snap } = useTerminal();
  if (!snap) return null;
  const color = (c: number) => {
    const a = Math.min(0.55, Math.abs(c) / 8 + 0.12);
    return c >= 0 ? `rgba(16,185,129,${a})` : `rgba(239,68,68,${a})`;
  };
  return (
    <div className="grid grid-cols-4 gap-1">
      {snap.quotes.slice(0, 24).map((q) => (
        <div key={q.ticker} className="rounded-md p-1.5 text-center" style={{ backgroundColor: color(q.changePct) }} title={`${q.company} ${q.changePct}%`}>
          <p className="text-[10px] font-semibold text-ink">{q.ticker}</p>
          <p className="font-mono text-[9px] text-ink/80">{q.changePct >= 0 ? "+" : ""}{q.changePct.toFixed(1)}</p>
        </div>
      ))}
    </div>
  );
}

function AIOpps({ items }: { items: AIOpportunity[] }) {
  if (!items.length) return <p className="text-[13px] text-muted">—</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((o) => (
        <li key={o.ticker} className="flex items-center justify-between gap-2 text-[12px]">
          <span className="min-w-0 flex-1 truncate"><span className="font-semibold text-ink">{o.ticker}</span> <span className="text-faint">{o.signals.join(", ") || "—"}</span></span>
          <span className="font-mono text-brand">{Math.round(o.confidence * 100)}%</span>
        </li>
      ))}
    </ul>
  );
}

// Rotating "agent activity" feel over real tickers (presentational; the IIA does real research on demand).
function AIActivity({ opps }: { opps: AIOpportunity[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (opps.length === 0) return;
    const t = setInterval(() => setI((x) => (x + 1) % opps.length), 2500);
    return () => clearInterval(t);
  }, [opps.length]);
  if (!opps.length) return <p className="text-[13px] text-muted">Idle.</p>;
  const cur = opps[i];
  const tags = cur.signals.map((s) => (s.includes("news") ? "New Catalyst" : s.includes("large") ? "Risk Changed" : s.includes("earnings") ? "Valuation Updated" : s));
  return (
    <div className="space-y-2 text-[12px]">
      <p className="inline-flex items-center gap-1.5 text-ink"><span className="h-1.5 w-1.5 rounded-full bg-brand pulse-dot" /> Currently analyzing <span className="font-semibold">{cur.ticker}</span></p>
      <p className="text-muted">Confidence <span className="font-mono text-brand">{Math.round(cur.confidence * 100)}%</span></p>
      <div className="flex flex-wrap gap-1">{tags.map((t, n) => <span key={n} className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">{t}</span>)}</div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">Recently Updated</p>
        <ul className="mt-1 space-y-0.5">
          {opps.slice(0, 4).map((o) => <li key={o.ticker} className="text-[11px] text-muted">{o.ticker} · {Math.round(o.confidence * 100)}%</li>)}
        </ul>
      </div>
    </div>
  );
}

function Earnings() {
  const { snap } = useTerminal();
  if (!snap) return null;
  if (!snap.earnings.length) return <p className="text-[13px] text-muted">None in the next two weeks.</p>;
  return (
    <ul className="space-y-1.5">
      {snap.earnings.map((q) => (
        <li key={q.ticker} className="flex items-center justify-between text-[12px]">
          <span className="font-semibold text-ink">{q.ticker}</span>
          <span className="font-mono text-faint">{q.nextEarnings}</span>
        </li>
      ))}
    </ul>
  );
}

function Calendar() {
  const events = economicCalendar();
  const dot = (i: string) => (i === "high" ? "#ef4444" : i === "medium" ? "#f59e0b" : "#94a3b8");
  return (
    <ul className="space-y-1.5">
      {events.map((e, n) => (
        <li key={n} className="flex items-center gap-2 text-[12px]">
          <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: dot(e.importance) }} />
          <span className="min-w-0 flex-1 truncate text-ink">{e.title}</span>
          <span className="font-mono text-[10px] text-faint">{e.date.slice(5)} {e.region}</span>
        </li>
      ))}
    </ul>
  );
}

function News() {
  const { snap } = useTerminal();
  if (!snap) return null;
  if (!snap.news.length) return <p className="text-[13px] text-muted">No headlines.</p>;
  const color = (s: string) => (s === "positive" ? "#10b981" : s === "negative" ? "#ef4444" : "#94a3b8");
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {snap.news.slice(0, 12).map((n, i) => (
        <li key={i} className="flex items-start gap-2 text-[12px]">
          <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: color(n.sentiment) }} />
          <span className="min-w-0"><span className="font-semibold text-ink">{n.ticker}</span> <span className="text-muted">{n.title}</span></span>
        </li>
      ))}
    </ul>
  );
}

/* ---- watchlist + portfolio (localStorage, live-priced) ---- */

function useLivePrice() {
  const { snap } = useTerminal();
  return (ticker: string): LiteQuote | undefined => snap?.quotes.find((q) => q.ticker.toUpperCase() === ticker.toUpperCase());
}

function Watchlist() {
  const [list, setList] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const price = useLivePrice();
  useEffect(() => { try { setList(JSON.parse(localStorage.getItem("nexera.terminal.watchlist") || "[]")); } catch { setList([]); } }, []);
  const save = (next: string[]) => { setList(next); try { localStorage.setItem("nexera.terminal.watchlist", JSON.stringify(next)); } catch { /* ignore */ } };
  const add = () => { const t = input.trim().toUpperCase(); if (t && !list.includes(t)) save([...list, t]); setInput(""); };

  return (
    <div>
      <div className="mb-2 flex gap-1">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add ticker" className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-brand/40" />
        <button type="button" onClick={add} className="rounded-md bg-brand px-2 py-1 text-[12px] font-semibold text-white">+</button>
      </div>
      {list.length === 0 ? <p className="text-[12px] text-muted">Empty.</p> : (
        <ul className="divide-y divide-line">
          {list.map((t) => {
            const q = price(t);
            return (
              <li key={t} className="flex items-center justify-between gap-2 py-1 text-[12px]">
                <button type="button" onClick={() => save(list.filter((x) => x !== t))} className="text-faint hover:text-red-600">✕</button>
                <span className="flex-1 font-semibold text-ink">{t}</span>
                {q ? <><FlashPrice value={q.price} currency={q.currency} /><span className="w-16 text-right"><ChangePct v={q.changePct} /></span></> : <span className="text-faint">not tracked</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Portfolio() {
  type Holding = { ticker: string; qty: number };
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [t, setT] = useState(""); const [q, setQ] = useState("");
  const price = useLivePrice();
  useEffect(() => { try { setHoldings(JSON.parse(localStorage.getItem("nexera.terminal.portfolio") || "[]")); } catch { setHoldings([]); } }, []);
  const save = (next: Holding[]) => { setHoldings(next); try { localStorage.setItem("nexera.terminal.portfolio", JSON.stringify(next)); } catch { /* ignore */ } };
  const add = () => { const tk = t.trim().toUpperCase(); const qty = Number(q); if (tk && qty > 0) save([...holdings.filter((h) => h.ticker !== tk), { ticker: tk, qty }]); setT(""); setQ(""); };

  const total = holdings.reduce((s, h) => s + (price(h.ticker)?.price ?? 0) * h.qty, 0);

  return (
    <div>
      <div className="mb-2 flex gap-1">
        <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Ticker" className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-brand/40" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qty" type="number" className="w-16 rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-brand/40" />
        <button type="button" onClick={add} className="rounded-md bg-brand px-2 py-1 text-[12px] font-semibold text-white">+</button>
      </div>
      {holdings.length === 0 ? <p className="text-[12px] text-muted">No holdings.</p> : (
        <>
          <ul className="divide-y divide-line">
            {holdings.map((h) => {
              const qd = price(h.ticker);
              const val = (qd?.price ?? 0) * h.qty;
              return (
                <li key={h.ticker} className="flex items-center justify-between gap-2 py-1 text-[12px]">
                  <button type="button" onClick={() => save(holdings.filter((x) => x.ticker !== h.ticker))} className="text-faint hover:text-red-600">✕</button>
                  <span className="flex-1 font-semibold text-ink">{h.ticker} <span className="text-faint">×{h.qty}</span></span>
                  {qd && <span className="w-16 text-right"><ChangePct v={qd.changePct} /></span>}
                  <span className="w-20 text-right font-mono text-ink">{qd ? fmtPrice({ price: +val.toFixed(2), currency: qd.currency }) : "—"}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-right text-[12px] text-muted">Total <span className="font-semibold text-ink">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></p>
        </>
      )}
    </div>
  );
}
