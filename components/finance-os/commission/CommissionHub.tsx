"use client";

// Commission Hub container — owns all session state so Save Workspace stays
// coherent across the Plan Studio / Run / Statements / Dashboards tabs.

import { useMemo, useState } from "react";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { accentOf } from "@/lib/finance-os/identity";
import { WorkspaceBar } from "@/components/finance-os/WorkspaceBar";
import { FilterProvider, type FilterState } from "@/components/finance-os/dashboard/FilterContext";
import { emptyWorkspace, type Workspace } from "@/lib/finance-os/workspace";
import { newPlan, type CommissionPlan, type CommissionRunResult } from "@/lib/finance-os/commission/types";
import type { AuditRecord } from "@/lib/finance-os/audit";
import type { ColumnMapping, Dataset } from "@/lib/finance-os/types";
import { PlanStudio } from "./PlanStudio";
import { RunPanel } from "./RunPanel";
import { Statements } from "./Statements";
import { Dashboards } from "./Dashboards";

export type HubState = {
  datasets: Dataset[];
  mappings: Record<string, ColumnMapping>;
  plans: CommissionPlan[];
  activePlanId: string;
  results: CommissionRunResult | null;
  filters: FilterState;
  audit: AuditRecord[];
};

const TABS = ["Plan Studio", "Run", "Statements", "Dashboards"] as const;
type Tab = (typeof TABS)[number];

export function CommissionHub() {
  const initialPlan = useMemo(() => newPlan("plan_1"), []);
  const [s, setS] = useState<HubState>({
    datasets: [],
    mappings: {},
    plans: [initialPlan],
    activePlanId: initialPlan.id,
    results: null,
    filters: {},
    audit: [],
  });
  const [tab, setTab] = useState<Tab>("Plan Studio");

  const patch = (p: Partial<HubState>) => setS((prev) => ({ ...prev, ...p }));
  // Functional merge so concurrent auto-maps (sales + targets on the same render)
  // don't clobber each other via stale state.
  const setMapping = (role: string, m: ColumnMapping) =>
    setS((prev) => ({ ...prev, mappings: { ...prev.mappings, [role]: m } }));
  const activePlan = s.plans.find((p) => p.id === s.activePlanId) ?? s.plans[0];

  const getWorkspace = (): Workspace => ({
    ...emptyWorkspace("Commission workspace"),
    datasets: s.datasets,
    mappings: s.mappings,
    plans: s.plans,
    filters: s.filters,
    results: s.results,
    audit: s.audit,
  });

  const onLoad = (ws: Workspace) =>
    setS({
      datasets: ws.datasets ?? [],
      mappings: ws.mappings ?? {},
      plans: ws.plans?.length ? ws.plans : [initialPlan],
      activePlanId: ws.plans?.[0]?.id ?? initialPlan.id,
      results: ws.results ?? null,
      filters: ws.filters ?? {},
      audit: ws.audit ?? [],
    });

  const accent = accentOf("commission");

  return (
    <ModuleScreen
      slug="commission"
      title="Commission Hub"
      actions={<WorkspaceBar getWorkspace={getWorkspace} onLoad={onLoad} />}
    >
      {/* stepper: the commission workflow Plan → Run → Statements → Dashboards */}
      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-xl border border-line bg-white p-1.5">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={
              tab === t
                ? { backgroundColor: `${accent}14`, color: accent }
                : { color: "#64748b" }
            }
          >
            <span
              className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold"
              style={
                tab === t
                  ? { backgroundColor: accent, color: "#fff" }
                  : { backgroundColor: "#e5e7eb", color: "#64748b" }
              }
            >
              {i + 1}
            </span>
            {t}
            {i < TABS.length - 1 && <span className="ml-1 text-muted/50">›</span>}
          </button>
        ))}
      </div>

      {tab === "Plan Studio" && (
        <PlanStudio
          plans={s.plans}
          activePlanId={s.activePlanId}
          onSelect={(id) => patch({ activePlanId: id })}
          onChange={(plans) => patch({ plans })}
        />
      )}

      {tab === "Run" && (
        <RunPanel
          state={s}
          plan={activePlan}
          onState={patch}
          onMapping={setMapping}
          onResults={(results, audit) => {
            patch({ results, audit: [audit, ...s.audit] });
            setTab("Statements");
          }}
        />
      )}

      {tab === "Statements" && <Statements results={s.results} plan={activePlan} audit={s.audit} />}

      {tab === "Dashboards" && (
        <FilterProvider value={s.filters} onChange={(filters) => patch({ filters })}>
          <Dashboards results={s.results} />
        </FilterProvider>
      )}
    </ModuleScreen>
  );
}
