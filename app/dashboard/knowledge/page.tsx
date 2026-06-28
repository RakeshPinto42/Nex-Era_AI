"use client";

/* ============================================================================
   Knowledge Layer — search + object explorer.
   ----------------------------------------------------------------------------
   Reads the canonical Knowledge store (/api/knowledge). Cross-domain search,
   object detail with timeline, relationships, sources and AI insights. Reads
   are open; writes happen server-side via authorized workflows (e.g. the
   Investment Intelligence Agent records Company objects on research).
   ========================================================================== */

import { useCallback, useEffect, useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import { KNOWLEDGE_TYPES, type KnowledgeObject, type KnowledgeType, type KnowledgeSearchResult } from "@/lib/knowledge/types";

type Stats = { total: number; byType: Record<string, number> };

export default function KnowledgePage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<KnowledgeType | "">("");
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<KnowledgeObject | null>(null);
  const [related, setRelated] = useState<KnowledgeObject[]>([]);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams({ q });
      if (type) params.set("type", type);
      const r = await fetch(`/api/knowledge?${params.toString()}`).then((x) => x.json());
      setResults(r.results ?? []);
      setStats(r.stats ?? null);
    } finally {
      setBusy(false);
    }
  }, [q, type]);

  useEffect(() => { search(); }, [search]);

  const open = async (id: string) => {
    const r = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`).then((x) => x.json());
    if (!r.error) { setSelected(r.object); setRelated(r.related ?? []); }
  };

  return (
    <PageShell
      title="Knowledge Layer"
      subtitle="The canonical knowledge foundation — search every entity across finance, investments, research, files and agents."
    >
      {/* stats */}
      {stats && (
        <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-line px-2.5 py-1 text-muted">{stats.total} objects</span>
          {Object.entries(stats.byType).slice(0, 8).map(([t, n]) => (
            <span key={t} className="rounded-full bg-surface-3 px-2 py-1 font-mono text-faint">{t}: {n}</span>
          ))}
        </div>
      )}

      {/* search */}
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search knowledge… companies, theses, reports, strategies, files…"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none focus:border-brand/50"
          />
          <button type="button" onClick={search} disabled={busy} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50">
            {busy ? "…" : "Search"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip active={type === ""} onClick={() => setType("")}>All</Chip>
          {KNOWLEDGE_TYPES.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(t)}>{t}</Chip>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* results */}
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-surface-2 p-6 text-center text-sm text-muted">
              No knowledge objects yet. Run agents (e.g. research a ticker in the Investment Intelligence Agent) to populate the layer.
            </p>
          ) : results.map(({ object, score }) => (
            <button
              key={object.id}
              type="button"
              onClick={() => open(object.id)}
              className={`block w-full rounded-2xl border bg-surface-2 p-3 text-left transition-colors hover:border-brand/40 ${selected?.id === object.id ? "border-brand/50" : "border-line"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-ink">{object.title}</span>
                <span className="flex-none rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">{object.type}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[12px] text-muted">{object.summary || "—"}</p>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-faint">
                <span>{Math.round(object.confidence * 100)}% conf</span>
                <span>{object.relationships.length} links</span>
                {score > 0 && <span>· match {score}</span>}
              </div>
            </button>
          ))}
        </div>

        {/* detail */}
        <div>
          {selected ? <Detail object={selected} related={related} onOpen={open} /> : (
            <div className="grid h-full place-items-center rounded-2xl border border-dashed border-line bg-surface-2 p-10 text-sm text-muted">
              Select an object to view its timeline, relationships and AI insights.
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function Detail({ object, related, onOpen }: { object: KnowledgeObject; related: KnowledgeObject[]; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-ink">{object.title}</h2>
          <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">{object.type}</span>
        </div>
        <p className="mt-1 text-[13px] text-ink">{object.summary || "—"}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          <span>{Math.round(object.confidence * 100)}% confidence</span>
          <span>owner: {object.owner}</span>
          <span>{object.permissions.visibility}</span>
          <span>updated {new Date(object.lastUpdated).toLocaleString()}</span>
        </div>
        {object.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {object.tags.map((t) => <span key={t} className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">{t}</span>)}
          </div>
        )}
      </div>

      <Panel title="AI Insights">
        {object.aiInsights.length === 0 ? <Empty>None.</Empty> : (
          <ul className="space-y-2">
            {object.aiInsights.slice(-5).reverse().map((i, n) => (
              <li key={n} className="text-[12px]">
                <span className="font-mono text-[10px] text-brand">{i.by} · {Math.round(i.confidence * 100)}%</span>
                <p className="text-ink">{i.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Relationships">
        {object.relationships.length === 0 ? <Empty>No relationships.</Empty> : (
          <ul className="space-y-1">
            {object.relationships.map((r, n) => (
              <li key={n} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="text-muted">{r.type.replace(/_/g, " ")}</span>
                <button type="button" onClick={() => onOpen(r.targetId)} className="truncate text-brand hover:underline">{r.targetTitle ?? r.targetId}</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Timeline">
        {object.timeline.length === 0 ? <Empty>No history.</Empty> : (
          <ul className="space-y-1.5">
            {object.timeline.slice(0, 12).map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-[12px]">
                <span className="flex-none font-mono text-[10px] text-faint">{new Date(t.at).toLocaleDateString()}</span>
                <span className="text-faint">{t.kind.replace(/_/g, " ")}</span>
                <span className="min-w-0 text-ink">{t.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {(object.sources.length > 0 || related.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {object.sources.length > 0 && (
            <Panel title="Sources">
              <ul className="space-y-1">{object.sources.slice(0, 8).map((s, n) => <li key={n} className="truncate text-[12px] text-muted">{s.title}</li>)}</ul>
            </Panel>
          )}
          {related.length > 0 && (
            <Panel title="Related Objects">
              <ul className="space-y-1">{related.map((r) => <li key={r.id}><button type="button" onClick={() => onOpen(r.id)} className="text-[12px] text-brand hover:underline">{r.title}</button></li>)}</ul>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full border px-2 py-0.5 font-mono text-[10px] transition-colors ${active ? "border-brand/40 bg-brand/[0.10] text-brand" : "border-line text-muted hover:text-ink"}`}>{children}</button>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
