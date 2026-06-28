"use client";

/* ============================================================================
   Portfolio Intelligence — AI portfolio analysis workspace.
   ----------------------------------------------------------------------------
   Not a broker, not trading. Import holdings (manual / CSV / broker / terminal),
   then analyze: value, P&L, allocations, risk, diversification, drawdown,
   over/undervaluation, missed opportunities, suggestions — with the WHY.
   Reuses Market Intelligence Tool + Opportunity Engine + AI Router + Broker.
   ========================================================================== */

import { useRef, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { getBrokerAdapter } from "@/lib/brokers";
import type { Holding, PortfolioAnalysis, Allocation, HoldingRow, AISuggestion } from "@/lib/investments/portfolio/types";

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [t, setT] = useState(""); const [q, setQ] = useState(""); const [ac, setAc] = useState("");
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addManual = () => {
    const tk = t.trim().toUpperCase(); const qty = Number(q);
    if (!tk || !(qty > 0)) return;
    setHoldings((p) => [...p.filter((h) => h.ticker !== tk), { ticker: tk, quantity: qty, avgCost: ac ? Number(ac) : undefined }]);
    setT(""); setQ(""); setAc("");
  };

  const importCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const rows: Holding[] = [];
      for (const line of text.split(/\r?\n/)) {
        const [tk, qty, avg] = line.split(",").map((s) => s.trim());
        if (!tk || tk.toLowerCase() === "ticker" || !(Number(qty) > 0)) continue;
        rows.push({ ticker: tk.toUpperCase(), quantity: Number(qty), avgCost: avg ? Number(avg) : undefined });
      }
      if (rows.length) setHoldings(rows);
    };
    reader.readAsText(file);
  };

  const importBroker = async () => {
    const adapter = getBrokerAdapter("paper");
    if (!adapter) return;
    const c = await adapter.connect();
    if (!c.ok) return;
    const snap = await adapter.getSnapshot(c.connection);
    setHoldings(snap.positions.map((p) => ({ ticker: p.symbol, quantity: p.quantity, avgCost: p.avgPrice })));
  };

  const importTerminal = () => {
    try {
      const raw = JSON.parse(localStorage.getItem("nexera.terminal.portfolio") || "[]") as { ticker: string; qty: number }[];
      setHoldings(raw.map((h) => ({ ticker: h.ticker, quantity: h.qty })));
    } catch { /* */ }
  };

  const analyze = async () => {
    if (!holdings.length) return;
    setBusy(true); setError(null);
    try {
      let watchlist: string[] = [];
      try { watchlist = JSON.parse(localStorage.getItem("nexera.terminal.watchlist") || "[]"); } catch { /* */ }
      const r = await fetch("/api/investments/portfolio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings, watchlist }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      setAnalysis(r);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <PageShell
      title="Portfolio Intelligence"
      subtitle="AI portfolio analysis — value, risk, allocation and the why. Not a broker, not advice."
      action={<Link href="/dashboard/investments/overview" className="text-sm font-medium text-brand hover:underline">← Hub</Link>}
    >
      {/* import */}
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-faint">Import Holdings</p>
        <div className="flex flex-wrap gap-2">
          <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Ticker" className="w-24 rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="number" placeholder="Qty" className="w-20 rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand/40" />
          <input value={ac} onChange={(e) => setAc(e.target.value)} type="number" placeholder="Avg cost" className="w-24 rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand/40" />
          <button type="button" onClick={addManual} className="rounded-md bg-brand px-3 py-1.5 text-[13px] font-semibold text-white">Add</button>
          <span className="mx-1 w-px bg-line" />
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-md border border-line px-3 py-1.5 text-[13px] text-muted hover:text-ink">CSV Upload</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
          <button type="button" onClick={importBroker} className="rounded-md border border-line px-3 py-1.5 text-[13px] text-muted hover:text-ink">Import from Broker</button>
          <button type="button" onClick={importTerminal} className="rounded-md border border-line px-3 py-1.5 text-[13px] text-muted hover:text-ink">From Terminal</button>
        </div>
        <p className="mt-1 text-[10px] text-faint">CSV format: ticker,quantity,avgCost (one per line)</p>

        {holdings.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1.5">
              {holdings.map((h) => (
                <span key={h.ticker} className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-ink">
                  {h.ticker} ×{h.quantity}
                  <button type="button" onClick={() => setHoldings((p) => p.filter((x) => x.ticker !== h.ticker))} className="text-faint hover:text-red-600">×</button>
                </span>
              ))}
            </div>
            <button type="button" onClick={analyze} disabled={busy} className="mt-3 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50">
              {busy ? "Analyzing…" : "Analyze Portfolio"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {analysis && <Analysis a={analysis} />}
    </PageShell>
  );
}

const card = "rounded-2xl border border-line bg-surface-2 p-4";
const head = "mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted";

function Analysis({ a }: { a: PortfolioAnalysis }) {
  return (
    <div className="mt-4 space-y-4">
      {/* value + P&L */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Portfolio Value" value={`$${a.portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <Stat label="Today P&L" value={`${a.todayPnl >= 0 ? "+" : ""}$${a.todayPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${a.todayPnlPct}%)`} color={a.todayPnl >= 0 ? "#10b981" : "#ef4444"} />
        <Stat label="Total P&L" value={a.totalPnl == null ? "—" : `${a.totalPnl >= 0 ? "+" : ""}$${a.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color={a.totalPnl == null ? undefined : a.totalPnl >= 0 ? "#10b981" : "#ef4444"} />
        <Stat label="Risk Score" value={`${a.riskScore}/100`} color={a.riskScore >= 66 ? "#ef4444" : a.riskScore >= 40 ? "#f59e0b" : "#10b981"} />
        <Stat label="Diversification" value={`${a.diversificationScore}/100`} />
      </div>

      {/* explanation */}
      <div className={card}>
        <p className={head}>AI — Why ({a.explanationMode})</p>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{a.explanation}</p>
        {a.mockData && <p className="mt-2 text-[11px] text-amber-700">⚠ Some holdings used mock data (no live provider).</p>}
      </div>

      {/* allocations */}
      <div className="grid gap-4 sm:grid-cols-3">
        <AllocCard title="Sector Allocation" items={a.sectorAllocation} />
        <AllocCard title="Country Allocation" items={a.countryAllocation} />
        <AllocCard title="Asset Allocation" items={a.assetAllocation} />
      </div>

      {/* risk metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Volatility" value={`${a.volatilityPct}%`} />
        <Stat label="Max Drawdown" value={`${a.maxDrawdownPct}%`} color="#ef4444" />
        <Stat label="Concentration" value={`${a.concentrationRisk.topTicker} ${a.concentrationRisk.topWeightPct}%`} color={a.concentrationRisk.flagged ? "#ef4444" : undefined} />
        <Stat label="Est. Dividend Income" value={a.estimatedDividendIncome ? `$${a.estimatedDividendIncome}` : "n/a"} />
      </div>

      {/* holdings table */}
      <div className={card}>
        <p className={head}>Holdings</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="text-faint">
              <th className="text-left font-medium">Ticker</th><th className="text-left font-medium">Sector</th>
              <th className="text-right font-medium">Weight</th><th className="text-right font-medium">Price</th>
              <th className="text-right font-medium">Day</th><th className="text-right font-medium">Value</th><th className="text-right font-medium">Zone</th>
            </tr></thead>
            <tbody>
              {a.holdings.map((h) => <HoldingRowView key={h.ticker} h={h} />)}
            </tbody>
          </table>
        </div>
      </div>

      {/* valuation + missed + correlation */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={card}>
          <p className={head}>Valuation</p>
          <p className="text-[13px] text-ink"><span className="text-emerald-600">Undervalued:</span> {a.undervalued.join(", ") || "none"}</p>
          <p className="text-[13px] text-ink"><span className="text-red-600">Overvalued:</span> {a.overvalued.join(", ") || "none"}</p>
        </div>
        <div className={card}>
          <p className={head}>Watchlist Correlation</p>
          <p className="text-[13px] text-ink">{a.watchlistCorrelation.note}</p>
          {a.watchlistCorrelation.sharedSectors.length > 0 && <p className="mt-1 text-[11px] text-muted">Shared: {a.watchlistCorrelation.sharedSectors.join(", ")}</p>}
        </div>
      </div>

      {/* missed opportunities */}
      <div className={card}>
        <p className={head}>Missed Opportunities</p>
        {a.missedOpportunities.length === 0 ? <p className="text-[13px] text-muted">None surfaced.</p> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {a.missedOpportunities.map((m) => (
              <Link key={m.ticker} href={`/dashboard/investments/research/${encodeURIComponent(m.ticker)}`} className="rounded-xl border border-line bg-surface p-2.5 hover:border-brand/40">
                <p className="text-[13px]"><span className="font-semibold text-ink">{m.ticker}</span> <span className="text-faint">{m.company}</span> <span className="ml-1 font-mono text-brand">{m.conviction}</span></p>
                <p className="text-[11px] text-muted">{m.reason}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* suggestions */}
      <div className={card}>
        <p className={head}>AI Suggestions</p>
        <ul className="space-y-2">
          {a.suggestions.map((s, i) => <SuggestionView key={i} s={s} />)}
        </ul>
      </div>
    </div>
  );
}

function HoldingRowView({ h }: { h: HoldingRow }) {
  const zc = h.valuationZone === "Undervalued" ? "#10b981" : h.valuationZone === "Rich" ? "#ef4444" : h.valuationZone === "Fair Value" ? "#f59e0b" : "#94a3b8";
  return (
    <tr className="border-t border-line">
      <td className="py-1"><Link href={`/dashboard/investments/research/${encodeURIComponent(h.ticker)}`} className="font-semibold text-ink hover:text-brand">{h.ticker}</Link></td>
      <td className="py-1 text-muted">{h.sector}</td>
      <td className="py-1 text-right text-ink">{h.weightPct}%</td>
      <td className="py-1 text-right text-muted">{h.currency === "INR" ? "₹" : "$"}{h.price}</td>
      <td className={`py-1 text-right ${h.changePct >= 0 ? "text-emerald-600" : "text-red-600"}`}>{h.changePct >= 0 ? "+" : ""}{h.changePct.toFixed(2)}%</td>
      <td className="py-1 text-right text-ink">${h.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
      <td className="py-1 text-right"><span style={{ color: zc }}>{h.valuationZone}</span></td>
    </tr>
  );
}

function SuggestionView({ s }: { s: AISuggestion }) {
  const color = s.severity === "high" ? "#ef4444" : s.severity === "warn" ? "#f59e0b" : "#10b981";
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full" style={{ background: color }} />
      <div>
        <p className="text-[13px] font-medium text-ink">{s.title}</p>
        <p className="text-[12px] text-muted"><span className="text-faint">Why:</span> {s.why}</p>
      </div>
    </li>
  );
}

function AllocCard({ title, items }: { title: string; items: Allocation[] }) {
  return (
    <section className={card}>
      <p className={head}>{title}</p>
      {items.length === 0 ? <p className="text-[12px] text-muted">—</p> : (
        <ul className="space-y-1.5">
          {items.map((a) => (
            <li key={a.label} className="flex items-center gap-2 text-[12px]">
              <span className="w-24 flex-none truncate text-ink">{a.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-brand" style={{ width: `${a.pct}%` }} /></span>
              <span className="w-10 text-right font-mono text-faint">{a.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-base font-semibold" style={{ color: color ?? "inherit" }}>{value}</p>
    </div>
  );
}
