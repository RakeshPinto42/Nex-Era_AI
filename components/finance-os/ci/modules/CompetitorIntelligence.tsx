"use client";

// Competitor Intelligence — a live research agent. Discover a company's competitors
// (e.g. Sonny's Enterprises, US/Europe), then research each: products + pricing,
// cited from the web, never invented. Every refresh is tracked so price/SKU changes
// are flagged. Search runs on OpenRouter's web plugin by default (auto-rotates free
// models); a Tavily key can be added below to override.

import { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, ExternalLink, Trash2, ArrowUp, ArrowDown, Sparkles, Building2, Settings, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCi } from "../context";
import { researchCompetitor, discoverCompetitors, getSearchKeyStatus, setTavilyKey, ResearchError, type DiscoveredCompetitor, type SearchKeyStatus } from "@/lib/finance-os/ci/agent/client";
import { listRecords, saveSnapshot, getRecord, deleteRecord, diffLatest } from "@/lib/finance-os/ci/agent/store";
import type { CompetitorRecord, ProductChange } from "@/lib/finance-os/ci/agent/types";
import type { Recommendation } from "@/lib/finance-os/ci/types";
import { CI_REGIONS, CI_REGION_ALL } from "@/lib/finance-os/ci/types";
import { HOME, HOME_RESEARCH_QUERY, COMPETITORS, INDUSTRY } from "@/lib/finance-os/ci/sonnys";
import { Card } from "./ui";
const TARGETS = [HOME, ...COMPETITORS];
const fmtPrice = (p: number | null, ccy: string | null) =>
  p == null ? "—" : `${ccy && ccy !== "USD" ? ccy + " " : "$"}${p.toLocaleString()}`;

export function CompetitorIntelligence() {
  const { region: scopeRegion, setRegion, setModuleRecs } = useCi();
  // The agent needs a concrete market; "All Regions" defaults to United States.
  const effectiveRegion = scopeRegion === CI_REGION_ALL ? CI_REGIONS[0] : scopeRegion;
  const [records, setRecords] = useState<CompetitorRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null); // competitor being researched
  const [err, setErr] = useState<{ code: string; detail?: string } | null>(null);

  // discovery
  const [company, setCompany] = useState("");
  const [discovered, setDiscovered] = useState<DiscoveredCompetitor[]>([]);
  const [discovering, setDiscovering] = useState(false);

  // search backend / key
  const [status, setStatus] = useState<SearchKeyStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  const reload = () => {
    const recs = listRecords();
    setRecords(recs);
    return recs;
  };
  useEffect(() => {
    const recs = reload();
    if (recs.length) setSelected(recs[0].competitor);
    getSearchKeyStatus().then(setStatus);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const research = async (name: string) => {
    const target = name.trim();
    if (!target || loading) return;
    setLoading(target);
    setErr(null);
    try {
      // Home company resolves better with its full public name; competitors use their own name.
      const query = target === HOME ? HOME_RESEARCH_QUERY : target;
      const res = await researchCompetitor({ competitor: query, keywords: INDUSTRY, region: effectiveRegion });
      saveSnapshot(target, { researchedAt: res.researchedAt, model: res.model, products: res.products, sources: res.sources, estimated: res.estimated });
      reload();
      setSelected(target);
    } catch (e) {
      const re = e as ResearchError;
      setErr({ code: re.code ?? "error", detail: re.detail });
    } finally {
      setLoading(null);
    }
  };

  const researchAll = async () => {
    for (const c of discovered.slice(0, 6)) {
      // eslint-disable-next-line no-await-in-loop
      await research(c.name);
      if (err) break;
    }
  };

  const researchTargets = async () => {
    for (const t of TARGETS) {
      // eslint-disable-next-line no-await-in-loop
      await research(t);
      if (err) break;
    }
  };

  const trackedMap = useMemo(() => new Map(records.map((r) => [r.competitor.toLowerCase(), r])), [records]);

  const discover = async () => {
    const c = company.trim();
    if (!c || discovering) return;
    setDiscovering(true);
    setErr(null);
    setDiscovered([]);
    try {
      const res = await discoverCompetitors({ company: c, region: effectiveRegion, keywords: INDUSTRY });
      setDiscovered(res.competitors);
    } catch (e) {
      const re = e as ResearchError;
      setErr({ code: re.code ?? "error", detail: re.detail });
    } finally {
      setDiscovering(false);
    }
  };

  const saveKey = async () => {
    if (!keyInput.trim()) return;
    setSavingKey(true);
    try {
      const st = await setTavilyKey(keyInput.trim());
      setStatus(st);
      setKeyInput("");
      setErr(null);
    } catch (e) {
      const re = e as ResearchError;
      // Most common cause: not logged in as admin (endpoint is admin-gated → 401 "Unauthorized").
      setErr({ code: /unauthor|forbidden/i.test(re.code) ? "key_admin_only" : "key_save_failed", detail: re.detail });
    } finally {
      setSavingKey(false);
    }
  };

  const rec = selected ? getRecord(selected) : null;
  const changes = useMemo(() => (rec ? diffLatest(rec) : []), [rec]);
  const changeByKey = useMemo(() => new Map(changes.map((c) => [c.key, c])), [changes]);
  const latest = rec?.snapshots[0];
  const positioning = useMemo(() => buildPositioning(records), [records]);

  useEffect(() => {
    setModuleRecs("competitor-intelligence", buildRecs(changes, selected, positioning));
  }, [changes, selected, positioning, setModuleRecs]);

  const backendLabel = status?.hasKey ? "Tavily" : "OpenRouter web";

  return (
    <div className="space-y-5">
      {/* targets: Sonny's + the fixed competitor set */}
      <div className="rounded-2xl border border-fos-border bg-fos-surface shadow-[var(--fos-shadow)] p-4">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-blue-300" />
          <p className="text-sm font-semibold text-fos-text">Sonny&apos;s vs Competitors</p>
          <button onClick={researchTargets} disabled={!!loading} className="ml-auto flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
            <Sparkles size={12} /> Research all
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TARGETS.map((t) => {
            const tracked = trackedMap.get(t.toLowerCase());
            const n = tracked?.snapshots[0]?.products.length ?? 0;
            const isHome = t === HOME;
            return (
              <div key={t} className={cn("flex items-center gap-2 rounded-lg border p-2.5", isHome ? "border-blue-500/50 bg-blue-500/5" : "border-fos-border bg-fos-bg")}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fos-text">{t} {isHome && <span className="font-mono text-[9px] uppercase text-blue-300">us</span>}</p>
                  <p className="font-mono text-[10px] text-fos-muted">{tracked ? `${n} products tracked` : "not researched"}</p>
                </div>
                <button onClick={() => { setSelected(t); research(t); }} disabled={!!loading} className="flex-none rounded-lg border border-fos-border px-2.5 py-1 text-[11px] text-fos-text hover:bg-fos-surface2 disabled:opacity-50">
                  {loading === t ? "…" : tracked ? "Refresh" : "Research"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-2 font-mono text-[10px] text-fos-faint">Research builds each catalog (cited, tracked). The Positioning, SKU Comparison &amp; Executive Action engines read these.</p>
      </div>

      {/* discovery (find more competitors) */}
      <div className="rounded-2xl border border-fos-border bg-fos-surface shadow-[var(--fos-shadow)] p-4">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-blue-300" />
          <p className="text-sm font-semibold text-fos-text">Discover competitors</p>
          <button onClick={() => setSettingsOpen((v) => !v)} className="ml-auto flex items-center gap-1 text-[11px] text-fos-muted hover:text-fos-text">
            <Globe size={12} /> {backendLabel}
            <Settings size={12} />
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && discover()}
            placeholder="Find more competitors — company or market"
            className="flex-1 rounded-lg border border-fos-border bg-fos-bg px-3 py-2 text-sm text-fos-text outline-none placeholder:text-fos-faint"
          />
          <select value={scopeRegion} onChange={(e) => setRegion(e.target.value)} className="rounded-lg border border-fos-border bg-fos-bg px-3 py-2 text-sm text-fos-text outline-none">
            {[CI_REGION_ALL, ...CI_REGIONS].map((r) => <option key={r}>{r}</option>)}
          </select>
          <button onClick={discover} disabled={discovering || !company.trim()} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {discovering ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
            {discovering ? "Finding…" : "Find competitors"}
          </button>
        </div>

        {settingsOpen && (
          <div className="mt-3 rounded-lg border border-fos-border bg-fos-bg p-3">
            <p className="text-[11px] text-fos-muted">
              Search backend: <span className="text-fos-text">{backendLabel}</span>
              {status?.hasKey && <span className="text-fos-faint"> · key {status.mask} ({status.source})</span>}
            </p>
            <p className="mt-1 text-[11px] text-fos-faint">Default uses your OpenRouter key (web plugin, auto-rotates free models). Optionally add a Tavily key for dedicated search:</p>
            <div className="mt-2 flex gap-2">
              <input value={keyInput} onChange={(e) => setKeyInput(e.target.value)} type="password" placeholder="tvly-… (admin only)" className="flex-1 rounded-lg border border-fos-border bg-fos-surface px-3 py-1.5 text-sm text-fos-text outline-none placeholder:text-fos-faint" />
              <button onClick={saveKey} disabled={savingKey || !keyInput.trim()} className="rounded-lg border border-fos-border px-3 py-1.5 text-xs text-fos-text hover:bg-fos-surface2 disabled:opacity-50">Save</button>
            </div>
          </div>
        )}

        {/* discovered list */}
        {discovered.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">{discovered.length} competitors found</p>
              <button onClick={researchAll} disabled={!!loading} className="flex items-center gap-1 rounded-lg bg-blue-600/20 px-2.5 py-1 text-[11px] font-medium text-blue-200 hover:bg-blue-600/30 disabled:opacity-50">
                <Sparkles size={12} /> Research all
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {discovered.map((c) => (
                <div key={c.name} className="flex items-center gap-2 rounded-lg border border-fos-border bg-fos-bg p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fos-text">{c.name} {c.region && <span className="font-mono text-[10px] text-fos-faint">{c.region}</span>}</p>
                    <p className="truncate text-[11px] text-fos-muted">{c.descriptor}</p>
                  </div>
                  <button onClick={() => research(c.name)} disabled={!!loading} className="flex-none rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50">
                    {loading === c.name ? "…" : "Research"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-2 font-mono text-[10px] text-fos-faint">Figures are web-sourced and cited — never invented. Tracked locally on this device.</p>
      </div>

      {err && <ErrorPanel code={err.code} detail={err.detail} />}

      {/* tracked competitors */}
      {records.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">Tracking:</span>
          {records.map((r) => (
            <button key={r.competitor} onClick={() => setSelected(r.competitor)} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors", selected === r.competitor ? "border-blue-500 bg-blue-500/15 text-blue-200" : "border-fos-border text-fos-muted hover:text-fos-text")}>
              {r.competitor}
              <span className="font-mono text-[10px] opacity-60">{r.snapshots.length}</span>
            </button>
          ))}
        </div>
      )}

      {positioning.length >= 2 && (
        <Card title="Pricing Position · who positions most premium (profit-maximization proxy)">
          <div className="space-y-2.5">
            {positioning.map((p, i) => (
              <div key={p.competitor} className="flex items-center gap-3 text-sm">
                <span className="w-5 font-mono text-xs text-fos-muted">#{i + 1}</span>
                <span className="w-40 truncate text-fos-text">{p.competitor}</span>
                <div className="relative h-4 flex-1 overflow-hidden rounded bg-fos-surface2">
                  <div className="absolute inset-y-0 left-0 rounded bg-blue-500" style={{ width: `${(p.avgPrice / positioning[0].avgPrice) * 100}%` }} />
                </div>
                <span className="w-24 text-right font-mono text-xs tabular-nums text-fos-text">avg {fmtPrice(Math.round(p.avgPrice), "USD")}</span>
                <span className="w-14 text-right font-mono text-[11px] text-fos-muted">{p.priced}/{p.total}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-fos-faint">Premium positioning ≈ higher list pricing for comparable products. True margin needs internal cost data.</p>
        </Card>
      )}

      {/* selected competitor catalog */}
      {rec && latest ? (
        <Card
          title={`${rec.competitor} · ${latest.products.length} products`}
          action={
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-fos-muted">researched {new Date(latest.researchedAt).toLocaleString()}</span>
              <button onClick={() => research(rec.competitor)} disabled={!!loading} className="flex items-center gap-1 rounded-lg border border-fos-border px-2 py-1 text-[11px] text-fos-muted hover:text-fos-text disabled:opacity-50">
                <RefreshCw size={12} className={loading === rec.competitor ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={() => { deleteRecord(rec.competitor); const r = reload(); setSelected(r[0]?.competitor ?? null); }} className="text-fos-muted hover:text-rose-400" title="Stop tracking">
                <Trash2 size={13} />
              </button>
            </div>
          }
        >
          {latest.estimated && latest.products.length > 0 && (
            <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <p className="text-[11px] text-amber-100/90">
                <span className="font-semibold text-amber-200">Estimates — not live-sourced.</span> Live web search is unavailable (no OpenRouter credits / Tavily key), so these figures come from the model&apos;s knowledge and may be inaccurate or out of date. Add a Tavily key (settings above) for cited data.
              </p>
            </div>
          )}
          {latest.products.length === 0 ? (
            <p className="text-sm text-fos-muted">No products extracted from the sources. Try a more specific competitor name or focus.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fos-border text-right font-mono text-[10px] uppercase tracking-wider text-fos-muted">
                    <th className="py-2 text-left">Product</th>
                    <th className="py-2 text-left">Category</th>
                    <th className="py-2">Price</th>
                    <th className="py-2 text-left">Change</th>
                    <th className="py-2 text-right">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.products.map((p, i) => {
                    const ch = changeByKey.get((p.sku?.trim() || p.product.trim()).toLowerCase());
                    return (
                      <tr key={i} className="border-b border-fos-border/50 align-top">
                        <td className="py-2.5">
                          <p className="font-medium text-fos-text">{p.product}</p>
                          {p.sku && <p className="font-mono text-[10px] text-fos-muted">{p.sku}</p>}
                          {p.features.length > 0 && <p className="mt-0.5 text-[11px] text-fos-faint">{p.features.slice(0, 4).join(" · ")}</p>}
                        </td>
                        <td className="py-2.5 text-fos-muted">{p.category ?? "—"}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums text-fos-text">{fmtPrice(p.price, p.currency)}</td>
                        <td className="py-2.5"><ChangeTag ch={ch} /></td>
                        <td className="py-2.5 text-right">
                          {p.sourceUrl ? (
                            <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-300 hover:underline" title={p.sourceUrl}><ExternalLink size={12} /> link</a>
                          ) : <span className="text-fos-faint">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rec.snapshots.length > 1 && (
            <div className="mt-4 border-t border-fos-border pt-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fos-muted">History</p>
              <div className="flex flex-wrap gap-2">
                {rec.snapshots.map((s, i) => (
                  <span key={i} className="rounded-md border border-fos-border px-2 py-1 font-mono text-[10px] text-fos-muted">
                    {new Date(s.researchedAt).toLocaleDateString()} · {s.products.filter((p) => p.price != null).length} priced
                  </span>
                ))}
              </div>
            </div>
          )}

          {latest.sources.length > 0 && (
            <div className="mt-4 border-t border-fos-border pt-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fos-muted">Sources</p>
              <div className="space-y-1">
                {latest.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-blue-300/80 hover:underline" title={s.url}>{i + 1}. {s.title}</a>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        !err && records.length === 0 && !discovering && discovered.length === 0 && (
          <div className="grid place-items-center py-16 text-center">
            <div className="max-w-sm">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10 text-blue-300"><Building2 size={22} /></div>
              <h3 className="mt-4 text-lg font-semibold text-fos-text">Start with your company</h3>
              <p className="mt-1 text-sm text-fos-muted">Enter your company above (e.g. Sonny&apos;s Enterprises) and a region. The agent finds your competitors, then researches each one&apos;s pricing — cited and tracked.</p>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function ChangeTag({ ch }: { ch?: ProductChange }) {
  if (!ch || ch.kind === "unchanged") return <span className="text-fos-faint">—</span>;
  if (ch.kind === "new") return <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-300">new</span>;
  if (ch.kind === "removed") return <span className="rounded-full bg-fos-surface2 px-2 py-0.5 text-[10px] text-fos-muted">removed</span>;
  const up = ch.kind === "price-up";
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium", up ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300")}>
      {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {ch.deltaPct != null ? `${Math.abs(ch.deltaPct)}%` : "chg"}
    </span>
  );
}

function ErrorPanel({ code, detail }: { code: string; detail?: string }) {
  const map: Record<string, { title: string; body: string }> = {
    no_search_backend: { title: "No search backend", body: "Configure an OpenRouter provider in Admin → Providers (its web plugin powers search), or add a Tavily key in the settings above." },
    no_provider: { title: "No AI provider configured", body: "Configure an LLM provider in Admin → Providers so the agent can extract pricing." },
    no_openrouter: { title: "OpenRouter not configured", body: "Add your OpenRouter key in Admin → Providers, or add a Tavily key above." },
    search_key_missing: { title: "Search not configured", body: "Add a Tavily key above, or configure an OpenRouter provider for the default web search." },
    search_failed: { title: "Search failed", body: detail || "The search provider returned an error. Try again." },
    or_failed: {
      title: "Web search unavailable",
      body: /402|credit|insufficient|plugin|no endpoints/i.test(detail || "")
        ? "OpenRouter's web plugin needs account credits (it's billed per search). Add a free Tavily key in settings above to use dedicated search instead — or top up OpenRouter credits."
        : detail || "All models were rate-limited or failed. Retry — the agent auto-rotates models.",
    },
    company_required: { title: "Enter your company", body: "Type your company name to discover competitors." },
    competitor_required: { title: "Enter a competitor", body: "Pick or type a competitor to research." },
    key_admin_only: { title: "Admin login required", body: "Saving the search key is admin-only. Log in as the admin account, then save the key again." },
    key_save_failed: { title: "Couldn't save key", body: detail || "The key could not be saved. Try again." },
  };
  const m = map[code] ?? { title: "Request failed", body: detail || code };
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-sm font-semibold text-amber-200">{m.title}</p>
      <p className="mt-1 text-xs text-amber-100/80">{m.body}</p>
    </div>
  );
}

type Positioning = { competitor: string; avgPrice: number; priced: number; total: number };

function buildPositioning(records: CompetitorRecord[]): Positioning[] {
  return records
    .map((r) => {
      const products = r.snapshots[0]?.products ?? [];
      const priced = products.filter((p) => p.price != null) as { price: number }[];
      const avgPrice = priced.length ? priced.reduce((s, p) => s + p.price, 0) / priced.length : 0;
      return { competitor: r.competitor, avgPrice, priced: priced.length, total: products.length };
    })
    .filter((p) => p.avgPrice > 0)
    .sort((a, b) => b.avgPrice - a.avgPrice);
}

function buildRecs(changes: ProductChange[], selected: string | null, positioning: Positioning[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const ups = changes.filter((c) => c.kind === "price-up");
  if (ups.length && selected) {
    const biggest = [...ups].sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0))[0];
    recs.push({
      id: `ci-${selected}-up`,
      module: "competitor-intelligence",
      title: `${selected} raised ${biggest.product} by ${biggest.deltaPct}% — room to follow`,
      rationale: `${ups.length} of ${selected}'s products rose since last check — competitor increases open headroom for ours.`,
      risk: "Low",
      priority: 44,
    });
  }
  if (positioning.length >= 2) {
    const top = positioning[0];
    recs.push({
      id: "ci-premium-leader",
      module: "competitor-intelligence",
      title: `${top.competitor} prices most premium (avg $${Math.round(top.avgPrice).toLocaleString()})`,
      rationale: `Highest average list pricing among tracked competitors — the market ceiling benchmark.`,
      risk: "Medium",
      priority: 34,
    });
  }
  return recs;
}
