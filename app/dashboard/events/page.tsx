"use client";

/* ============================================================================
   Event Monitor — observe the NEX·ERA Event Bus.
   ----------------------------------------------------------------------------
   Live events (polled replay), source, subscribers (destination), processing
   time and errors. The bus complements Hermes; this page only observes it.
   ========================================================================== */

import { useEffect, useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import type { EventRecord } from "@/lib/events/types";

type Sub = { id: string; name: string; types: string[] };
type Stats = { total: number; byType: Record<string, number>; subscribers: number };

export default function EventMonitorPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/events?limit=60", { cache: "no-store" }).then((x) => x.json());
        if (!alive) return;
        setEvents(r.events ?? []);
        setSubs(r.subscribers ?? []);
        setStats(r.stats ?? null);
        setLive(true);
      } catch {
        if (alive) setLive(false);
      }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <PageShell title="Event Monitor" subtitle="Live internal events across every module. The bus complements Hermes — it does not orchestrate.">
      {/* status + stats */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-emerald-500 pulse-dot" : "bg-faint"}`} />
          {live ? "LIVE" : "connecting"}
        </span>
        {stats && <span className="text-muted">{stats.total} recent · {stats.subscribers} subscribers</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* live event stream */}
        <section className="rounded-2xl border border-line bg-surface-2 p-4">
          <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Live Events</p>
          {events.length === 0 ? (
            <p className="text-sm text-muted">No events yet. Run an agent / scan / research to emit events.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-faint">
                    <th className="text-left font-medium">Time</th>
                    <th className="text-left font-medium">Event</th>
                    <th className="text-left font-medium">Source</th>
                    <th className="text-right font-medium">Subs</th>
                    <th className="text-right font-medium">ms</th>
                    <th className="text-right font-medium">Err</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((r) => (
                    <tr key={r.envelope.id} className="border-t border-line align-top">
                      <td className="py-1 font-mono text-[10px] text-faint">{new Date(r.envelope.at).toLocaleTimeString()}</td>
                      <td className="py-1">
                        <span className="font-medium text-ink">{r.envelope.type}</span>
                        <div className="font-mono text-[10px] text-faint">corr {r.envelope.correlationId.slice(-6)}{r.envelope.workspaceId ? ` · ws ${r.envelope.workspaceId}` : ""}</div>
                      </td>
                      <td className="py-1 text-muted">{r.envelope.source}</td>
                      <td className="py-1 text-right text-muted">{r.subscribers.length}</td>
                      <td className="py-1 text-right font-mono text-faint">{r.processingMs}</td>
                      <td className={`py-1 text-right ${r.errors.length ? "text-red-600" : "text-faint"}`}>{r.errors.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* subscribers + by-type */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface-2 p-4">
            <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Subscribers</p>
            <ul className="space-y-1.5">
              {subs.map((s) => (
                <li key={s.id} className="text-[12px]">
                  <span className="font-medium text-ink">{s.name}</span>
                  <div className="font-mono text-[10px] text-faint">{s.types.join(", ")}</div>
                </li>
              ))}
            </ul>
          </section>
          {stats && Object.keys(stats.byType).length > 0 && (
            <section className="rounded-2xl border border-line bg-surface-2 p-4">
              <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">By Type</p>
              <ul className="space-y-1">
                {Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                  <li key={t} className="flex items-center justify-between text-[12px]">
                    <span className="text-ink">{t}</span><span className="font-mono text-muted">{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}
