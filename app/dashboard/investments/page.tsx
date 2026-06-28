"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/components/ds/tokens.css";
import PageShell, { Reveal } from "@/components/dashboard/PageShell";
import { fmtPct, type Rating } from "@/lib/investments/signals";
import { loadAlerts, saveAlerts, evaluate, type Alert, type AlertDir } from "@/lib/investments/alerts";
import { MarketOverview, Portfolio, NewsFeed, EconomicCalendar, type Idx, type Mover } from "@/components/investments/sections";

type Horizon = { rating: Rating; reason: string };
type TradePlan = { entry: number; stop: number; target: number; rr: number | null };
type Stock = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  currency: string;
  d24: number | null;
  d7: number | null;
  d30: number | null;
  d90: number | null;
  d1y: number | null;
  short: Horizon;
  long: Horizon;
  rsi: number | null;
  sma50: number | null;
  sma200: number | null;
  trend: string;
  conviction: number;
  plan: TradePlan;
  hold: string;
  series: number[];
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  divYield: number | null;
  eps: number | null;
  quality: number | null;
  fwdGrowth: number | null;
  forwardPE: number | null;
  weeklyMove: number;
};
type Metal = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  d24: number | null;
  d7: number | null;
  d30: number | null;
  rating: Rating;
  reason: string;
  hold: string;
  series: number[];
  weeklyMove: number;
};
type Crypto = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  d24: number | null;
  d7: number | null;
  d30: number | null;
  rating: Rating;
  reason: string;
  hold: string;
  series: number[];
  weeklyMove: number;
};
type Explain = { technical: string; fundamental: string; catalysts: string; model?: string };
type ExplainState = Explain | "loading" | "error";
type NewsItem = { title: string; url: string; source: string; time: string };
type NewsState = NewsItem[] | "loading" | "error";

function ago(dateStr: string): string {
  const t = Date.parse(dateStr);
  if (!t) return "";
  const h = Math.floor((Date.now() - t) / 3.6e6);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Tab = "ideas" | "stocks" | "us" | "crypto" | "gold" | "silver" | "etf" | "mf" | "margin";
const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "ideas", label: "Best Ideas", emoji: "💡" },
  { id: "stocks", label: "Indian", emoji: "📈" },
  { id: "us", label: "US", emoji: "🇺🇸" },
  { id: "crypto", label: "Crypto", emoji: "🪙" },
  { id: "gold", label: "Gold", emoji: "🥇" },
  { id: "silver", label: "Silver", emoji: "🥈" },
  { id: "etf", label: "ETF", emoji: "📊" },
  { id: "mf", label: "Mutual Funds", emoji: "🏦" },
  { id: "margin", label: "Margin", emoji: "⚡" },
];

type Section = "overview" | "portfolio" | "insights" | "news" | "watchlist" | "alerts" | "calendar";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "overview", label: "Market Overview" },
  { id: "portfolio", label: "Portfolio" },
  { id: "insights", label: "AI Insights" },
  { id: "news", label: "News" },
  { id: "watchlist", label: "Watchlist" },
  { id: "alerts", label: "Alerts" },
  { id: "calendar", label: "Economic Calendar" },
];

const RATING_STYLE: Record<Rating, string> = {
  "Strong Buy": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Buy: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  Hold: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Sell: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Strong Sell": "bg-danger/15 text-danger border-danger/30",
};
const Badge = ({ rating }: { rating: Rating }) => (
  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${RATING_STYLE[rating]}`}>
    {rating}
  </span>
);

function money(n: number, currency = "USD"): string {
  const sym = currency === "INR" ? "₹" : currency === "USD" ? "$" : "";
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return `${sym}${n.toLocaleString(locale, { maximumFractionDigits: n >= 1 ? 2 : 6 })}`;
}
const pc = (n: number | null) => (n == null ? "text-[var(--nex-text-faint)]" : n >= 0 ? "text-emerald-400" : "text-danger");

// Price that briefly flashes green/red when it changes (live feel).
function LivePrice({ value, currency }: { value: number; currency: string }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<"" | "up" | "down">("");
  useEffect(() => {
    if (value !== prev.current) {
      setFlash(value > prev.current ? "up" : "down");
      prev.current = value;
      const t = setTimeout(() => setFlash(""), 800);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <span
      className={`rounded px-1 font-mono transition-colors duration-700 ${
        flash === "up" ? "bg-emerald-500/25 text-emerald-300" : flash === "down" ? "bg-danger/25 text-rose-300" : "text-[var(--nex-text)]"
      }`}
    >
      {money(value, currency)}
    </span>
  );
}

// Compact currency for the expected weekly move (e.g. ₹12, $1.4).
const moveStr = (n: number, cur = "USD") => `${cur === "INR" ? "₹" : "$"}${n >= 10 ? Math.round(n) : n.toFixed(1)}`;
function weeklyBias(r: Rating): { a: string; c: string } {
  if (r === "Strong Buy" || r === "Buy") return { a: "▲", c: "text-emerald-400" };
  if (r === "Sell" || r === "Strong Sell") return { a: "▼", c: "text-danger" };
  return { a: "±", c: "text-[var(--nex-text-faint)]" };
}

function mcapStr(n: number | null, currency = "USD"): string {
  if (n == null) return "—";
  if (currency === "INR") {
    const cr = n / 1e7; // crore
    return cr >= 1e5 ? `₹${(cr / 1e5).toFixed(2)} L Cr` : `₹${Math.round(cr).toLocaleString("en-IN")} Cr`;
  }
  return n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T` : `$${(n / 1e9).toFixed(1)}B`;
}

// Lightweight inline SVG sparkline (cheap for many rows).
function Spark({ series, w = 84, h = 26 }: { series: number[]; w?: number; h?: number }) {
  if (!series || series.length < 2) return <span className="text-[var(--nex-text-faint)]">—</span>;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const rng = max - min || 1;
  const up = series[series.length - 1] >= series[0];
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - min) / rng) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="block">
      <polyline points={pts} fill="none" stroke={up ? "#10b981" : "#ef4444"} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}

const isBuy = (r: Rating) => r === "Strong Buy" || r === "Buy";
const isSell = (r: Rating) => r === "Sell" || r === "Strong Sell";
type SigFilter = "all" | "buy" | "sell";
const singleSig = (r: Rating, f: SigFilter) => f === "all" || (f === "buy" ? isBuy(r) : isSell(r));
const stockSig = (s: Stock, f: SigFilter) =>
  f === "all" || (f === "buy" ? isBuy(s.short.rating) || isBuy(s.long.rating) : isSell(s.short.rating) || isSell(s.long.rating));

export default function InvestmentsPage() {
  const [section, setSection] = useState<Section>("overview");
  const [user, setUser] = useState("anon");
  const [tab, setTab] = useState<Tab>("ideas");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [sig, setSig] = useState<SigFilter>("all");

  // Per-account favorites (localStorage). Star any asset; "★ Favorites" filters to them.
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [favsOnly, setFavsOnly] = useState(false);
  const favKeyRef = useRef("nexera.invest.favs.anon");

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [fired, setFired] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const alertsKeyRef = useRef("nexera.invest.alerts.anon");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const u = d.user?.username ?? "anon";
        setUser(u);
        favKeyRef.current = `nexera.invest.favs.${u}`;
        alertsKeyRef.current = `nexera.invest.alerts.${u}`;
        try {
          const raw = localStorage.getItem(favKeyRef.current);
          if (raw) setFavs(new Set(JSON.parse(raw) as string[]));
        } catch {
          /* ignore */
        }
        setAlerts(loadAlerts(alertsKeyRef.current));
      })
      .catch(() => {});
  }, []);

  const toggleFav = useCallback((k: string) => {
    setFavs((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      try {
        localStorage.setItem(favKeyRef.current, JSON.stringify([...n]));
      } catch {
        /* ignore */
      }
      return n;
    });
  }, []);

  const [crypto, setCrypto] = useState<Crypto[]>([]);
  const [cryptoErr, setCryptoErr] = useState<string | null>(null);
  const [cryptoLoading, setCryptoLoading] = useState(true);

  const [mkt, setMkt] = useState<{ growth: Stock[]; dividend: Stock[]; penny: Stock[]; us: Stock[]; etf: Stock[]; mf: Stock[]; metals: Metal[]; indices: Idx[] }>({
    growth: [],
    dividend: [],
    penny: [],
    us: [],
    etf: [],
    mf: [],
    metals: [],
    indices: [],
  });
  const [mktErr, setMktErr] = useState<string | null>(null);
  const [mktLoading, setMktLoading] = useState(true);

  const [open, setOpen] = useState<string | null>(null);
  const [explains, setExplains] = useState<Record<string, ExplainState>>({});
  const [news, setNews] = useState<Record<string, NewsState>>({});

  const loadCrypto = useCallback(async (silent = false) => {
    if (!silent) setCryptoLoading(true);
    setCryptoErr(null);
    try {
      const res = await fetch("/api/investments/crypto");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`);
      setCrypto(d.items ?? []);
    } catch (e) {
      if (!silent) setCryptoErr((e as Error).message);
    } finally {
      if (!silent) setCryptoLoading(false);
    }
  }, []);

  const loadMarkets = useCallback(async (silent = false) => {
    if (!silent) setMktLoading(true);
    setMktErr(null);
    try {
      const res = await fetch("/api/investments/markets");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? `HTTP ${res.status}`);
      setMkt({ growth: d.growth ?? [], dividend: d.dividend ?? [], penny: d.penny ?? [], us: d.us ?? [], etf: d.etf ?? [], mf: d.mf ?? [], metals: d.metals ?? [], indices: d.indices ?? [] });
    } catch (e) {
      if (!silent) setMktErr((e as Error).message);
    } finally {
      if (!silent) setMktLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCrypto();
    loadMarkets();
  }, [loadCrypto, loadMarkets]);

  // Live auto-refresh: crypto every 20s, stocks/metals every 60s. Paused when the
  // tab is hidden to save free-tier calls. Silent (no loading spinner).
  useEffect(() => {
    const tick = (fn: (s: boolean) => void, ms: number) =>
      setInterval(() => {
        if (typeof document === "undefined" || document.visibilityState === "visible") fn(true);
      }, ms);
    const a = tick(loadCrypto, 20_000);
    const b = tick(loadMarkets, 60_000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [loadCrypto, loadMarkets]);

  const explain = useCallback(async (key: string, payload: Record<string, unknown>) => {
    setExplains((s) => (s[key] && s[key] !== "error" ? s : { ...s, [key]: "loading" }));
    try {
      const res = await fetch("/api/investments/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setExplains((s) => ({ ...s, [key]: { technical: d.technical, fundamental: d.fundamental, catalysts: d.catalysts, model: d.model } }));
    } catch {
      setExplains((s) => ({ ...s, [key]: "error" }));
    }
  }, []);

  const fetchNews = useCallback(async (key: string, name: string, kind: string) => {
    setNews((s) => (s[key] && s[key] !== "error" ? s : { ...s, [key]: "loading" }));
    try {
      const r = await fetch(`/api/investments/news?name=${encodeURIComponent(name)}&kind=${encodeURIComponent(kind)}`);
      const d = await r.json();
      setNews((s) => ({ ...s, [key]: Array.isArray(d.items) ? d.items : [] }));
    } catch {
      setNews((s) => ({ ...s, [key]: "error" }));
    }
  }, []);

  const toggle = useCallback(
    (key: string, payload: Record<string, unknown>) => {
      setOpen((cur) => {
        const next = cur === key ? null : key;
        if (next && (!explains[key] || explains[key] === "error")) explain(key, payload);
        if (next && (!news[key] || news[key] === "error")) fetchNews(key, String(payload.name ?? ""), String(payload.kind ?? "stock"));
        return next;
      });
    },
    [explain, explains, fetchNews, news],
  );

  const refresh = () => {
    loadCrypto();
    loadMarkets();
  };

  // ---- price alerts ----
  const priceMap = useMemo(() => {
    const m = new Map<string, number>();
    crypto.forEach((c) => m.set(c.id, c.price));
    [...mkt.growth, ...mkt.dividend, ...mkt.penny, ...mkt.us, ...mkt.etf, ...mkt.mf].forEach((s) => m.set(s.symbol, s.price));
    mkt.metals.forEach((x) => m.set(x.symbol, x.price));
    return m;
  }, [crypto, mkt]);

  const alertsRef = useRef<Alert[]>([]);
  alertsRef.current = alerts;

  useEffect(() => {
    if (!priceMap.size || !alertsRef.current.length) return;
    const { next, fired: hit } = evaluate(alertsRef.current, (k) => priceMap.get(k));
    if (hit.length) {
      setAlerts(next);
      saveAlerts(alertsKeyRef.current, next);
      setFired((prev) => [...hit, ...prev]);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        hit.forEach((a) => new Notification("NEXERA price alert", { body: `${a.name} is ${a.dir} ${a.target}` }));
      }
    }
  }, [priceMap]);

  const addAlert = useCallback((key: string, name: string, currency: string, target: number, dir: AlertDir) => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    setAlerts((prev) => {
      const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const next = [...prev, { id, key, name, currency, target, dir, createdAt: Date.now() }];
      saveAlerts(alertsKeyRef.current, next);
      return next;
    });
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAlerts(alertsKeyRef.current, next);
      return next;
    });
    setFired((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const activeAlertCount = alerts.filter((a) => !a.triggeredAt).length;

  const tableProps = { open, explains, news, onToggle: toggle, favs, onToggleFav: toggleFav, onAddAlert: addAlert };

  // ---- filters ----
  const q = query.trim().toLowerCase();
  const matchQ = (name: string, symbol?: string) =>
    !q || name.toLowerCase().includes(q) || (symbol ?? "").toLowerCase().includes(q);

  const sectorOptions = useMemo(() => {
    const set = new Set<string>();
    [...mkt.growth, ...mkt.dividend, ...mkt.penny].forEach((s) => set.add(s.sector));
    return ["all", ...[...set].sort()];
  }, [mkt]);

  const fav = (k: string) => !favsOnly || favs.has(k);
  const fStock = (rows: Stock[]) =>
    rows.filter((s) => matchQ(s.name, s.symbol) && (sector === "all" || s.sector === sector) && stockSig(s, sig) && fav(s.symbol));
  const fCrypto = crypto.filter((c) => matchQ(c.name, c.symbol) && singleSig(c.rating, sig) && fav(c.id));
  const fMetals = mkt.metals.filter((m) => matchQ(m.name, m.symbol) && singleSig(m.rating, sig) && fav(m.symbol));
  const gF = fStock(mkt.growth);
  const dF = fStock(mkt.dividend);
  const pF = fStock(mkt.penny);
  const uF = fStock(mkt.us);
  const eF = fStock(mkt.etf);
  const mfF = fStock(mkt.mf);
  const goldRows = fMetals.filter((m) => m.symbol !== "SI=F");
  const silverRows = fMetals.filter((m) => m.symbol === "SI=F");

  // Flattened movers (for Market Overview + Watchlist).
  const movers: Mover[] = useMemo(() => {
    const tag = (arr: Stock[], cls: string) => arr.map((s) => ({ key: s.symbol, name: s.name, symbol: s.symbol, cls, price: s.price, currency: s.currency, d24: s.d24, series: s.series }));
    return [
      ...tag(mkt.growth, "IND"), ...tag(mkt.dividend, "IND"), ...tag(mkt.penny, "IND"),
      ...tag(mkt.us, "US"), ...tag(mkt.etf, "ETF"), ...tag(mkt.mf, "MF"),
      ...crypto.map((c) => ({ key: c.id, name: c.name, symbol: c.symbol, cls: "CRYPTO", price: c.price, currency: "USD", d24: c.d24, series: c.series })),
      ...mkt.metals.map((m) => ({ key: m.symbol, name: m.name, symbol: m.symbol, cls: "METAL", price: m.price, currency: m.currency, d24: m.d24, series: m.series })),
    ];
  }, [mkt, crypto]);

  const portfolioAssets = useMemo(
    () => [
      ...[...mkt.growth, ...mkt.dividend, ...mkt.penny, ...mkt.us, ...mkt.etf, ...mkt.mf].map((s) => ({ key: s.symbol, name: s.name, currency: s.currency })),
      ...mkt.metals.map((m) => ({ key: m.symbol, name: m.name, currency: m.currency })),
      ...crypto.map((c) => ({ key: c.id, name: c.name, currency: "USD" })),
    ],
    [mkt, crypto],
  );

  const newsQueries = useMemo(
    () => [
      { name: "Nifty 50 Sensex Indian stock market", kind: "index" },
      { name: "S&P 500 Nasdaq US stock market", kind: "index" },
      { name: "Bitcoin Ethereum crypto", kind: "crypto" },
      { name: "Gold silver commodities price", kind: "metal" },
      ...movers.slice(0, 1).map((m) => ({ name: m.name, kind: "stock" })),
    ],
    [movers],
  );

  const ideaStocks = [...mkt.growth, ...mkt.dividend, ...mkt.penny, ...mkt.us];
  const watchRows = movers.filter((m) => favs.has(m.key));

  return (
    <div className="nex h-full min-h-0">
    <PageShell
      title="Investments"
      subtitle="Live signals, charts, hold horizons & trade plans — crypto, Indian stocks, metals, margin."
      action={
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400" title="Auto-refreshing: crypto ~20s, stocks ~60s">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
          <button
            onClick={() => setShowAlerts((v) => !v)}
            title="Price alerts"
            className={`relative rounded-lg border px-3 py-2 text-sm transition-colors ${showAlerts ? "border-[var(--nex-border-glow)] bg-navy/5 text-[var(--nex-accent-3)]" : "border-[var(--nex-border)] text-[var(--nex-text-muted)] hover:bg-black/5"}`}
          >
            🔔{activeAlertCount > 0 && <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">{activeAlertCount}</span>}
          </button>
          <button onClick={refresh} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
            ↻ Refresh
          </button>
        </div>
      }
    >
      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-2.5 text-[12.5px] text-amber-300">
        ⚠️ <b>Educational signals, not financial advice.</b> Signals use live prices + technicals (RSI, 50/200
        DMA, ATR). The “Why” adds AI context on fundamentals &amp; catalyst types — <b>verify news yourself</b>.
        Not SEBI-registered. Trade plans are illustrative — always use a stop-loss.
      </div>

      {fired.length > 0 && (
        <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/[0.08] px-4 py-2.5 text-[13px] text-emerald-300">
          🔔 <b>{fired.length} alert{fired.length > 1 ? "s" : ""} triggered:</b>{" "}
          {fired.map((a) => `${a.name} ${a.dir} ${money(a.target, a.currency)}`).join(" · ")}
          <button onClick={() => setFired([])} className="ml-2 underline hover:text-emerald-900">dismiss</button>
        </div>
      )}

      {showAlerts && (
        <div className="mb-4 rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-md)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--nex-text)]">🔔 Price alerts</p>
            <button onClick={() => setShowAlerts(false)} className="text-xs text-[var(--nex-text-faint)] hover:text-[var(--nex-text)]">close</button>
          </div>
          {alerts.length === 0 ? (
            <p className="text-xs text-[var(--nex-text-faint)]">No alerts yet. Open any asset (Why ▾) → “Set alert” at a price. They’re checked every time prices load.</p>
          ) : (
            <ul className="space-y-1.5">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span>
                    <b className="text-[var(--nex-text)]">{a.name}</b> {a.dir} {money(a.target, a.currency)}
                    {a.triggeredAt ? (
                      <span className="ml-1.5 rounded bg-emerald-500/15 px-1 text-[10px] font-semibold text-emerald-300">triggered</span>
                    ) : (
                      <span className="ml-1.5 text-[10px] text-[var(--nex-text-faint)]">active</span>
                    )}
                  </span>
                  <button onClick={() => removeAlert(a.id)} className="text-[var(--nex-text-faint)] hover:text-danger">remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* section nav */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              section === s.id ? "bg-brand text-white shadow-sm" : "text-[var(--nex-text-muted)] hover:bg-black/5 hover:text-[var(--nex-text)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "portfolio" && <Portfolio userKey={user} priceMap={priceMap} assets={portfolioAssets} />}
      {section === "news" && <NewsFeed queries={newsQueries} />}
      {section === "calendar" && <EconomicCalendar />}

      {section === "insights" && (
        <Section tag="AI-style shortlist · quality × trend × value" loading={mktLoading} error={mktErr} empty={!fStock(ideaStocks).length}>
          <BestIdeas stocks={fStock(ideaStocks)} favs={favs} onToggleFav={toggleFav} />
        </Section>
      )}

      {section === "watchlist" && (
        watchRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--nex-text-faint)]">No favorites yet. Star any asset (☆) in Market Overview to watch it here.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--nex-border)] bg-[var(--nex-glass-faint)]">
            <table className="w-full text-[13px]">
              <tbody>
                {watchRows.map((m) => (
                  <tr key={m.key} className="border-b border-[var(--nex-border)]/50 last:border-0">
                    <td className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider text-[var(--nex-text-faint)]">{m.cls}</td>
                    <td className="px-3 py-2.5 font-medium text-[var(--nex-text)]">{m.name}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[var(--nex-text)]">{money(m.price, m.currency)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${pc(m.d24)}`}>{fmtPct(m.d24)}</td>
                    <td className="px-3 py-2.5 text-right"><button onClick={() => toggleFav(m.key)} title="Remove from watchlist" className="text-amber-400 hover:text-danger">★</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {section === "alerts" && (
        <div className="rounded-2xl border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--nex-text)]">🔔 Price alerts</p>
          {alerts.length === 0 ? (
            <p className="text-sm text-[var(--nex-text-faint)]">No alerts yet. Open any asset (Why ▾) in Market Overview → “Set alert” at a target price. Alerts are checked every time prices refresh.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span><b className="text-[var(--nex-text)]">{a.name}</b> {a.dir} {money(a.target, a.currency)}{a.triggeredAt ? <span className="ml-1.5 rounded bg-emerald-500/15 px-1 text-[10px] font-semibold text-emerald-300">triggered</span> : <span className="ml-1.5 text-[10px] text-[var(--nex-text-faint)]">active</span>}</span>
                  <button onClick={() => removeAlert(a.id)} className="text-[var(--nex-text-faint)] hover:text-danger">remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {section === "overview" && (
      <>
      <div className="mb-5">
        <MarketOverview indices={mkt.indices} movers={movers} loading={mktLoading} />
      </div>

      {/* asset-class tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-brand text-white shadow-sm" : "text-[var(--nex-text-muted)] hover:bg-black/5 hover:text-[var(--nex-text)]"
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* search + filters */}
      {tab !== "margin" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--nex-text-faint)]">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${tab === "crypto" ? "coins" : tab === "gold" || tab === "silver" ? "metals" : tab === "etf" ? "ETFs" : tab === "mf" ? "funds" : "stocks"}…`}
              className="w-full rounded-lg border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[var(--nex-border-glow)]"
            />
          </div>
          {tab === "stocks" && (
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="rounded-lg border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-3 py-2 text-sm outline-none focus:border-[var(--nex-border-glow)]"
            >
              {sectorOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All sectors" : s}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded-lg border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] p-0.5 text-xs">
            {(["all", "buy", "sell"] as SigFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setSig(f)}
                className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
                  sig === f ? "bg-brand text-white" : "text-[var(--nex-text-muted)] hover:text-[var(--nex-text)]"
                }`}
              >
                {f === "all" ? "All" : f === "buy" ? "Buys" : "Sells"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFavsOnly((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              favsOnly ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-[var(--nex-border)] bg-[var(--nex-glass-faint)] text-[var(--nex-text-muted)] hover:text-[var(--nex-text)]"
            }`}
            title="Show only your favorites"
          >
            {favsOnly ? "★" : "☆"} Favorites{favs.size ? ` (${favs.size})` : ""}
          </button>
          {(query || sector !== "all" || sig !== "all" || favsOnly) && (
            <button
              onClick={() => {
                setQuery("");
                setSector("all");
                setSig("all");
                setFavsOnly(false);
              }}
              className="rounded-lg px-2.5 py-2 text-xs text-[var(--nex-text-faint)] hover:bg-black/5 hover:text-[var(--nex-text)]"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {tab === "ideas" && (
        <Section tag="Ranked · quality × trend × value" loading={mktLoading} error={mktErr} empty={!fStock([...mkt.growth, ...mkt.dividend, ...mkt.penny]).length}>
          <BestIdeas stocks={fStock([...mkt.growth, ...mkt.dividend, ...mkt.penny])} favs={favs} onToggleFav={toggleFav} />
        </Section>
      )}

      {tab === "crypto" && (
        <Section tag="Live · CoinGecko" loading={cryptoLoading} error={cryptoErr} empty={!fCrypto.length}>
          <SimpleTable
            rows={fCrypto.map((c) => ({
              key: c.id,
              name: c.name,
              sub: c.symbol,
              image: c.image,
              price: c.price,
              currency: "USD",
              d24: c.d24,
              d7: c.d7,
              rating: c.rating,
              hold: c.hold,
              series: c.series,
              reason: c.reason,
              kind: "crypto",
              mom: { "24h": c.d24, "7d": c.d7, "30d": c.d30 },
              weeklyMove: c.weeklyMove,
            }))}
            {...tableProps}
          />
        </Section>
      )}

      {tab === "stocks" && (
        <>
          <p className="mb-4 text-[13px] text-[var(--nex-text-muted)]">
            Each name shows a <b>short-term</b> (swing) and <b>long-term</b> (invest) rating, conviction, a hold
            horizon, and an ATR-based trade plan. Sorted by conviction.
          </p>
          <SubSection title={`Growth · ${gF.length}`} tag="Live · NSE" loading={mktLoading} error={mktErr} empty={!gF.length}>
            <StockTable rows={gF} kind="growth" {...tableProps} />
          </SubSection>
          <SubSection title={`Dividend / Income · ${dF.length}`} tag="Live · NSE" loading={mktLoading} error={mktErr} empty={!dF.length}>
            <StockTable rows={dF} kind="dividend" {...tableProps} />
          </SubSection>
          <SubSection title={`Penny — speculative · ${pF.length}`} tag="⚠ high risk" loading={mktLoading} error={mktErr} empty={!pF.length}>
            <StockTable rows={pF} kind="penny" {...tableProps} />
          </SubSection>
        </>
      )}

      {tab === "us" && (
        <Section tag="Live · Yahoo (US large-cap)" loading={mktLoading} error={mktErr} empty={!uF.length}>
          <StockTable rows={uF} kind="us" {...tableProps} />
        </Section>
      )}

      {tab === "etf" && (
        <Section tag="Live · Yahoo (ETF)" loading={mktLoading} error={mktErr} empty={!eF.length}>
          <StockTable rows={eF} kind="etf" {...tableProps} />
        </Section>
      )}

      {tab === "mf" && (
        <Section tag="Live · Yahoo (daily NAV)" loading={mktLoading} error={mktErr} empty={!mfF.length}>
          <StockTable rows={mfF} kind="mf" {...tableProps} />
        </Section>
      )}

      {(tab === "gold" || tab === "silver") && (
        <Section tag="Live · Yahoo (futures)" loading={mktLoading} error={mktErr} empty={!(tab === "gold" ? goldRows : silverRows).length}>
          <SimpleTable
            rows={(tab === "gold" ? goldRows : silverRows).map((m) => ({
              key: m.symbol,
              name: m.name,
              sub: "",
              price: m.price,
              currency: m.currency,
              d24: m.d24,
              d7: m.d7,
              rating: m.rating,
              hold: m.hold,
              series: m.series,
              reason: m.reason,
              kind: "metal",
              mom: { "24h": m.d24, "7d": m.d7, "30d": m.d30 },
              weeklyMove: m.weeklyMove,
            }))}
            {...tableProps}
          />
        </Section>
      )}

      {tab === "margin" && <MarginTab crypto={crypto} mkt={mkt} loading={cryptoLoading || mktLoading} />}
      </>
      )}
    </PageShell>
    </div>
  );
}

// ---- best ideas: ranked shortlist (quality × long-term × not-overbought × value) ----

const RANK: Record<Rating, number> = { "Strong Buy": 2, Buy: 1, Hold: 0, Sell: -1, "Strong Sell": -2 };

function ideaScore(s: Stock): number {
  const quality = s.quality ?? 50;
  const longS = RANK[s.long.rating];
  const rsiAdj = s.rsi == null ? 0 : s.rsi > 75 ? -10 : s.rsi < 35 ? 5 : s.rsi <= 65 ? 5 : 0;
  return quality * 0.5 + s.conviction * 0.35 + (longS + 2) * 5 + rsiAdj;
}

function ideaWhy(s: Stock): string {
  const bits: string[] = [];
  if (s.quality != null) bits.push(`quality ${s.quality}`);
  bits.push(`${s.long.rating} long-term`);
  if (s.fwdGrowth != null && s.fwdGrowth > 5) bits.push(`+${s.fwdGrowth}% est. EPS growth`);
  if (s.pe != null) bits.push(`P/E ${s.pe.toFixed(0)}`);
  if (s.divYield != null && s.divYield >= 1.5) bits.push(`${s.divYield.toFixed(1)}% yield`);
  if (s.rsi != null) bits.push(s.rsi > 70 ? `RSI ${s.rsi} (hot)` : `RSI ${s.rsi}`);
  return bits.join(" · ");
}

function BestIdeas({ stocks, favs, onToggleFav }: { stocks: Stock[]; favs: Set<string>; onToggleFav: (k: string) => void }) {
  const ideas = useMemo(
    () =>
      stocks
        .filter((s) => s.long.rating !== "Sell" && s.long.rating !== "Strong Sell")
        .map((s) => ({ s, score: ideaScore(s) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 12),
    [stocks],
  );

  if (!ideas.length) return <p className="text-sm text-[var(--nex-text-faint)]">No qualifying ideas in the current filter.</p>;

  return (
    <>
      <p className="mb-3 text-[13px] text-[var(--nex-text-muted)]">
        Top stocks blending <b>Quality</b> (growth + valuation), a positive <b>long-term</b> trend, and a healthy
        (not overbought) entry. A shortlist to research — not a buy order.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {ideas.map(({ s }, i) => (
          <div key={s.symbol} className="rounded-2xl border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] p-3.5">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-navy/10 text-[11px] font-bold text-[var(--nex-accent-3)]">{i + 1}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--nex-text)]">{s.name}</p>
                  <p className="truncate font-mono text-[10px] text-[var(--nex-text-faint)]">{s.sector}</p>
                </div>
              </div>
              <div className="flex flex-none items-center gap-2">
                <Star on={favs.has(s.symbol)} onClick={(e) => { e.stopPropagation(); onToggleFav(s.symbol); }} />
                <Badge rating={s.long.rating} />
              </div>
            </div>
            <div className="mb-2 flex items-center gap-3">
              <Spark series={s.series} w={72} h={24} />
              <span className="font-mono text-sm text-[var(--nex-text)]">{money(s.price, s.currency)}</span>
              <span className={`font-mono text-[12px] ${pc(s.d1y)}`}>{fmtPct(s.d1y)} 1y</span>
            </div>
            <div className="mb-2 flex gap-4 text-[11px]">
              <span className="text-[var(--nex-text-faint)]">Quality <b className="text-[var(--nex-text)]">{s.quality ?? "—"}</b></span>
              <span className="text-[var(--nex-text-faint)]">Momentum <b className="text-[var(--nex-text)]">{s.conviction}</b></span>
              <span className="text-[var(--nex-text-faint)]">Hold <b className="text-[var(--nex-text)]">{s.hold.split(" · ")[0]}</b></span>
            </div>
            <p className="text-[12px] leading-relaxed text-[var(--nex-text-muted)]">{ideaWhy(s)}</p>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- simple table (crypto / metals): single rating ----

type SimpleRow = {
  key: string;
  name: string;
  sub: string;
  image?: string;
  price: number;
  currency: string;
  d24: number | null;
  d7: number | null;
  rating: Rating;
  hold: string;
  series: number[];
  reason: string;
  kind: string;
  mom: Record<string, number | null>;
  weeklyMove: number;
};

function SimpleTable({
  rows,
  open,
  explains,
  news,
  onToggle,
  favs,
  onToggleFav,
  onAddAlert,
}: {
  rows: SimpleRow[];
  open: string | null;
  explains: Record<string, ExplainState>;
  news: Record<string, NewsState>;
  onToggle: (key: string, payload: Record<string, unknown>) => void;
  favs: Set<string>;
  onToggleFav: (k: string) => void;
  onAddAlert: (key: string, name: string, currency: string, target: number, dir: AlertDir) => void;
}) {
  const [sort, setSort] = useState<{ k: "price" | "d24" | "d7"; dir: "asc" | "desc" } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const v = (r: SimpleRow) => (r[sort.k] ?? -Infinity) as number;
    return [...rows].sort((a, b) => (sort.dir === "asc" ? v(a) - v(b) : v(b) - v(a)));
  }, [rows, sort]);
  const click = (k: "price" | "d24" | "d7") => setSort((p) => (p && p.k === k ? { k, dir: p.dir === "desc" ? "asc" : "desc" } : { k, dir: "desc" }));
  const ar = (k: string) => (sort?.k === k ? (sort.dir === "desc" ? " ▾" : " ▴") : "");

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--nex-border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--nex-glass-faint)] text-[var(--nex-text-faint)]">
            <Th center>★</Th>
            <Th>Asset</Th>
            <ThBtn right onClick={() => click("price")}>Price{ar("price")}</ThBtn>
            <ThBtn right onClick={() => click("d24")}>24h{ar("d24")}</ThBtn>
            <ThBtn right onClick={() => click("d7")}>7d{ar("d7")}</ThBtn>
            <Th center>Signal</Th>
            <Th center>30d chart</Th>
            <Th>Hold</Th>
            <Th>Why</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const payload = { name: r.name, symbol: r.sub || r.key, kind: r.kind, momentum: r.mom, ratings: { signal: r.rating } };
            return (
              <Group
                key={r.key}
                isOpen={open === r.key}
                colSpan={9}
                detail={explains[r.key]}
                news={news[r.key]}
                bigSeries={r.series}
                alertCurrency={r.currency}
                alertSuggest={[{ label: "Current", value: r.price, dir: "above" }]}
                onAddAlert={(t, d) => onAddAlert(r.key, r.name, r.currency, t, d)}
              >
                <tr className="cursor-pointer border-t border-[var(--nex-border)] hover:bg-[var(--nex-glass-faint)]" onClick={() => onToggle(r.key, payload)}>
                  <td className="px-2 py-2 text-center"><Star on={favs.has(r.key)} onClick={(e) => { e.stopPropagation(); onToggleFav(r.key); }} /></td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {r.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" width={18} height={18} className="rounded-full" />
                      )}
                      <span className="font-medium text-[var(--nex-text)]">{r.name}</span>
                      {r.sub && <span className="font-mono text-[10px] text-[var(--nex-text-faint)]">{r.sub}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div><LivePrice value={r.price} currency={r.currency} /></div>
                    <div className={`font-mono text-[10px] ${weeklyBias(r.rating).c}`} title="Expected 1-week move (volatility-based), arrow = signal bias">
                      {weeklyBias(r.rating).a} {moveStr(r.weeklyMove, r.currency)}/wk
                    </div>
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${pc(r.d24)}`}>{fmtPct(r.d24)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${pc(r.d7)}`}>{fmtPct(r.d7)}</td>
                  <td className="px-3 py-2 text-center"><Badge rating={r.rating} /></td>
                  <td className="px-3 py-2"><div className="flex justify-center"><Spark series={r.series} /></div></td>
                  <td className="px-3 py-2 text-[11.5px] text-[var(--nex-text-muted)]">{r.hold}</td>
                  <td className="px-3 py-2 text-[12px] text-[var(--nex-accent-3)]">{open === r.key ? "Hide ▴" : "Why ▾"}</td>
                </tr>
              </Group>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- stock table: short + long + conviction + plan ----

function StockTable({
  rows,
  kind,
  open,
  explains,
  news,
  onToggle,
  favs,
  onToggleFav,
  onAddAlert,
}: {
  rows: Stock[];
  kind: string;
  open: string | null;
  explains: Record<string, ExplainState>;
  news: Record<string, NewsState>;
  onToggle: (key: string, payload: Record<string, unknown>) => void;
  favs: Set<string>;
  onToggleFav: (k: string) => void;
  onAddAlert: (key: string, name: string, currency: string, target: number, dir: AlertDir) => void;
}) {
  type SortK = "price" | "d1y" | "conviction" | "quality" | "divYield";
  const [sort, setSort] = useState<{ k: SortK; dir: "asc" | "desc" }>({ k: "conviction", dir: "desc" });
  const sorted = useMemo(() => {
    const v = (r: Stock) => (r[sort.k] ?? -Infinity) as number;
    return [...rows].sort((a, b) => (sort.dir === "asc" ? v(a) - v(b) : v(b) - v(a)));
  }, [rows, sort]);
  const click = (k: SortK) => setSort((p) => (p.k === k ? { k, dir: p.dir === "desc" ? "asc" : "desc" } : { k, dir: "desc" }));
  const ar = (k: string) => (sort.k === k ? (sort.dir === "desc" ? " ▾" : " ▴") : "");

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--nex-border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[var(--nex-glass-faint)] text-[var(--nex-text-faint)]">
            <Th center>★</Th>
            <Th>Stock</Th>
            <ThBtn right onClick={() => click("price")}>Price{ar("price")}</ThBtn>
            <ThBtn right onClick={() => click("d1y")}>1y{ar("d1y")}</ThBtn>
            <ThBtn right onClick={() => click("divYield")}>Yield{ar("divYield")}</ThBtn>
            <Th center>Short</Th>
            <Th center>Long</Th>
            <ThBtn center onClick={() => click("conviction")}>Momentum{ar("conviction")}</ThBtn>
            <ThBtn center onClick={() => click("quality")}>Quality{ar("quality")}</ThBtn>
            <Th center>Chart</Th>
            <Th>Hold</Th>
            <Th>Why</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const payload = {
              name: r.name,
              symbol: r.symbol,
              kind,
              momentum: { "24h": r.d24, "7d": r.d7, "30d": r.d30, "3mo": r.d90, "1y": r.d1y },
              ratings: { short: r.short.rating, long: r.long.rating },
            };
            return (
              <Group
                key={r.symbol}
                isOpen={open === r.symbol}
                colSpan={12}
                detail={explains[r.symbol]}
                news={news[r.symbol]}
                horizons={{ short: r.short, long: r.long }}
                stock={r}
                bigSeries={r.series}
                alertCurrency={r.currency}
                alertSuggest={[
                  { label: "Target", value: r.plan.target, dir: "above" },
                  { label: "Entry", value: r.plan.entry, dir: "above" },
                  { label: "Stop", value: r.plan.stop, dir: "below" },
                ]}
                onAddAlert={(t, d) => onAddAlert(r.symbol, r.name, r.currency, t, d)}
              >
                <tr className="cursor-pointer border-t border-[var(--nex-border)] hover:bg-[var(--nex-glass-faint)]" onClick={() => onToggle(r.symbol, payload)}>
                  <td className="px-2 py-2 text-center"><Star on={favs.has(r.symbol)} onClick={(e) => { e.stopPropagation(); onToggleFav(r.symbol); }} /></td>
                  <td className="px-3 py-2">
                    <span className="font-medium text-[var(--nex-text)]">{r.name}</span>
                    <span className="ml-2 hidden font-mono text-[10px] text-[var(--nex-text-faint)] lg:inline">{r.sector}</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div><LivePrice value={r.price} currency={r.currency} /></div>
                    <div className={`font-mono text-[10px] ${weeklyBias(r.short.rating).c}`} title="Expected 1-week move (volatility-based), arrow = short-term bias">
                      {weeklyBias(r.short.rating).a} {moveStr(r.weeklyMove, r.currency)}/wk
                    </div>
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${pc(r.d1y)}`}>{fmtPct(r.d1y)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--nex-text-muted)]">{r.divYield == null ? "—" : `${r.divYield.toFixed(1)}%`}</td>
                  <td className="px-3 py-2 text-center"><Badge rating={r.short.rating} /></td>
                  <td className="px-3 py-2 text-center"><Badge rating={r.long.rating} /></td>
                  <td className="px-3 py-2"><ScoreBar value={r.conviction} /></td>
                  <td className="px-3 py-2"><ScoreBar value={r.quality} /></td>
                  <td className="px-3 py-2"><div className="flex justify-center"><Spark series={r.series} /></div></td>
                  <td className="px-3 py-2 text-[11.5px] text-[var(--nex-text-muted)]">{r.hold}</td>
                  <td className="px-3 py-2 text-[12px] text-[var(--nex-accent-3)]">{open === r.symbol ? "Hide ▴" : "Why ▾"}</td>
                </tr>
              </Group>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Group({
  children,
  isOpen,
  colSpan,
  detail,
  news,
  horizons,
  stock,
  bigSeries,
  alertCurrency,
  alertSuggest,
  onAddAlert,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  colSpan: number;
  detail: ExplainState | undefined;
  news?: NewsState;
  horizons?: { short: Horizon; long: Horizon };
  stock?: Stock;
  bigSeries?: number[];
  alertCurrency?: string;
  alertSuggest?: { label: string; value: number; dir: AlertDir }[];
  onAddAlert?: (target: number, dir: AlertDir) => void;
}) {
  return (
    <>
      {children}
      {isOpen && (
        <tr className="border-t border-[var(--nex-border)] bg-[var(--nex-glass-faint)]">
          <td colSpan={colSpan} className="px-4 py-3">
            {bigSeries && bigSeries.length > 2 && (
              <div className="mb-3 rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-md)] p-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--nex-text-faint)]">Price — last year</p>
                <Spark series={bigSeries} w={420} h={70} />
              </div>
            )}
            {horizons && (
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <p className="text-[12.5px] text-[var(--nex-text-muted)]"><b className="text-[var(--nex-text)]">Short-term:</b> {horizons.short.reason}</p>
                <p className="text-[12.5px] text-[var(--nex-text-muted)]"><b className="text-[var(--nex-text)]">Long-term:</b> {horizons.long.reason}</p>
              </div>
            )}
            {stock && (
              <div className="mb-3 grid gap-2.5 md:grid-cols-3">
                <div className="rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-md)] p-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--nex-text-faint)]">Technicals · hold {stock.hold}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
                    <Stat label="Trend" value={stock.trend} />
                    <Stat label="RSI(14)" value={stock.rsi == null ? "—" : `${stock.rsi}${stock.rsi >= 70 ? " · ob" : stock.rsi <= 30 ? " · os" : ""}`} />
                    <Stat label="50 DMA" value={stock.sma50 == null ? "—" : money(stock.sma50, stock.currency)} />
                    <Stat label="200 DMA" value={stock.sma200 == null ? "—" : money(stock.sma200, stock.currency)} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--nex-text-muted)]">
                    Expected ~1-week move <b className={weeklyBias(stock.short.rating).c}>±{moveStr(stock.weeklyMove, stock.currency)}</b>{" "}
                    ({money(stock.price - stock.weeklyMove, stock.currency)} – {money(stock.price + stock.weeklyMove, stock.currency)})
                    {stock.short.rating === "Hold" ? "" : `, leaning ${stock.short.rating.includes("Buy") ? "up" : "down"}`}.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300/70">
                    Fundamentals{stock.quality != null ? ` · quality ${stock.quality}/100` : ""}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
                    <Stat label="P/E" value={stock.pe == null ? "—" : stock.pe.toFixed(1)} />
                    <Stat label="Fwd P/E" value={stock.forwardPE == null ? "—" : stock.forwardPE.toFixed(1)} />
                    <Stat label="EPS growth" value={stock.fwdGrowth == null ? "—" : `${stock.fwdGrowth >= 0 ? "+" : ""}${stock.fwdGrowth}%`} accent={stock.fwdGrowth != null && stock.fwdGrowth < 0 ? "rose" : "emerald"} />
                    <Stat label="Div yield" value={stock.divYield == null ? "—" : `${stock.divYield.toFixed(2)}%`} />
                    <Stat label="P/B" value={stock.pb == null ? "—" : stock.pb.toFixed(1)} />
                    <Stat label="Mkt cap" value={mcapStr(stock.marketCap, stock.currency)} />
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--nex-border)] bg-navy/[0.03] p-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--nex-accent-3)]/70">Trade plan (long bias)</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
                    <Stat label="Entry" value={money(stock.plan.entry, stock.currency)} />
                    <Stat label="Stop-loss" value={money(stock.plan.stop, stock.currency)} accent="rose" />
                    <Stat label="Target" value={money(stock.plan.target, stock.currency)} accent="emerald" />
                    <Stat label="Risk : Reward" value={stock.plan.rr == null ? "—" : `1 : ${stock.plan.rr}`} />
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-[var(--nex-text-faint)]">ATR stop · resistance target · size to the stop.</p>
                </div>
              </div>
            )}
            {detail === "loading" || detail === undefined ? (
              <div className="flex items-center gap-2 text-[12.5px] text-[var(--nex-text-faint)]">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--nex-border-glow)] border-t-navy" />
                Analyzing technicals, fundamentals &amp; catalysts…
              </div>
            ) : detail === "error" ? (
              <p className="text-[12.5px] text-danger">Couldn’t generate the analysis — try again.</p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-3">
                <Why label="📈 Technical" text={detail.technical} />
                <Why label="🏛 Fundamental" text={detail.fundamental} />
                <Why label="🧭 Catalysts to watch" text={detail.catalysts} />
              </div>
            )}

            {/* real, recent headlines (Google News) */}
            <div className="mt-3 rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-md)] p-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--nex-text-faint)]">📰 Latest news</p>
              {news === "loading" || news === undefined ? (
                <p className="text-[12px] text-[var(--nex-text-faint)]">Loading headlines…</p>
              ) : news === "error" || news.length === 0 ? (
                <p className="text-[12px] text-[var(--nex-text-faint)]">No recent headlines found.</p>
              ) : (
                <ul className="space-y-1.5">
                  {news.map((n, i) => (
                    <li key={i} className="text-[12.5px] leading-snug">
                      <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-[var(--nex-accent-3)] hover:underline">
                        {n.title}
                      </a>
                      <span className="ml-1.5 text-[11px] text-[var(--nex-text-faint)]">{n.source}{n.time ? ` · ${ago(n.time)}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {onAddAlert && (
              <AlertForm currency={alertCurrency ?? "USD"} suggest={alertSuggest ?? []} onAdd={onAddAlert} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function AlertForm({
  currency,
  suggest,
  onAdd,
}: {
  currency: string;
  suggest: { label: string; value: number; dir: AlertDir }[];
  onAdd: (target: number, dir: AlertDir) => void;
}) {
  const [target, setTarget] = useState("");
  const [dir, setDir] = useState<AlertDir>("above");
  const [done, setDone] = useState(false);

  const set = () => {
    const n = parseFloat(target);
    if (!Number.isFinite(n) || n <= 0) return;
    onAdd(n, dir);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
    setTarget("");
  };

  return (
    <div className="mt-3 rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-md)] p-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--nex-text-faint)]">🔔 Set price alert</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={dir}
          onChange={(e) => setDir(e.target.value as AlertDir)}
          className="rounded-lg border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-2 py-1.5 text-[12.5px] outline-none focus:border-[var(--nex-border-glow)]"
        >
          <option value="above">rises above</option>
          <option value="below">falls below</option>
        </select>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && set()}
          inputMode="decimal"
          placeholder={`price (${currency === "INR" ? "₹" : "$"})`}
          className="w-32 rounded-lg border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-2.5 py-1.5 font-mono text-[12.5px] outline-none focus:border-[var(--nex-border-glow)]"
        />
        <button onClick={set} className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:scale-[1.02]">
          Set
        </button>
        {done && <span className="text-[12px] text-emerald-400">✓ alert set</span>}
        {suggest.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              setTarget(String(s.value));
              setDir(s.dir);
            }}
            className="rounded-full border border-[var(--nex-border)] px-2.5 py-1 text-[11px] text-[var(--nex-text-muted)] hover:border-[var(--nex-border-glow)] hover:text-[var(--nex-text)]"
          >
            {s.label} {money(s.value, currency)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Why({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-md)] p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--nex-text-faint)]">{label}</p>
      <p className="text-[12.5px] leading-relaxed text-[var(--nex-text-muted)]">{text || "—"}</p>
    </div>
  );
}

const Th = ({ children, right, center }: { children: React.ReactNode; right?: boolean; center?: boolean }) => (
  <th className={`px-3 py-2 font-semibold ${right ? "text-right" : center ? "text-center" : "text-left"}`}>{children}</th>
);

const ThBtn = ({ children, right, center, onClick }: { children: React.ReactNode; right?: boolean; center?: boolean; onClick: () => void }) => (
  <th className={`px-3 py-2 font-semibold ${right ? "text-right" : center ? "text-center" : "text-left"}`}>
    <button onClick={onClick} className="inline-flex items-center whitespace-nowrap hover:text-[var(--nex-text)]">{children}</button>
  </th>
);

function Star({ on, onClick }: { on: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title={on ? "Remove from favorites" : "Add to favorites"}
      className={`text-base leading-none transition-colors ${on ? "text-amber-500" : "text-[var(--nex-text-faint)] hover:text-amber-400"}`}
    >
      {on ? "★" : "☆"}
    </button>
  );
}

function ScoreBar({ value }: { value: number | null }) {
  if (value == null) return <div className="text-center text-[11px] text-[var(--nex-text-faint)]">—</div>;
  const color = value >= 70 ? "bg-emerald-500" : value >= 45 ? "bg-amber-500" : "bg-danger";
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-black/10">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-[11px] text-[var(--nex-text-muted)]">{value}</span>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "rose" | "emerald" }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[var(--nex-text-faint)]">{label}</span>
      <span className={`font-mono ${accent === "rose" ? "text-danger" : accent === "emerald" ? "text-emerald-400" : "text-[var(--nex-text)]"}`}>{value}</span>
    </div>
  );
}

function Section({
  tag,
  loading,
  error,
  empty,
  children,
}: {
  tag: string;
  loading: boolean;
  error: string | null;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="mb-6">
      <div className="mb-2 flex justify-end">
        <span className="rounded-full border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--nex-text-faint)]">{tag}</span>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-sm text-danger">✕ {error}</p>
      ) : empty ? (
        <p className="rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-4 py-3 text-sm text-[var(--nex-text-faint)]">No data right now — try Refresh.</p>
      ) : (
        children
      )}
    </Reveal>
  );
}

function SubSection({
  title,
  tag,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  tag: string;
  loading: boolean;
  error: string | null;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="mb-6">
      <div className="mb-3 flex items-center gap-2.5">
        <h3 className="text-base font-semibold text-[var(--nex-text)]">{title}</h3>
        <span className="rounded-full border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--nex-text-faint)]">{tag}</span>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-sm text-danger">✕ {error}</p>
      ) : empty ? (
        <p className="rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-4 py-3 text-sm text-[var(--nex-text-faint)]">No data right now — try Refresh.</p>
      ) : (
        children
      )}
    </Reveal>
  );
}

const Loading = () => (
  <div className="flex items-center gap-2 rounded-xl border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] px-4 py-6 text-sm text-[var(--nex-text-faint)]">
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--nex-border-glow)] border-t-navy" />
    Loading live prices…
  </div>
);

// ---- margin tab: mixed basket with timing ----

type MarginPick = {
  key: string;
  name: string;
  type: "Crypto" | "Stock" | "Metal";
  price: number;
  currency: string;
  rating: Rating;
  d7: number | null;
  d24: number | null;
  mom: number;
  series: number[];
  timing: string;
};

const ORDER: Record<Rating, number> = { "Strong Buy": 2, Buy: 1, Hold: 0, Sell: -1, "Strong Sell": -2 };
const TYPE_STYLE: Record<MarginPick["type"], string> = {
  Crypto: "bg-violet/15 text-violet",
  Stock: "bg-navy/12 text-[var(--nex-accent-3)]",
  Metal: "bg-amber-500/15 text-amber-400",
};

function timingOf(d24: number | null, d7: number | null): string {
  const a = Math.abs(d24 ?? 0);
  const b = Math.abs(d7 ?? 0);
  if (a >= 5 || b >= 15) return "Intraday → few days";
  if (b >= 6) return "Swing · 1–2 weeks";
  return "Positional · 2–4 weeks";
}

function MarginTab({
  crypto,
  mkt,
  loading,
}: {
  crypto: Crypto[];
  mkt: { growth: Stock[]; dividend: Stock[]; penny: Stock[]; metals: Metal[] };
  loading: boolean;
}) {
  const { longs, shorts, trending } = useMemo(() => {
    const items: MarginPick[] = [];
    crypto.forEach((c) =>
      items.push({ key: c.id, name: c.name, type: "Crypto", price: c.price, currency: "USD", rating: c.rating, d7: c.d7, d24: c.d24, mom: c.d7 ?? 0, series: c.series, timing: timingOf(c.d24, c.d7) }),
    );
    [...mkt.growth, ...mkt.dividend, ...mkt.penny].forEach((s) =>
      items.push({ key: s.symbol, name: s.name, type: "Stock", price: s.price, currency: s.currency, rating: s.short.rating, d7: s.d7, d24: s.d24, mom: s.d7 ?? 0, series: s.series, timing: timingOf(s.d24, s.d7) }),
    );
    mkt.metals.forEach((m) =>
      items.push({ key: m.symbol, name: m.name, type: "Metal", price: m.price, currency: m.currency, rating: m.rating, d7: m.d7, d24: m.d24, mom: m.d7 ?? 0, series: m.series, timing: timingOf(m.d24, m.d7) }),
    );
    // Trending = biggest movers right now (heat = recent absolute momentum),
    // either direction — what's actually in play for a leveraged trade.
    const heat = (i: MarginPick) => Math.abs(i.d24 ?? 0) * 0.45 + Math.abs(i.d7 ?? 0) * 0.55;
    const trending = [...items].sort((a, b) => heat(b) - heat(a)).slice(0, 10);
    return {
      longs: items.filter((i) => ORDER[i.rating] >= 1).sort((a, b) => b.mom - a.mom).slice(0, 6),
      shorts: items.filter((i) => ORDER[i.rating] <= -1).sort((a, b) => a.mom - b.mom).slice(0, 6),
      trending,
    };
  }, [crypto, mkt]);

  return (
    <Reveal className="mb-6">
      <div className="mb-3 rounded-xl border border-danger/25 bg-danger/[0.05] px-4 py-2 text-[12px] text-rose-300">
        ⚡ <b>Leverage amplifies BOTH gains and losses</b> — you can lose more than your capital. These are
        short-term momentum picks mixing crypto, stocks &amp; gold, with a suggested timing window. Not advice.
        Use strict stop-losses and small position sizes.
      </div>
      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-5">
          {/* trending — biggest movers in play right now */}
          <div>
            <p className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-[var(--nex-text)]">
              🔥 Trending trades <span className="text-[11px] font-normal text-[var(--nex-text-faint)]">biggest movers now · either direction</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {trending.map((p) => {
                const up = (p.d7 ?? 0) >= 0;
                return (
                  <div key={`t-${p.type}-${p.key}`} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--nex-border)] bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-md)] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`text-sm ${up ? "text-emerald-400" : "text-danger"}`}>{up ? "▲" : "▼"}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${TYPE_STYLE[p.type]}`}>{p.type}</span>
                      <span className="truncate text-[13px] font-medium text-[var(--nex-text)]">{p.name}</span>
                      <span className="hidden text-[10px] text-[var(--nex-text-faint)] sm:inline">⏱ {p.timing}</span>
                    </div>
                    <div className="flex flex-none items-center gap-2.5">
                      <Spark series={p.series} w={48} h={18} />
                      <span className="font-mono text-[12px] text-[var(--nex-text-muted)]">{money(p.price, p.currency)}</span>
                      <span className={`font-mono text-[12px] font-semibold ${pc(p.d7)}`}>{fmtPct(p.d7)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* directional baskets */}
          <div className="grid gap-4 lg:grid-cols-2">
            <MarginCol title="Go long / buy" picks={longs} accent="emerald" />
            <MarginCol title="Go short / sell" picks={shorts} accent="rose" />
          </div>
        </div>
      )}
    </Reveal>
  );
}

function MarginCol({ title, picks, accent }: { title: string; picks: MarginPick[]; accent: "emerald" | "rose" }) {
  return (
    <div className="rounded-2xl border border-[var(--nex-border)] bg-[var(--nex-glass-faint)] p-4">
      <p className={`mb-2.5 text-sm font-semibold ${accent === "emerald" ? "text-emerald-400" : "text-danger"}`}>{title}</p>
      {picks.length === 0 ? (
        <p className="text-[12.5px] text-[var(--nex-text-faint)]">No qualifying names right now.</p>
      ) : (
        <div className="space-y-2">
          {picks.map((p) => (
            <div key={`${p.type}-${p.key}`} className="rounded-lg border border-[var(--nex-border)] bg-[var(--nex-glass)] backdrop-blur-[var(--nex-blur-md)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${TYPE_STYLE[p.type]}`}>{p.type}</span>
                  <span className="truncate text-[13px] font-medium text-[var(--nex-text)]">{p.name}</span>
                </div>
                <div className="flex flex-none items-center gap-2.5">
                  <Spark series={p.series} w={56} h={20} />
                  <span className="font-mono text-[12px] text-[var(--nex-text-muted)]">{money(p.price, p.currency)}</span>
                  <span className={`font-mono text-[12px] ${pc(p.d7)}`}>{fmtPct(p.d7)}</span>
                  <Badge rating={p.rating} />
                </div>
              </div>
              <p className="mt-1 text-[10.5px] text-[var(--nex-text-faint)]">⏱ {p.timing}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
