"use client";

// Commercial News Center — monitor competitors for launches, M&A, dealer/territory
// moves, tech, partnerships, exec changes. Scan one competitor or ALL at once. Each
// item is web-sourced, LLM-validated, and rated for business impact on Sonny's, with
// a threat/opportunity assessment and a recommended response. Nothing fabricated.

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ExternalLink, AlertTriangle, TrendingUp, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCi } from "../context";
import { fetchCompetitorNews, ResearchError, type NewsItem } from "@/lib/finance-os/ci/agent/client";
import { COMPETITORS } from "@/lib/finance-os/ci/sonnys";
import { CI_REGION_ALL } from "@/lib/finance-os/ci/types";
import { Card } from "./ui";

type Result = { news: NewsItem[]; sources: { title: string; url: string }[]; fetchedAt: string };
type FeedRow = NewsItem & { competitor: string };

const ASSESS_RANK: Record<NewsItem["assessment"], number> = { Threat: 0, Opportunity: 1, Neutral: 2 };
const IMPACT_RANK: Record<NewsItem["impact"], number> = { High: 0, Medium: 1, Low: 2 };

export function NewsCenter() {
  const { region: scopeRegion, setModuleRecs } = useCi();
  // Region scopes the news scrape; "All Regions" → no geographic filter.
  const region = scopeRegion === CI_REGION_ALL ? undefined : scopeRegion;
  const [results, setResults] = useState<Record<string, Result>>({});
  const [loading, setLoading] = useState<string | null>(null); // competitor being fetched
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState<{ code: string; detail?: string } | null>(null);

  const run = async (c: string): Promise<boolean> => {
    setLoading(c);
    setErr(null);
    try {
      const res = await fetchCompetitorNews(c, region);
      setResults((prev) => ({ ...prev, [c]: { news: res.news, sources: res.sources, fetchedAt: res.fetchedAt } }));
      return true;
    } catch (e) {
      const re = e as ResearchError;
      setErr({ code: re.code ?? "error", detail: re.detail });
      return false;
    } finally {
      setLoading(null);
    }
  };

  // Region change re-scopes the scrape — drop stale results so the feed reflects it.
  useEffect(() => { setResults({}); }, [region]);

  const scanAll = async () => {
    if (scanning || loading) return;
    setScanning(true);
    setErr(null);
    setResults({});
    for (const c of COMPETITORS) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await run(c);
      if (!ok) break; // stop early on an account-level error (e.g. no credits)
    }
    setScanning(false);
  };

  // Merge every fetched competitor's items into one feed, highest-priority first.
  const feed = useMemo<FeedRow[]>(() => {
    const rows: FeedRow[] = [];
    for (const [competitor, r] of Object.entries(results)) {
      for (const n of r.news) rows.push({ ...n, competitor });
    }
    return rows.sort((a, b) =>
      ASSESS_RANK[a.assessment] - ASSESS_RANK[b.assessment] ||
      IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact],
    );
  }, [results]);

  // Top threats/high-impact items feed the Recommendations panel.
  useEffect(() => {
    setModuleRecs(
      "news-center",
      feed
        .filter((n) => n.assessment === "Threat" && n.impact !== "Low")
        .slice(0, 5)
        .map((n, i) => ({
          id: `news-${n.competitor}-${i}`,
          module: "news-center",
          title: `Respond to ${n.competitor}: ${n.headline}`,
          rationale: n.response || n.impactRationale || n.summary,
          risk: (n.impact === "High" ? "High" : "Medium") as "High" | "Medium",
          priority: n.impact === "High" ? 46 : 38,
        })),
    );
  }, [feed, setModuleRecs]);

  const fetchedCount = Object.keys(results).length;
  const progress = scanning ? `${fetchedCount}/${COMPETITORS.length}` : null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-fos-border bg-fos-surface shadow-[var(--fos-shadow)] p-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-fos-text">Monitor competitors</p>
          <button onClick={scanAll} disabled={scanning || !!loading} className="ml-auto flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
            {scanning ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {scanning ? `Scanning ${progress}…` : "Scan all competitors"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {COMPETITORS.map((c) => {
            const has = results[c];
            return (
              <button key={c} onClick={() => run(c)} disabled={scanning || !!loading} className={cn("flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50", has ? "border-blue-500 bg-blue-500/15 text-blue-200" : "border-fos-border text-fos-muted hover:text-fos-text")}>
                {loading === c ? "…" : c}
                {has && <span className="font-mono text-[10px] opacity-60">{has.news.length}</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-2 font-mono text-[10px] text-fos-faint">Web-searches recent commercial news per competitor. Items are cited, LLM-validated, and rated for impact on Sonny&apos;s.</p>
      </div>

      {err && <NewsError code={err.code} detail={err.detail} />}

      {(scanning || loading) && feed.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-fos-muted"><RefreshCw size={14} className="animate-spin" /> Searching news{progress ? ` (${progress})` : loading ? ` for ${loading}` : ""}…</div>
      )}

      {feed.length > 0 && (
        <Card title={`Commercial news · ${feed.length} items · ${fetchedCount} competitor${fetchedCount === 1 ? "" : "s"}`}>
          <div className="space-y-3">
            {feed.map((n, i) => <NewsRow key={`${n.competitor}-${i}`} n={n} />)}
          </div>
          <Sources results={results} />
        </Card>
      )}
    </div>
  );
}

function NewsRow({ n }: { n: FeedRow }) {
  return (
    <div className="rounded-lg border border-fos-border bg-fos-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fos-text">{n.headline}</p>
          <p className="font-mono text-[10px] text-fos-muted"><span className="text-blue-300">{n.competitor}</span> · {n.type}{n.date ? ` · ${n.date}` : ""}</p>
        </div>
        <div className="flex flex-none items-center gap-1.5">
          <ImpactBadge impact={n.impact} />
          <Assessment a={n.assessment} />
        </div>
      </div>
      {n.summary && <p className="mt-1.5 text-[13px] text-fos-muted">{n.summary}</p>}
      {n.impactRationale && <p className="mt-1.5 text-[12px] text-fos-faint"><span className="font-medium text-fos-muted">Impact:</span> {n.impactRationale}</p>}
      {n.response && <p className="mt-2 border-t border-fos-border pt-2 text-[13px] text-blue-200">→ {n.response}</p>}
      {n.url && (
        <a href={n.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-blue-300 hover:underline"><ExternalLink size={11} /> source</a>
      )}
    </div>
  );
}

function ImpactBadge({ impact }: { impact: NewsItem["impact"] }) {
  const tone =
    impact === "High" ? "bg-rose-500/15 text-rose-300"
    : impact === "Medium" ? "bg-amber-500/15 text-amber-300"
    : "bg-fos-surface2 text-fos-muted";
  return <span className={cn("flex-none rounded-full px-2 py-0.5 text-[10px] font-medium", tone)}>{impact} impact</span>;
}

function Assessment({ a }: { a: NewsItem["assessment"] }) {
  if (a === "Threat") return <span className="flex flex-none items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-300"><AlertTriangle size={10} /> Threat</span>;
  if (a === "Opportunity") return <span className="flex flex-none items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300"><TrendingUp size={10} /> Opportunity</span>;
  return <span className="flex flex-none items-center gap-1 rounded-full bg-fos-surface2 px-2 py-0.5 text-[10px] text-fos-muted"><Minus size={10} /> Neutral</span>;
}

function Sources({ results }: { results: Record<string, Result> }) {
  const all = Object.values(results).flatMap((r) => r.sources);
  // De-dupe by URL across competitors.
  const seen = new Set<string>();
  const sources = all.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
  if (sources.length === 0) return null;
  return (
    <div className="mt-4 border-t border-fos-border pt-3">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fos-muted">Sources</p>
      {sources.map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-blue-300/80 hover:underline" title={s.url}>{i + 1}. {s.title}</a>
      ))}
    </div>
  );
}

function NewsError({ code, detail }: { code: string; detail?: string }) {
  const credits = /402|credit|insufficient|plugin|web/i.test(detail || "");
  const body =
    code === "no_search_backend" || code === "no_openrouter"
      ? "Configure an OpenRouter provider in Admin → Providers, or add a Tavily key in the Research tab settings."
      : credits
        ? "OpenRouter web search needs account credits. Add a free Tavily key (Research tab → settings) to use dedicated search instead."
        : detail || "News search failed — try again.";
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-sm font-semibold text-amber-200">News unavailable</p>
      <p className="mt-1 text-xs text-amber-100/80">{body}</p>
    </div>
  );
}
