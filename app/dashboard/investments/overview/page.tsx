"use client";

/* ============================================================================
   Investment Hub — Flagship Dashboard.
   ----------------------------------------------------------------------------
   ONE page that answers: what changed, what deserves attention, why, what to
   research next. Reuses existing modules only (Terminal snapshot + Opportunity
   Engine + Scanner/IIA/Consensus via their APIs). No new agents/APIs/providers.
   Independently updating widgets, animated prices, no reload.
   ========================================================================== */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { TerminalProvider, useTerminal } from "@/components/investments/terminal/store";
import type { LiteQuote } from "@/lib/investments/terminal/types";
import type { OpportunityResult, Opportunity } from "@/lib/investments/opportunity/types";

export default function InvestmentOverviewPage() {
  return (
    <TerminalProvider intervalMs={10_000}>
      <PageShell
        title="Investment Hub"
        subtitle="Live market intelligence — what changed, what matters, and what to research next. Not advice."
      >
        <Dashboard />
      </PageShell>
    </TerminalProvider>
  );
}

/* ---------- opportunities (Opportunity Engine, polled) ---------- */
function useOpportunities() {
  const [data, setData] = useState<OpportunityResult | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/investments/opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markets: ["us", "etf", "crypto"] }),
        }).then((x) => x.json());
        if (alive && !r.error) setData(r);
      } catch {
        /* keep last */
      }
    };
    load();
    const t = setInterval(load, 90_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return data;
}

function Dashboard() {
  const { snap, live, updatedAt } = useTerminal();
  const opps = useOpportunities();
  const top = opps?.categories.find((c) => c.key === "todays_top")?.items ?? [];

  return (
    <div className="space-y-4">
      <StatusBar live={live} updatedAt={updatedAt} mock={snap?.mockData} />

      {/* SECTION 1 — market overview */}
      <MarketOverview />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* SECTION 2 — AI opportunities hero */}
          <Hero items={top} ready={!!opps} />
          {/* SECTION 5 + 6 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Heatmap />
            <SectorRotation />
          </div>
          {/* SECTION 7 + 8 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Earnings />
            <BreakingNews />
          </div>
        </div>

        {/* right rail */}
        <div className="space-y-4">
          {/* SECTION 3 */}
          <ActivityFeed opps={top} />
          {/* SECTION 4 */}
          <Watchlist />
          {/* SECTION 9 */}
          <PortfolioSnapshot />
          {/* SECTION 10 */}
          <StrategyStatus />
        </div>
      </div>
    </div>
  );
}

/* ---------- shared ---------- */

const card = "rounded-2xl border border-line bg-surface-2 p-4";
const head = "mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted";

function StatusBar({ live, updatedAt, mock }: { live: boolean; updatedAt: number | null; mock?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-2 text-[12px]">
      <span className="inline-flex items-center gap-1.5 font-medium text-ink">
        <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500 pulse-dot" : "bg-faint"}`} />
        {live ? "LIVE" : "Connecting"}
      </span>
      <span className="ml-auto font-mono text-faint">
        updated {updatedAt ? new Date(updatedAt).toLocaleTimeString() : "—"}{mock ? " · mock data" : ""}
      </span>
      <Link href="/dashboard/investments/opportunities" className="text-brand hover:underline">Opportunities →</Link>
      <Link href="/dashboard/investments/scanner" className="text-brand hover:underline">Scanner →</Link>
      <Link href="/dashboard/investments/terminal" className="text-brand hover:underline">Terminal →</Link>
    </div>
  );
}

function fmtCap(n: number) {
  return n >= 1e12 ? `${(n / 1e12).toFixed(1)}T` : n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : String(n);
}
function fmtPrice(price: number, currency: string) {
  return `${currency === "INR" ? "₹" : "$"}${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

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
  return <span className="rounded px-1 font-mono tabular-nums" style={{ backgroundColor: bg, transition: "background-color 700ms" }}>{fmtPrice(value, currency)}</span>;
}
function Pct({ v }: { v: number }) {
  const up = v >= 0;
  return <span className={`font-mono tabular-nums ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "▲" : "▼"} {Math.abs(v).toFixed(2)}%</span>;
}
function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-2">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-4 animate-pulse rounded bg-surface-3" />)}</div>;
}

/* ---------- SECTION 1 ---------- */
const MARKET_ORDER = ["US", "India", "Crypto", "ETF", "Commodities", "Forex"];
function MarketOverview() {
  const { snap } = useTerminal();
  const groups = useMemo(() => {
    const m = new Map<string, LiteQuote[]>();
    for (const q of snap?.quotes ?? []) { const a = m.get(q.market) ?? []; a.push(q); m.set(q.market, a); }
    return m;
  }, [snap]);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {MARKET_ORDER.map((mk) => {
        const qs = groups.get(mk) ?? [];
        const avg = qs.length ? qs.reduce((s, q) => s + q.changePct, 0) / qs.length : null;
        const up = (avg ?? 0) >= 0;
        return (
          <div key={mk} className="rounded-2xl border border-line bg-surface-2 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">{mk}</p>
            {avg == null ? <div className="mt-1 h-5 w-12 animate-pulse rounded bg-surface-3" /> : (
              <p className={`mt-1 text-lg font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "+" : ""}{avg.toFixed(2)}%</p>
            )}
            <p className="text-[10px] text-muted">{qs.length} tracked</p>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- SECTION 2 — hero ---------- */
function valuationZone(v: number) { return v >= 66 ? "Undervalued" : v >= 45 ? "Fair Value" : "Rich"; }
function Hero({ items, ready }: { items: Opportunity[]; ready: boolean }) {
  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">🔥 AI Opportunities</p>
        <Link href="/dashboard/investments/opportunities" className="text-xs text-brand hover:underline">View all →</Link>
      </div>
      {!ready ? <Skeleton rows={4} /> : items.length === 0 ? <p className="text-sm text-muted">No high-conviction opportunities right now.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map((o) => <HeroCard key={o.ticker} o={o} />)}
        </div>
      )}
    </section>
  );
}
function HeroCard({ o }: { o: Opportunity }) {
  const up = o.changePct >= 0;
  const zone = valuationZone(o.factors.valuation);
  const zoneColor = zone === "Undervalued" ? "#10b981" : zone === "Fair Value" ? "#f59e0b" : "#ef4444";
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{o.ticker} <span className="font-normal text-faint">{o.company}</span></p>
          <p className="mt-0.5 text-[11px]"><span className="font-mono text-ink">{fmtPrice(o.price, o.currency)}</span> <Pct v={o.changePct} /></p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-brand">{o.conviction}</p>
          <p className="text-[9px] uppercase tracking-wider text-faint">conviction</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
        <span className="rounded bg-surface-3 px-1.5 py-0.5 text-muted">Quality {Math.round(o.factors.businessQuality)}</span>
        <span className="rounded px-1.5 py-0.5" style={{ background: `${zoneColor}1f`, color: zoneColor }}>{zone}</span>
        <span className="rounded bg-surface-3 px-1.5 py-0.5 text-muted">Risk {Math.round(o.factors.risk)}</span>
        <span className="rounded bg-surface-3 px-1.5 py-0.5 text-muted">{Math.round(o.confidence * 100)}% conf</span>
      </div>
      <p className="mt-2 text-[11px] text-muted"><span className="text-faint">Why:</span> {o.reason}</p>
      {o.catalysts[0] && <p className="text-[11px] text-muted"><span className="text-faint">Next:</span> {o.catalysts[0]}</p>}
      <Link href={`/dashboard/investments/research/${encodeURIComponent(o.ticker)}`} className="mt-2 inline-block text-[11px] font-medium text-brand hover:underline">Open Research →</Link>
    </div>
  );
}

/* ---------- SECTION 3 — activity feed ---------- */
type Activity = { id: string; at: number; text: string };
function ActivityFeed({ opps }: { opps: Opportunity[] }) {
  const { snap } = useTerminal();
  const [events, setEvents] = useState<Activity[]>([]);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const push: Activity[] = [];
    const add = (key: string, text: string) => {
      if (seen.current.has(key)) return;
      seen.current.add(key);
      push.push({ id: key, at: Date.now(), text });
    };
    if (opps.length) add(`opps-${opps[0].ticker}-${opps[0].conviction}`, `Opportunity Engine: ${opps[0].ticker} leads conviction ${opps[0].conviction}`);
    if (snap) {
      const g = [...snap.quotes].sort((a, b) => b.changePct - a.changePct)[0];
      const l = [...snap.quotes].sort((a, b) => a.changePct - b.changePct)[0];
      if (g && g.changePct >= 2) add(`gain-${g.ticker}-${g.changePct.toFixed(1)}`, `${g.ticker} up ${g.changePct.toFixed(1)}%`);
      if (l && l.changePct <= -2) add(`lose-${l.ticker}-${l.changePct.toFixed(1)}`, `${l.ticker} down ${Math.abs(l.changePct).toFixed(1)}%`);
      for (const e of snap.earnings.slice(0, 1)) add(`earn-${e.ticker}-${e.nextEarnings}`, `${e.ticker} earnings ${e.nextEarnings}`);
      for (const n of snap.news.slice(0, 2)) add(`news-${n.title.slice(0, 24)}`, `${n.ticker}: ${n.title}`);
    }
    if (push.length) setEvents((prev) => [...push, ...prev].slice(0, 14));
  }, [snap, opps]);

  return (
    <section className={card}>
      <p className={head}>🧠 AI Activity</p>
      {events.length === 0 ? <Skeleton rows={4} /> : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex gap-2 text-[12px]">
              <span className="flex-none font-mono text-[10px] text-faint">{new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span className="text-ink">{e.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- SECTION 4 — watchlist ---------- */
function useLive() {
  const { snap } = useTerminal();
  return (t: string) => snap?.quotes.find((q) => q.ticker.toUpperCase() === t.toUpperCase());
}
function Watchlist() {
  const [list, setList] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const live = useLive();
  useEffect(() => { try { setList(JSON.parse(localStorage.getItem("nexera.terminal.watchlist") || "[]")); } catch { setList([]); } }, []);
  const save = (n: string[]) => { setList(n); try { localStorage.setItem("nexera.terminal.watchlist", JSON.stringify(n)); } catch { /* */ } };
  const add = () => { const t = input.trim().toUpperCase(); if (t && !list.includes(t)) save([...list, t]); setInput(""); };
  return (
    <section className={card}>
      <p className={head}>⭐ Watchlist</p>
      <div className="mb-2 flex gap-1">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add ticker" className="min-w-0 flex-1 rounded-md border border-line bg-surface px-2 py-1 text-[12px] text-ink outline-none focus:border-brand/40" />
        <button type="button" onClick={add} className="rounded-md bg-brand px-2 py-1 text-[12px] font-semibold text-white">+</button>
      </div>
      {list.length === 0 ? <p className="text-[12px] text-muted">Add tickers to track live prices + AI alerts.</p> : (
        <ul className="divide-y divide-line">
          {list.map((t) => {
            const q = live(t);
            return (
              <li key={t} className="flex items-center justify-between gap-2 py-1 text-[12px]">
                <button type="button" onClick={() => save(list.filter((x) => x !== t))} className="text-faint hover:text-red-600">✕</button>
                <span className="flex-1 font-semibold text-ink">{t}</span>
                {q ? <><FlashPrice value={q.price} currency={q.currency} /><span className="w-14 text-right"><Pct v={q.changePct} /></span></> : <span className="text-faint">—</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- SECTION 5 — heatmap ---------- */
function Heatmap() {
  const { snap } = useTerminal();
  const color = (c: number) => { const a = Math.min(0.55, Math.abs(c) / 8 + 0.12); return c >= 0 ? `rgba(16,185,129,${a})` : `rgba(239,68,68,${a})`; };
  return (
    <section className={card}>
      <p className={head}>🗺 Heat Map</p>
      {!snap ? <Skeleton rows={4} /> : (
        <div className="grid grid-cols-4 gap-1">
          {snap.quotes.slice(0, 24).map((q) => (
            <Link key={q.ticker} href={`/dashboard/investments/research/${encodeURIComponent(q.ticker)}`} className="rounded-md p-1.5 text-center transition-transform hover:scale-[1.05]" style={{ backgroundColor: color(q.changePct) }} title={`${q.company} ${q.changePct}%`}>
              <p className="text-[10px] font-semibold text-ink">{q.ticker}</p>
              <p className="font-mono text-[9px] text-ink/80">{q.changePct >= 0 ? "+" : ""}{q.changePct.toFixed(1)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- SECTION 6 — sectors ---------- */
function SectorRotation() {
  const { snap } = useTerminal();
  return (
    <section className={card}>
      <p className={head}>🧭 Sector Rotation</p>
      {!snap ? <Skeleton rows={5} /> : (
        <ul className="space-y-1.5">
          {snap.sectors.map((s) => {
            const up = s.avgChangePct >= 0;
            return (
              <li key={s.sector} className="flex items-center gap-2 text-[12px]">
                <span className="w-28 flex-none truncate text-ink">{s.sector}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.abs(s.avgChangePct) * 12)}%`, background: up ? "#10b981" : "#ef4444" }} />
                </span>
                <span className={`w-12 text-right font-mono ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "+" : ""}{s.avgChangePct}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------- SECTION 7 — earnings ---------- */
function Earnings() {
  const { snap } = useTerminal();
  const days = (d: string) => Math.max(0, Math.ceil((+new Date(d) - Date.now()) / 86400000));
  return (
    <section className={card}>
      <p className={head}>📅 Upcoming Earnings</p>
      {!snap ? <Skeleton rows={3} /> : snap.earnings.length === 0 ? <p className="text-[12px] text-muted">None in the next two weeks.</p> : (
        <ul className="space-y-1.5">
          {snap.earnings.slice(0, 6).map((q) => (
            <li key={q.ticker} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="font-semibold text-ink">{q.ticker}</span>
              <span className="text-faint">in {days(q.nextEarnings!)}d</span>
              <span className="font-mono text-[10px] text-muted">watch: move + guidance</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- SECTION 8 — breaking news ---------- */
function BreakingNews() {
  const { snap } = useTerminal();
  const why = (s: string) => (s === "positive" ? "Potential positive catalyst" : s === "negative" ? "Possible headwind" : "Context for the name");
  const color = (s: string) => (s === "positive" ? "#10b981" : s === "negative" ? "#ef4444" : "#94a3b8");
  return (
    <section className={card}>
      <p className={head}>📰 Breaking News</p>
      {!snap ? <Skeleton rows={4} /> : snap.news.length === 0 ? <p className="text-[12px] text-muted">No headlines.</p> : (
        <ul className="space-y-2">
          {snap.news.slice(0, 5).map((n, i) => (
            <li key={i} className="text-[12px]">
              <p className="flex items-start gap-1.5">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: color(n.sentiment) }} />
                <span className="text-ink">{n.title}</span>
              </p>
              <p className="ml-3 text-[11px] text-muted">{why(n.sentiment)} · {n.ticker}</p>
              <a href={`https://news.google.com/search?q=${encodeURIComponent(n.title)}`} target="_blank" rel="noreferrer" className="ml-3 text-[10px] text-brand hover:underline">Open original →</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- SECTION 9 — portfolio ---------- */
function PortfolioSnapshot() {
  type H = { ticker: string; qty: number };
  const [holdings, setHoldings] = useState<H[]>([]);
  const live = useLive();
  useEffect(() => { try { setHoldings(JSON.parse(localStorage.getItem("nexera.terminal.portfolio") || "[]")); } catch { setHoldings([]); } }, []);
  const rows = holdings.map((h) => ({ ...h, q: live(h.ticker) }));
  const value = rows.reduce((s, r) => s + (r.q?.price ?? 0) * r.qty, 0);
  const pnl = rows.reduce((s, r) => s + (r.q ? (r.q.price * r.qty) * (r.q.changePct / 100) : 0), 0);
  const sectors = new Set(rows.map((r) => r.q?.sector).filter(Boolean));
  const risk = rows.length ? rows.reduce((s, r) => s + Math.abs(r.q?.changePct ?? 0), 0) / rows.length : 0;
  return (
    <section className={card}>
      <p className={head}>💼 Portfolio Snapshot</p>
      {holdings.length === 0 ? <p className="text-[12px] text-muted">Add holdings in the <Link href="/dashboard/investments/terminal" className="text-brand hover:underline">Terminal</Link> to see P&L, exposure and risk.</p> : (
        <div className="space-y-2 text-[12px]">
          <div className="grid grid-cols-2 gap-2">
            <Mini label="Value" value={`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <Mini label="Today P&L" value={`${pnl >= 0 ? "+" : ""}$${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color={pnl >= 0 ? "#10b981" : "#ef4444"} />
            <Mini label="Positions" value={String(rows.length)} />
            <Mini label="Sectors" value={String(sectors.size)} />
          </div>
          <p className="text-[11px] text-muted">Avg volatility {risk.toFixed(1)}% · {sectors.size <= 1 ? "⚠ low diversification" : "diversified across sectors"}</p>
          <p className="text-[11px] text-faint">AI: {sectors.size <= 1 ? "consider adding a different sector to reduce concentration." : "exposure looks balanced; monitor top movers."}</p>
        </div>
      )}
    </section>
  );
}
function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return <div className="rounded-lg border border-line bg-surface p-2"><p className="text-[9px] uppercase tracking-wider text-faint">{label}</p><p className="font-semibold" style={{ color: color ?? "inherit" }}>{value}</p></div>;
}

/* ---------- SECTION 10 — strategy status ---------- */
function StrategyStatus() {
  const [strategies, setStrategies] = useState<number>(0);
  const [paper, setPaper] = useState(false);
  useEffect(() => {
    try { setStrategies((JSON.parse(localStorage.getItem("nexera.strategies") || "[]") as unknown[]).length); } catch { /* */ }
    try { setPaper((JSON.parse(localStorage.getItem("nexera.brokers") || "[]") as { brokerId: string }[]).some((c) => c.brokerId === "paper")); } catch { /* */ }
  }, []);
  const Row = ({ label, on, note }: { label: string; on: boolean; note: string }) => (
    <li className="flex items-center justify-between text-[12px]">
      <span className="text-ink">{label}</span>
      <span className={`inline-flex items-center gap-1.5 ${on ? "text-emerald-600" : "text-faint"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-faint"}`} />{note}
      </span>
    </li>
  );
  return (
    <section className={card}>
      <p className={head}>⚙ Strategy Status</p>
      <ul className="space-y-1.5">
        <Row label="Saved strategies" on={strategies > 0} note={`${strategies}`} />
        <Row label="Paper Trading" on={paper} note={paper ? "connected" : "off"} />
        <Row label="Auto Trading" on={false} note="disabled" />
        <Row label="Approval Required" on={false} note="n/a" />
      </ul>
      <div className="mt-2 flex gap-2">
        <Link href="/dashboard/investments/strategy" className="text-[11px] text-brand hover:underline">Strategy Center →</Link>
        <Link href="/dashboard/investments/broker" className="text-[11px] text-brand hover:underline">Broker Center →</Link>
      </div>
    </section>
  );
}
