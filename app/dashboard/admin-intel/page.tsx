"use client";

/* ============================================================================
   Admin Intelligence Center — executive control center (admin only).
   ----------------------------------------------------------------------------
   Every autonomous system reports findings, recommendations and required admin
   actions here. Aggregates the Evolution Director, security and registries.
   Reports persist in the Knowledge Layer; events publish on the Event Bus.
   ========================================================================== */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { REPORT_CATEGORIES, type AdminIntel, type ReportCategory, type Priority } from "@/lib/admin/types";

export default function AdminIntelPage() {
  const [intel, setIntel] = useState<AdminIntel | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cat, setCat] = useState<ReportCategory | "all">("all");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/intel");
    if (res.status === 403) { setForbidden(true); return; }
    setIntel(await res.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setBusy(true); try { const r = await fetch("/api/admin/intel", { method: "POST" }); if (r.ok) setIntel((await r.json()).intel); } finally { setBusy(false); } };

  if (forbidden) return <PageShell title="Admin Intelligence"><p className="text-sm text-muted">Administrators only.</p></PageShell>;
  if (!intel) return <PageShell title="Admin Intelligence"><p className="text-sm text-muted">Loading…</p></PageShell>;

  const reports = cat === "all" ? intel.reports : intel.reports.filter((r) => r.category === cat);

  return (
    <PageShell
      title="Admin Intelligence Center"
      subtitle="Everything the platform discovered — findings, recommendations and actions awaiting you."
      action={
        <div className="flex gap-2">
          <button type="button" onClick={refresh} disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Refreshing…" : "↻ Refresh"}</button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* daily executive */}
        <section className="rounded-2xl border border-line bg-gradient-to-br from-brand/[0.05] to-violet/[0.04] p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">📋 Daily Executive Report</p>
            <ExportBar intel={intel} />
          </div>
          <p className="text-[13px] text-ink">{intel.daily.summary}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {Object.entries(intel.health).map(([k, v]) => <Mini key={k} k={k} v={v as number} />)}
          </div>
          {intel.daily.top10.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wider text-faint">Top Recommendations</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-[12px] text-muted">{intel.daily.top10.map((t, i) => <li key={i}>{t}</li>)}</ol>
            </div>
          )}
        </section>

        {/* administrator actions */}
        <section className={card}>
          <p className={head}>Administrator Actions ({intel.actions.length})</p>
          {intel.actions.length === 0 ? <Empty>Nothing needs you right now.</Empty> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {intel.actions.map((a) => (
                <div key={a.id} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-ink">{a.title}</span>
                    <PriorityPill p={a.priority} />
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">{a.status.replace(/_/g, " ")}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-muted">{a.reason}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
                    <span>{a.estTime} · {a.benefit}</span>
                    <Link href={a.href} className="font-medium text-brand hover:underline">Go →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* providers + mcp */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={card}>
            <p className={head}>Providers (model discovery)</p>
            <ul className="space-y-1.5">
              {intel.providers.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-ink">{p.name} <span className="text-faint">· {p.freeModels}</span></span>
                  <span className={p.connected ? "text-emerald-600" : "text-amber-600"}>{p.connected ? "connected" : "awaiting admin"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-faint">Never auto-connected / no auto keys. Connect in <Link href="/admin" className="text-brand hover:underline">Providers</Link>.</p>
          </section>
          <section className={card}>
            <p className={head}>MCP Servers (discovery)</p>
            <ul className="space-y-1.5">
              {intel.mcp.map((m) => (
                <li key={m.id} className="text-[12px]">
                  <span className="font-medium text-ink">{m.name}</span> <span className="text-faint">· {m.complexity}</span>
                  <p className="text-[11px] text-muted">{m.purpose} — {m.benefits}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* reports by category */}
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <p className={head}>Reports ({intel.reports.length})</p>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
            {REPORT_CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
          </div>
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">{r.category}</span>
                  <PriorityPill p={r.priority} />
                  <span className="text-[11px] text-faint">ROI {r.roi} · {r.devTime} · {Math.round(r.confidence * 100)}% conf · {r.risk} risk</span>
                </div>
                <p className="mt-1 text-[13px] text-ink">{r.summary}</p>
                <p className="mt-1 text-[12px] text-muted"><span className="text-faint">Recommendation:</span> {r.recommendation}</p>
                <p className="text-[12px] text-muted"><span className="text-faint">Next:</span> {r.nextAction}</p>
              </div>
            ))}
            {reports.length === 0 && <Empty>No reports in this category.</Empty>}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

/* ---- export ---- */
function ExportBar({ intel }: { intel: AdminIntel }) {
  const dl = (name: string, text: string, type: string) => {
    const blob = new Blob([text], { type }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  };
  const md = () => {
    const lines = [
      `# NEX·ERA Admin Daily Report`, `_${new Date(intel.generatedAt).toLocaleString()}_`, "", intel.daily.summary, "",
      `## Health`, ...Object.entries(intel.health).map(([k, v]) => `- ${k}: ${v}`), "",
      `## Administrator Actions`, ...intel.actions.map((a) => `- [${a.priority}] ${a.title} — ${a.reason} (${a.estTime})`), "",
      `## Reports`, ...intel.reports.map((r) => `- **${r.category}** [${r.priority}] ${r.summary} → ${r.nextAction}`),
    ];
    dl("admin-report.md", lines.join("\n"), "text/markdown");
  };
  const json = () => dl("admin-report.json", JSON.stringify(intel, null, 2), "application/json");
  const csv = () => {
    const rows = [["category", "priority", "roi", "risk", "summary"], ...intel.reports.map((r) => [r.category, r.priority, String(r.roi), r.risk, r.summary.replace(/"/g, "'")])];
    dl("admin-report.csv", rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n"), "text/csv");
  };
  return (
    <div className="flex gap-1.5 text-[11px]">
      <button type="button" onClick={md} className="rounded border border-line px-2 py-0.5 text-muted hover:text-ink">MD</button>
      <button type="button" onClick={json} className="rounded border border-line px-2 py-0.5 text-muted hover:text-ink">JSON</button>
      <button type="button" onClick={csv} className="rounded border border-line px-2 py-0.5 text-muted hover:text-ink">CSV</button>
    </div>
  );
}

const card = "rounded-2xl border border-line bg-surface-2 p-4";
const head = "mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted";
function Mini({ k, v }: { k: string; v: number }) {
  return <div className="rounded-lg border border-line bg-surface p-2"><p className="text-[9px] uppercase tracking-wider text-faint">{k}</p><p className="text-sm font-semibold text-ink">{v}</p></div>;
}
function PriorityPill({ p }: { p: Priority }) {
  const c = p === "critical" ? "#ef4444" : p === "high" ? "#f97316" : p === "medium" ? "#f59e0b" : "#10b981";
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: `${c}1f`, color: c }}>{p}</span>;
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${active ? "border-brand/40 bg-brand/[0.10] text-brand" : "border-line text-muted hover:text-ink"}`}>{children}</button>;
}
function Empty({ children }: { children: React.ReactNode }) { return <p className="text-[13px] text-muted">{children}</p>; }
