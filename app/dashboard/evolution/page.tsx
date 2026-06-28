"use client";

/* ============================================================================
   Evolution Dashboard — the Autonomous Evolution Platform control plane.
   ----------------------------------------------------------------------------
   Observe → propose → classify (Policy) → validate → (gated) deploy → measure.
   Routes through Hermes / Validation Agent / Policy Engine. The Director never
   executes destructive git/deploy autonomously — HIGH-risk + real deploys are
   queued to human/CI.
   ========================================================================== */

import { useCallback, useEffect, useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import type { EvolutionReport, DeploymentRecord, ModelRecord, Proposal, RiskLevel } from "@/lib/evolution/types";

export default function EvolutionPage() {
  const [report, setReport] = useState<EvolutionReport | null>(null);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/evolution").then((x) => x.json());
    setReport(r.report); setDeployments(r.deployments ?? []); setModels(r.models ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (body: object) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/evolution", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json());
      if (r.error) setMsg(r.error); else await load();
    } finally { setBusy(false); }
  };

  return (
    <PageShell
      title="Evolution"
      subtitle="Autonomous Evolution Platform — observes, proposes and validates improvements through Hermes, the Validation Agent and the Policy Engine. Real deploys stay human/CI-gated."
      action={<button type="button" onClick={() => act({ action: "run" })} disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50">{busy ? "Running…" : "▶ Run Cycle"}</button>}
    >
      {msg && <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">{msg}</p>}
      {!report ? <p className="text-sm text-muted">Loading…</p> : (
        <div className="space-y-4">
          {/* health */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            <Score label="Platform" v={report.health.platform} />
            <Score label="Architecture" v={report.health.architecture} />
            <Score label="Security" v={report.health.security} />
            <Score label="Tech Debt" v={report.health.technicalDebt} invert />
            <Score label="AI" v={report.health.ai} />
            <Score label="Agents" v={report.health.agents} />
            <Score label="Tools" v={report.health.tools} />
            <Score label="Models" v={report.health.models} />
          </div>

          <div className={card}><p className="text-[13px] text-ink">{report.summary}</p><p className="mt-1 text-[11px] text-faint">Generated {new Date(report.generatedAt).toLocaleString()}</p></div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* improvement queue */}
            <section className={card}>
              <p className={head}>Improvement Queue ({report.proposals.length})</p>
              <ul className="space-y-2">
                {report.proposals.map((p) => <ProposalRow key={p.id} p={p} onProcess={() => act({ action: "process", id: p.id })} busy={busy} />)}
              </ul>
            </section>

            <div className="space-y-4">
              {/* deployments */}
              <section className={card}>
                <p className={head}>Deployment / Rollback History</p>
                {deployments.length === 0 ? <Empty>No actions yet.</Empty> : (
                  <ul className="space-y-1.5">
                    {deployments.map((d) => (
                      <li key={d.id} className="text-[12px]">
                        <span className="font-mono text-[10px] text-faint">{new Date(d.at).toLocaleTimeString()}</span>{" "}
                        <ResultPill r={d.result} /> <span className="text-muted">{d.risk} risk</span>
                        <p className="text-[11px] text-faint">{d.notes}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* model benchmarks */}
              <section className={card}>
                <p className={head}>Model Benchmarks</p>
                {models.length === 0 ? <Empty>No models registered. The Model Intelligence engine ranks by capability once models are benchmarked — the AI Router consumes the ranking (never hardcoded).</Empty> : (
                  <ul className="space-y-1">
                    {models.map((m) => (
                      <li key={m.id} className="flex items-center justify-between text-[12px]">
                        <span className="truncate font-mono text-[11px] text-ink">{m.id}</span>
                        <span className="text-muted">{Object.keys(m.scores).length} scored{m.deprecated ? " · deprecated" : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface-2 p-3 text-[11px] text-faint">
            Constraints honored: Hermes orchestrates · Validation Agent gates quality · Policy Engine gates deployment · HIGH-risk never auto-deploys · the Director routes git/deploy to CI/human, never executing them directly.
          </div>
        </div>
      )}
    </PageShell>
  );
}

const card = "rounded-2xl border border-line bg-surface-2 p-4";
const head = "mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted";

function Score({ label, v, invert }: { label: string; v: number; invert?: boolean }) {
  const good = invert ? 100 - v : v;
  const color = good >= 70 ? "#10b981" : good >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-3 py-3">
      <p className="font-mono text-[9px] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 text-xl font-semibold" style={{ color }}>{v}</p>
    </div>
  );
}

function ProposalRow({ p, onProcess, busy }: { p: Proposal; onProcess: () => void; busy: boolean }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-ink">{p.title}</span>
        <RiskPill risk={p.risk} />
        <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">{p.area}</span>
        <span className="text-[11px] text-muted">ROI {p.roi} · {p.effort} · {p.status}</span>
      </div>
      <p className="mt-1 text-[12px] text-muted">{p.detail}</p>
      <button type="button" onClick={onProcess} disabled={busy} className="mt-2 text-[11px] font-medium text-brand hover:underline disabled:opacity-50">Route through Policy →</button>
    </li>
  );
}
function RiskPill({ risk }: { risk: RiskLevel }) {
  const c = risk === "high" ? "#ef4444" : risk === "medium" ? "#f59e0b" : "#10b981";
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: `${c}1f`, color: c }}>{risk}</span>;
}
function ResultPill({ r }: { r: DeploymentRecord["result"] }) {
  const map: Record<DeploymentRecord["result"], string> = { deployed: "#10b981", pr_opened: "#2563eb", manual_required: "#f59e0b", rolled_back: "#ef4444", failed: "#ef4444" };
  return <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${map[r]}1f`, color: map[r] }}>{r.replace(/_/g, " ")}</span>;
}
function Empty({ children }: { children: React.ReactNode }) { return <p className="text-[13px] text-muted">{children}</p>; }
