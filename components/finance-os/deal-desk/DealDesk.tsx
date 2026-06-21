"use client";

import { useMemo, useState } from "react";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { FilterProvider, type FilterState } from "@/components/finance-os/dashboard/FilterContext";
import { fmtMoney } from "@/lib/finance/csv";
import { computeDeal, type DealInput } from "@/lib/finance-os/dealdesk";
import { cn, uid } from "@/lib/utils";
import { Dashboards } from "./Dashboards";

type Status = "Pending" | "Approved" | "Rejected";
type Deal = DealInput & { id: string; name: string; customer: string; status: Status };

const TABS = ["Deal Desk", "Dashboards"] as const;
type Tab = (typeof TABS)[number];

const SEED: Deal[] = [
  { id: "d1", name: "Enterprise renewal", customer: "Acme Corp", listPrice: 100, requestedPrice: 92, cost: 55, volume: 1200, termMonths: 12, status: "Pending" },
  { id: "d2", name: "New logo — competitive", customer: "Globex", listPrice: 100, requestedPrice: 70, cost: 55, volume: 800, termMonths: 24, status: "Pending" },
  { id: "d3", name: "Expansion upsell", customer: "Initech", listPrice: 100, requestedPrice: 88, cost: 50, volume: 400, termMonths: 12, status: "Pending" },
  { id: "d4", name: "Strategic discount", customer: "Umbrella", listPrice: 100, requestedPrice: 60, cost: 58, volume: 2000, termMonths: 36, status: "Pending" },
  { id: "d5", name: "SMB quick close", customer: "Wonka", listPrice: 100, requestedPrice: 96, cost: 52, volume: 150, termMonths: 12, status: "Pending" },
];

const ACCENT = "#d97706";
const APPROVALS = ["Auto Approve", "Manager Approval", "Finance Approval", "Executive Approval"];
const lbl = "mb-1 block text-[11px] font-medium text-ink/60";
const inp = "w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-amber-500";

export function DealDesk() {
  const [deals, setDeals] = useState<Deal[]>(SEED);
  const [selId, setSelId] = useState("d1");
  const [tab, setTab] = useState<Tab>("Deal Desk");
  const [filters, setFilters] = useState<FilterState>({});
  const sel = deals.find((d) => d.id === selId) ?? deals[0];
  const r = useMemo(() => (sel ? computeDeal(sel) : null), [sel]);

  const patchSel = (p: Partial<Deal>) => setDeals((ds) => ds.map((d) => (d.id === selId ? { ...d, ...p } : d)));
  const setStatus = (status: Status) => patchSel({ status });

  const pending = deals.filter((d) => d.status === "Pending").length;

  return (
    <ModuleScreen
      slug="deal-desk"
      title="Deal Desk"
      actions={<span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25">{pending} pending</span>}
    >
      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-xl border border-line bg-white p-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={tab === t ? { backgroundColor: `${ACCENT}14`, color: ACCENT } : { color: "#64748b" }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Dashboards" ? (
        <FilterProvider value={filters} onChange={setFilters}>
          <Dashboards deals={deals} />
        </FilterProvider>
      ) : (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ---- approval queue ---- */}
        <div className="lg:col-span-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">Approval queue</p>
          <div className="space-y-2">
            {deals.map((d) => {
              const dr = computeDeal(d);
              const active = d.id === selId;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelId(d.id)}
                  className={cn("w-full rounded-xl border bg-white p-3 text-left transition-colors", active ? "ring-2" : "hover:bg-canvas")}
                  style={active ? { borderColor: ACCENT, boxShadow: `0 0 0 2px ${ACCENT}33` } : { borderColor: "#e5e7eb" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">{d.name}</span>
                    <StatusPill status={d.status} />
                  </div>
                  <p className="text-xs text-muted">{d.customer}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <Chip>{dr.discountPct.toFixed(0)}% disc</Chip>
                    <Chip>{dr.marginPct.toFixed(0)}% margin</Chip>
                    <RiskChip risk={dr.risk} />
                    <span className="ml-auto font-mono text-muted">{fmtMoney(dr.revenue)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- detail + workflow ---- */}
        <div className="lg:col-span-7">
          {sel && r && (
            <div className="space-y-4 rounded-2xl border border-line bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{sel.name}</h3>
                  <p className="text-sm text-muted">{sel.customer}</p>
                </div>
                <StatusPill status={sel.status} />
              </div>

              {/* editable request */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {([["listPrice", "List"], ["requestedPrice", "Requested"], ["cost", "Cost"], ["volume", "Volume"], ["termMonths", "Term (mo)"]] as const).map(([k, l]) => (
                  <label key={k}>
                    <span className={lbl}>{l}</span>
                    <input type="number" className={inp} value={sel[k]} onChange={(e) => patchSel({ [k]: Number(e.target.value) } as Partial<Deal>)} />
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Discount" v={`${r.discountPct.toFixed(1)}%`} bad={r.discountPct > 25} />
                <Metric label="Margin" v={`${r.marginPct.toFixed(1)}%`} bad={r.marginPct < 20} />
                <Metric label="Contract rev" v={fmtMoney(r.revenue)} />
                <Metric label="Gross profit" v={fmtMoney(r.grossProfit)} bad={r.grossProfit < 0} />
              </div>

              {/* recommendation */}
              <div className="rounded-xl p-3" style={{ background: `${ACCENT}10` }}>
                <p className="text-sm font-semibold text-slate-900">
                  Recommendation: <span style={{ color: ACCENT }}>{r.recommendation}</span>
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ink/75">
                  {r.reasons.map((re, i) => <li key={i}>{re}</li>)}
                </ul>
              </div>

              {/* approval workflow */}
              <div>
                <p className={lbl}>Approval workflow</p>
                <div className="space-y-1.5">
                  {APPROVALS.map((a, i) => {
                    const need = APPROVALS.indexOf(r.approval);
                    const reached = i <= need;
                    return (
                      <div key={a} className="flex items-center gap-3">
                        <span
                          className="grid h-6 w-6 flex-none place-items-center rounded-full text-[11px] font-bold text-white"
                          style={{ background: reached ? ACCENT : "#cbd5e1" }}
                        >
                          {i + 1}
                        </span>
                        <span className={cn("text-sm", i === need ? "font-semibold text-slate-900" : reached ? "text-ink/70" : "text-muted")}>
                          {a}{i === need && " ← required"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* actions */}
              <div className="flex gap-2 border-t border-line pt-3">
                <button onClick={() => setStatus("Approved")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-95">Approve</button>
                <button onClick={() => setStatus("Rejected")} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:brightness-95">Reject</button>
                <button onClick={() => setStatus("Pending")} className="rounded-lg border border-line px-4 py-2 text-sm text-ink hover:bg-canvas">Reset</button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </ModuleScreen>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map = { Pending: "bg-amber-100 text-amber-700", Approved: "bg-emerald-100 text-emerald-700", Rejected: "bg-rose-100 text-rose-700" };
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", map[status])}>{status}</span>;
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-canvas px-2 py-0.5 text-ink/70">{children}</span>;
}
function RiskChip({ risk }: { risk: "Low" | "Medium" | "High" }) {
  const map = { Low: "bg-emerald-100 text-emerald-700", Medium: "bg-amber-100 text-amber-700", High: "bg-rose-100 text-rose-700" };
  return <span className={cn("rounded-full px-2 py-0.5 font-medium", map[risk])}>{risk} risk</span>;
}
function Metric({ label, v, bad }: { label: string; v: string; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", bad ? "text-rose-600" : "text-slate-900")}>{v}</p>
    </div>
  );
}
