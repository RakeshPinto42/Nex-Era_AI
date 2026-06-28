"use client";

/* Investment Hub sections that aren't part of the asset-browsing tables:
   Market Overview (indices + movers + breadth), Portfolio (live-valued holdings),
   News feed, and the Economic Calendar placeholder. Uses the Nex-Era DS tokens
   (`.nex` scope) to match the Investments page. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboard } from "@/components/dashboard/store";

/* ----------------------------------------------------------------- shared */

export type Idx = {
  symbol: string; name: string; currency: string;
  price: number; d24: number | null; d7: number | null; d30: number | null; d1y: number | null; series: number[];
};
export type Mover = {
  key: string; name: string; symbol: string; cls: string;
  price: number; currency: string; d24: number | null; series: number[];
};

function money(n: number, currency = "USD") {
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : "";
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return `${sym}${n.toLocaleString(locale, { maximumFractionDigits: n >= 1 ? 2 : 6 })}`;
}
const fmtPct = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);
const pc = (n: number | null) => (n == null ? "text-[var(--nex-text-faint)]" : n >= 0 ? "text-emerald-400" : "text-danger");

function Spark({ series, w = 90, h = 28 }: { series: number[]; w?: number; h?: number }) {
  if (!series || series.length < 2) return <span className="text-[var(--nex-text-faint)]">—</span>;
  const min = Math.min(...series), max = Math.max(...series), rng = max - min || 1;
  const up = series[series.length - 1] >= series[0];
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - min) / rng) * h}`).join(" ");
  return <svg width={w} height={h} className="block"><polyline points={pts} fill="none" stroke={up ? "#10b981" : "#ef4444"} strokeWidth={1.4} strokeLinejoin="round" /></svg>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] p-4 ${className}`}>{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--nex-text-faint)]">{children}</p>;
}

/* ============================================================ MARKET OVERVIEW */

export function MarketOverview({ indices, movers, loading }: { indices: Idx[]; movers: Mover[]; loading: boolean }) {
  const gainers = useMemo(() => movers.filter((m) => (m.d24 ?? 0) > 0).sort((a, b) => (b.d24 ?? 0) - (a.d24 ?? 0)).slice(0, 6), [movers]);
  const losers = useMemo(() => movers.filter((m) => (m.d24 ?? 0) < 0).sort((a, b) => (a.d24 ?? 0) - (b.d24 ?? 0)).slice(0, 6), [movers]);
  const up = movers.filter((m) => (m.d24 ?? 0) > 0).length;
  const down = movers.filter((m) => (m.d24 ?? 0) < 0).length;
  const breadth = up + down ? Math.round((up / (up + down)) * 100) : 50;

  if (loading && !indices.length)
    return <p className="py-10 text-center text-sm text-[var(--nex-text-faint)]">Loading market overview…</p>;

  return (
    <div className="space-y-5">
      {/* indices ribbon */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {indices.map((ix) => (
          <Card key={ix.symbol} className="!p-3">
            <p className="truncate text-[12px] font-semibold text-[var(--nex-text)]">{ix.name}</p>
            <p className="mt-0.5 font-mono text-sm text-[var(--nex-text)]">{money(ix.price, ix.currency)}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className={`font-mono text-[12px] ${pc(ix.d24)}`}>{fmtPct(ix.d24)}</span>
              <Spark series={ix.series} w={52} h={18} />
            </div>
          </Card>
        ))}
        {!indices.length && <p className="col-span-full text-sm text-[var(--nex-text-faint)]">Index data unavailable right now.</p>}
      </div>

      {/* breadth */}
      <Card>
        <Label>Market breadth · 24h (tracked assets)</Label>
        <div className="flex items-center gap-3">
          <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-danger/30">
            <div className="h-full bg-emerald-500" style={{ width: `${breadth}%` }} />
          </div>
          <span className="font-mono text-[12px] text-[var(--nex-text-muted)]"><b className="text-emerald-400">{up}</b> up · <b className="text-danger">{down}</b> down</span>
        </div>
      </Card>

      {/* movers */}
      <div className="grid gap-4 md:grid-cols-2">
        <MoverList title="Top gainers · 24h" rows={gainers} />
        <MoverList title="Top losers · 24h" rows={losers} />
      </div>
    </div>
  );
}

function MoverList({ title, rows }: { title: string; rows: Mover[] }) {
  return (
    <Card>
      <Label>{title}</Label>
      {rows.length === 0 ? <p className="text-sm text-[var(--nex-text-faint)]">—</p> : (
        <ul className="space-y-1.5">
          {rows.map((m) => (
            <li key={m.key} className="flex items-center gap-3">
              <span className="w-9 flex-none font-mono text-[9px] uppercase tracking-wider text-[var(--nex-text-faint)]">{m.cls}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--nex-text)]">{m.name}</span>
              <Spark series={m.series} w={56} h={18} />
              <span className="w-24 text-right font-mono text-[12px] text-[var(--nex-text-muted)]">{money(m.price, m.currency)}</span>
              <span className={`w-16 text-right font-mono text-[12px] ${pc(m.d24)}`}>{fmtPct(m.d24)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ============================================================ PORTFOLIO */

type Holding = { id: string; symbol: string; name: string; qty: number; buy: number; currency: string };

export function Portfolio({ userKey, priceMap, assets }: {
  userKey: string;
  priceMap: Map<string, number>;
  assets: { key: string; name: string; currency: string }[];
}) {
  const storeKey = `nexera.invest.portfolio.${userKey}`;
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [sym, setSym] = useState(""); const [qty, setQty] = useState(""); const [buy, setBuy] = useState("");
  const loaded = useRef(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(storeKey); if (raw) setHoldings(JSON.parse(raw)); } catch { /* ignore */ }
    loaded.current = true;
  }, [storeKey]);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(storeKey, JSON.stringify(holdings)); } catch { /* ignore */ } }, [holdings, storeKey]);

  const assetByKey = useMemo(() => new Map(assets.map((a) => [a.key, a])), [assets]);

  const add = () => {
    const key = sym.trim();
    const a = assetByKey.get(key);
    const q = Number(qty), b = Number(buy);
    if (!key || !q || !b) return;
    setHoldings((p) => [...p, { id: `h_${Date.now()}`, symbol: key, name: a?.name ?? key, qty: q, buy: b, currency: a?.currency ?? "USD" }]);
    setSym(""); setQty(""); setBuy("");
  };
  const remove = (id: string) => setHoldings((p) => p.filter((h) => h.id !== id));

  const rows = holdings.map((h) => {
    const live = priceMap.get(h.symbol);
    const cur = live ?? h.buy;
    const value = cur * h.qty, cost = h.buy * h.qty, pl = value - cost;
    const plPct = cost ? (pl / cost) * 100 : 0;
    return { ...h, live, value, cost, pl, plPct };
  });
  // Totals per currency (don't mix ₹ and $).
  const byCur = rows.reduce((m, r) => { const c = m.get(r.currency) ?? { cost: 0, value: 0 }; c.cost += r.cost; c.value += r.value; m.set(r.currency, c); return m; }, new Map<string, { cost: number; value: number }>());

  return (
    <div className="space-y-4">
      {/* totals */}
      {byCur.size > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[...byCur.entries()].map(([cur, t]) => {
            const pl = t.value - t.cost, plPct = t.cost ? (pl / t.cost) * 100 : 0;
            return (
              <Card key={cur} className="sm:col-span-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><Label>Invested ({cur})</Label><p className="font-mono text-lg text-[var(--nex-text)]">{money(t.cost, cur)}</p></div>
                  <div><Label>Current value</Label><p className="font-mono text-lg text-[var(--nex-text)]">{money(t.value, cur)}</p></div>
                  <div><Label>Total P/L</Label><p className={`font-mono text-lg ${pc(pl)}`}>{pl >= 0 ? "+" : ""}{money(pl, cur)} ({fmtPct(plPct)})</p></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* add form */}
      <Card>
        <Label>Add holding</Label>
        <div className="flex flex-wrap items-center gap-2">
          <input list="pf-assets" value={sym} onChange={(e) => setSym(e.target.value)} placeholder="Symbol (e.g. AAPL, RELIANCE.NS, GC=F)" className="min-w-[220px] flex-1 rounded-lg border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-3 py-2 text-sm outline-none focus:border-[var(--nex-border-glow)]" />
          <datalist id="pf-assets">{assets.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}</datalist>
          <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" placeholder="Qty" className="w-24 rounded-lg border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-3 py-2 text-sm outline-none focus:border-[var(--nex-border-glow)]" />
          <input value={buy} onChange={(e) => setBuy(e.target.value)} type="number" placeholder="Buy price" className="w-28 rounded-lg border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-3 py-2 text-sm outline-none focus:border-[var(--nex-border-glow)]" />
          <button onClick={add} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Add</button>
        </div>
        <p className="mt-2 text-[11px] text-[var(--nex-text-faint)]">Live price pulls from the tracked assets above. Untracked symbols value at your buy price until added to a watchlist.</p>
      </Card>

      {/* holdings table */}
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--nex-text-faint)]">No holdings yet. Add one above to track live P/L.</p>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-[var(--nex-border)] text-[var(--nex-text-faint)]">
                {["Asset", "Qty", "Buy", "Live", "Value", "P/L", ""].map((h, i) => <th key={i} className={`px-3 py-2 font-medium ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--nex-border)]/50">
                    <td className="px-3 py-2"><p className="font-medium text-[var(--nex-text)]">{r.name}</p><p className="font-mono text-[10px] text-[var(--nex-text-faint)]">{r.symbol}</p></td>
                    <td className="px-3 py-2 text-right font-mono">{r.qty}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--nex-text-muted)]">{money(r.buy, r.currency)}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.live != null ? money(r.live, r.currency) : <span className="text-[var(--nex-text-faint)]">—</span>}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--nex-text)]">{money(r.value, r.currency)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${pc(r.pl)}`}>{r.pl >= 0 ? "+" : ""}{money(r.pl, r.currency)}<br /><span className="text-[11px]">{fmtPct(r.plPct)}</span></td>
                    <td className="px-3 py-2 text-right"><button onClick={() => remove(r.id)} className="text-[var(--nex-text-faint)] hover:text-danger">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ============================================================ NEWS FEED */

type NewsItem = { title: string; url: string; source: string; time: string };

export function NewsFeed({ queries }: { queries: { name: string; kind: string }[] }) {
  const [items, setItems] = useState<NewsItem[] | "loading" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItems("loading");
      try {
        const all = await Promise.all(
          queries.slice(0, 5).map((qy) =>
            fetch(`/api/investments/news?name=${encodeURIComponent(qy.name)}&kind=${encodeURIComponent(qy.kind)}`)
              .then((r) => r.json()).then((d) => (Array.isArray(d.items) ? d.items : [])).catch(() => [])),
        );
        if (cancelled) return;
        const seen = new Set<string>();
        const merged = all.flat().filter((n: NewsItem) => n.url && !seen.has(n.url) && seen.add(n.url))
          .sort((a, b) => (Date.parse(b.time) || 0) - (Date.parse(a.time) || 0)).slice(0, 30);
        setItems(merged.length ? merged : "error");
      } catch { if (!cancelled) setItems("error"); }
    })();
    return () => { cancelled = true; };
  }, [JSON.stringify(queries)]); // eslint-disable-line react-hooks/exhaustive-deps

  const [snap, setSnap] = useState<NewsItem | null>(null);

  if (items === "loading") return <p className="py-10 text-center text-sm text-[var(--nex-text-faint)]">Fetching market news…</p>;
  if (items === "error") return <p className="py-10 text-center text-sm text-[var(--nex-text-faint)]">No news available right now.</p>;
  return (
    <>
      <div className="space-y-2">
        {items.map((n, i) => (
          <button key={i} onClick={() => setSnap(n)} className="group flex w-full items-center gap-3 rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] p-3 text-left transition-colors hover:border-[var(--nex-border-glow)]">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-[var(--nex-text)]">{n.title}</span>
              <span className="mt-1 block font-mono text-[11px] text-[var(--nex-text-faint)]">{n.source}{n.time ? ` · ${n.time}` : ""}</span>
            </span>
            <span className="flex flex-none items-center gap-1 rounded-md bg-[rgba(59,130,246,0.12)] px-2 py-1 text-[11px] font-medium text-[var(--nex-accent-3)] opacity-0 transition-opacity group-hover:opacity-100">✦ Summary</span>
          </button>
        ))}
      </div>
      {snap && <NewsSnapshot item={snap} onClose={() => setSnap(null)} />}
    </>
  );
}

/* AI snapshot — Edge-style: open a news item as a streamed summary, not the long
   page. Fetches the article text via /api/research (website mode) then streams a
   bullet summary via /api/run. */
function NewsSnapshot({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const { resolveSendModel } = useDashboard();
  const [summary, setSummary] = useState("");
  const [state, setState] = useState<"loading" | "streaming" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "website", url: item.url }) });
        const d = await r.json();
        const text: string = d.sources?.[0]?.content ?? "";
        if (cancelled) return;
        const routed = resolveSendModel(`news: ${item.title}`);
        const prompt = `Summarize this news article in 3–4 short bullet points, then a one-line "**Takeaway:**". Be factual and concise, no preamble.\n\nHeadline: ${item.title}\nSource: ${item.source}\n\n${text ? `Article:\n${text.slice(0, 6000)}` : "(Full text unavailable — summarize from the headline and note that.)"}`;
        const res = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId: routed.providerId, model: routed.model, messages: [{ role: "user", content: prompt }] }) });
        if (!res.body) throw new Error("no stream");
        setState("streaming");
        const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "";
        for (;;) { const { value, done } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); if (!cancelled) setSummary(acc); }
        if (!cancelled) setState("done");
      } catch { if (!cancelled) setState("error"); }
    })();
    return () => { cancelled = true; };
  }, [item, resolveSendModel]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-6 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="nex flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--nex-border-strong)] bg-[var(--nex-bg-raised)] shadow-[var(--nex-shadow-lg)]">
        <div className="flex flex-none items-start gap-3 border-b border-[var(--nex-border)] p-4">
          <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-brand text-sm">✦</span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-snug text-[var(--nex-text)]">{item.title}</p>
            <p className="mt-0.5 font-mono text-[11px] text-[var(--nex-text-faint)]">{item.source}{item.time ? ` · ${item.time}` : ""} · AI snapshot</p>
          </div>
          <button onClick={onClose} className="flex-none text-[var(--nex-text-faint)] hover:text-[var(--nex-text)]">✕</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {state === "loading" && <p className="flex items-center gap-2 text-sm text-[var(--nex-text-muted)]"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-[var(--nex-accent-3)]" /> Reading the article & summarizing…</p>}
          {state === "error" && <p className="text-sm text-[var(--nex-text-muted)]">Couldn’t generate a snapshot for this one.</p>}
          {(state === "streaming" || state === "done") && <SnapBody text={summary} streaming={state === "streaming"} />}
        </div>
        <div className="flex flex-none items-center justify-between border-t border-[var(--nex-border)] p-3">
          <span className="font-mono text-[10px] text-[var(--nex-text-faint)]">Snapshot — verify before acting.</span>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[var(--nex-border)] px-3 py-1.5 text-[12px] text-[var(--nex-text-muted)] hover:text-[var(--nex-text)]">Open original ↗</a>
        </div>
      </div>
    </div>
  );
}

function SnapBody({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <div className="text-[14px] leading-relaxed text-[var(--nex-text)]">
      {text.split("\n").filter((l) => l.trim()).map((line, i) => {
        const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
        const body = bullet ? bullet[1] : line;
        const parts = body.split(/(\*\*[^*]+\*\*)/).map((s, j) => (s.startsWith("**") && s.endsWith("**") ? <strong key={j} className="font-semibold">{s.slice(2, -2)}</strong> : <span key={j}>{s}</span>));
        return bullet
          ? <p key={i} className="mb-1.5 flex gap-2"><span className="text-[var(--nex-accent-3)]">•</span><span>{parts}</span></p>
          : <p key={i} className="mb-1.5">{parts}</p>;
      })}
      {streaming && <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-[var(--nex-accent-3)] animate-blink" />}
    </div>
  );
}

/* ============================================================ ECONOMIC CALENDAR */

export function EconomicCalendar() {
  const types = ["RBI / MPC rate decision", "US Fed FOMC", "CPI / inflation prints", "GDP releases", "Jobs / NFP", "Earnings season"];
  return (
    <div className="grid place-items-center py-12">
      <Card className="max-w-lg text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand text-xl">📅</div>
        <p className="text-lg font-semibold text-[var(--nex-text)]">Economic Calendar — coming soon</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--nex-text-muted)]">
          A live macro calendar needs a dedicated events feed (no reliable keyless source yet). It will track:
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {types.map((t) => <span key={t} className="rounded-full border border-[var(--nex-border)] px-2.5 py-1 text-[11px] text-[var(--nex-text-muted)]">{t}</span>)}
        </div>
      </Card>
    </div>
  );
}
