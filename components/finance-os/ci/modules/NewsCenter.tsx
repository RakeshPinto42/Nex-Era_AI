"use client";

// Commercial News Center — monitor competitors for launches, M&A, dealer/territory
// moves, tech, partnerships, exec changes. Each item carries a threat/opportunity
// assessment and a recommended Sonny's response. Web-sourced; nothing fabricated.

import { useState } from "react";
import { RefreshCw, ExternalLink, AlertTriangle, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCi } from "../context";
import { fetchCompetitorNews, ResearchError, type NewsItem } from "@/lib/finance-os/ci/agent/client";
import { COMPETITORS } from "@/lib/finance-os/ci/sonnys";
import { Card } from "./ui";

export function NewsCenter() {
  const { setModuleRecs } = useCi();
  const [competitor, setCompetitor] = useState<string>(COMPETITORS[0]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<{ code: string; detail?: string } | null>(null);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);

  const run = async (c: string) => {
    if (loading) return;
    setCompetitor(c);
    setLoading(true);
    setErr(null);
    try {
      const res = await fetchCompetitorNews(c);
      setNews(res.news);
      setSources(res.sources);
      setFetchedFor(c);
      setModuleRecs(
        "news-center",
        res.news.filter((n) => n.assessment === "Threat").slice(0, 3).map((n, i) => ({
          id: `news-${c}-${i}`,
          module: "news-center",
          title: `Respond to ${c}: ${n.headline}`,
          rationale: n.response || n.summary,
          risk: "Medium" as const,
          priority: 38,
        })),
      );
    } catch (e) {
      const re = e as ResearchError;
      setErr({ code: re.code ?? "error", detail: re.detail });
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-fos-border bg-fos-surface p-4">
        <p className="text-sm font-semibold text-fos-text">Monitor a competitor</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {COMPETITORS.map((c) => (
            <button key={c} onClick={() => run(c)} disabled={loading} className={cn("rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50", competitor === c ? "border-blue-500 bg-blue-500/15 text-blue-200" : "border-fos-border text-fos-muted hover:text-fos-text")}>
              {loading && competitor === c ? "…" : c}
            </button>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] text-fos-faint">Web-searches recent commercial news. Items are cited; assessments + responses are generated.</p>
      </div>

      {err && <NewsError code={err.code} detail={err.detail} />}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-fos-muted"><RefreshCw size={14} className="animate-spin" /> Searching news for {competitor}…</div>
      )}

      {!loading && fetchedFor && (
        <Card title={`${fetchedFor} · ${news.length} items`}>
          {news.length === 0 ? (
            <p className="text-sm text-fos-muted">No recent news found in the sources.</p>
          ) : (
            <div className="space-y-3">
              {news.map((n, i) => <NewsRow key={i} n={n} />)}
            </div>
          )}
          {sources.length > 0 && (
            <div className="mt-4 border-t border-fos-border pt-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fos-muted">Sources</p>
              {sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-blue-300/80 hover:underline" title={s.url}>{i + 1}. {s.title}</a>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function NewsRow({ n }: { n: NewsItem }) {
  return (
    <div className="rounded-lg border border-fos-border bg-fos-bg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fos-text">{n.headline}</p>
          <p className="font-mono text-[10px] text-fos-muted">{n.type}{n.date ? ` · ${n.date}` : ""}</p>
        </div>
        <Assessment a={n.assessment} />
      </div>
      {n.summary && <p className="mt-1.5 text-[13px] text-fos-muted">{n.summary}</p>}
      {n.response && <p className="mt-2 border-t border-fos-border pt-2 text-[13px] text-blue-200">→ {n.response}</p>}
      {n.url && (
        <a href={n.url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-blue-300 hover:underline"><ExternalLink size={11} /> source</a>
      )}
    </div>
  );
}

function Assessment({ a }: { a: NewsItem["assessment"] }) {
  if (a === "Threat") return <span className="flex flex-none items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-300"><AlertTriangle size={10} /> Threat</span>;
  if (a === "Opportunity") return <span className="flex flex-none items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300"><TrendingUp size={10} /> Opportunity</span>;
  return <span className="flex flex-none items-center gap-1 rounded-full bg-fos-surface2 px-2 py-0.5 text-[10px] text-fos-muted"><Minus size={10} /> Neutral</span>;
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
