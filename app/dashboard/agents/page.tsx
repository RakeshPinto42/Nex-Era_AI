"use client";

/* ============================================================================
   Mission Control — Agent Platform central dashboard (Phase 1A).
   ----------------------------------------------------------------------------
   Reads the Agent Registry (lib/agents/registry) and renders the fleet:
   categories, runtime status, health, last activity, version, capabilities,
   and an enable/disable toggle. No chat UI, no execution, no orchestration —
   the enable toggle is local view state only.
   ========================================================================== */

import { useMemo, useState } from "react";
import Link from "next/link";
import PageShell, { GridReveal, Reveal } from "@/components/dashboard/PageShell";
import {
  AGENT_REGISTRY,
  populatedCategories,
  type AgentCategory,
  type AgentRegistration,
} from "@/lib/agents/registry";
import {
  RUNTIME_META,
  HEALTH_META,
  VISIBILITY_META,
  isActiveState,
} from "@/lib/agents/runtime";
import { getTool } from "@/lib/tools/registry";
import { planGoal } from "@/lib/hermes/engine";
import {
  EXECUTION_META,
  COMPLEXITY_META,
  type ExecutionPlan,
  type PlanStep,
} from "@/lib/hermes/plan";
import { AI_CAPABILITY_META } from "@/lib/hermes/capabilities";
import {
  executeRun,
  type ExecutionRun,
  type StepRun,
  type StepRunStatus,
} from "@/lib/hermes/execution";

type Filter = "all" | AgentCategory;

/** Implemented agents with a dedicated console. */
const AGENT_CONSOLES: Record<string, string> = {
  file: "/dashboard/agents/file",
  finance: "/dashboard/agents/finance",
  commentary: "/dashboard/agents/commentary",
  market: "/dashboard/agents/stock",
  scanner: "/dashboard/investments/scanner",
};

export default function MissionControlPage() {
  const categories = useMemo(() => populatedCategories(), []);
  const [filter, setFilter] = useState<Filter>("all");

  // Local-only enable/disable state, seeded from the registry. No persistence.
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(AGENT_REGISTRY.map((a) => [a.id, a.enabled])),
  );
  const toggle = (id: string) =>
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  const visible = useMemo(
    () =>
      filter === "all"
        ? AGENT_REGISTRY
        : AGENT_REGISTRY.filter((a) => a.category === filter),
    [filter],
  );

  const total = AGENT_REGISTRY.length;
  const active = AGENT_REGISTRY.filter((a) => isActiveState(a.status)).length;
  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <PageShell
      title="Mission Control"
      subtitle="Central dashboard for the Agent Platform — every registered agent, at a glance."
    >
      {/* ---- Hermes orchestration console ---- */}
      <HermesConsole />

      {/* ---- Summary ribbon ---- */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Registered" value={total} />
        <Stat label="Categories" value={categories.length} />
        <Stat label="Active now" value={active} />
        <Stat label="Enabled" value={`${enabledCount} / ${total}`} />
      </div>

      {/* ---- Category filter ---- */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {/* ---- Fleet grid ---- */}
      <GridReveal>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              enabled={enabled[a.id]}
              onToggle={() => toggle(a.id)}
            />
          ))}
        </div>
      </GridReveal>

      {/* ---- Runtime legend ---- */}
      <RuntimeLegend />
    </PageShell>
  );
}

/* -------------------------- Hermes orchestration ------------------------- */

function HermesConsole() {
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [executing, setExecuting] = useState(false);

  const submit = () => {
    if (!goal.trim()) return;
    setRun(null);
    setPlan(planGoal(goal.trim()));
  };

  const execute = async () => {
    if (!plan) return;
    setExecuting(true);
    setRun(null);
    try {
      await executeRun(plan, { files }, setRun);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-line bg-gradient-to-br from-brand/[0.06] to-violet/[0.05] p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/15 text-sm">🪽</span>
        <div>
          <p className="text-sm font-semibold text-ink">Hermes</p>
          <p className="text-[11px] text-muted">
            OS scheduler — give a goal, Hermes plans it across agents + tools. No execution yet.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Describe a goal… e.g. Forecast Q3 revenue and explain the variance"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none focus:border-brand/50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!goal.trim()}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
        >
          Plan
        </button>
      </div>

      {plan && <PlanView plan={plan} />}

      {plan && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <label className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-muted hover:text-ink">
            {files.length ? `${files.length} file(s) attached` : "Attach files (optional)"}
            <input
              type="file"
              multiple
              hidden
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          <button
            type="button"
            onClick={execute}
            disabled={executing}
            className="rounded-lg bg-ink px-5 py-2 text-sm font-semibold text-canvas transition-transform hover:scale-[1.03] disabled:opacity-50"
          >
            {executing ? "Executing…" : "▶ Execute Plan"}
          </button>
          <span className="text-[11px] text-faint">Hermes runs implemented agents; others are skipped.</span>
        </div>
      )}

      {run && <ExecutionView run={run} />}
    </section>
  );
}

const RUN_COLOR: Record<StepRunStatus, string> = {
  pending: "#94a3b8",
  running: "#0ea5e9",
  waiting: "#f59e0b",
  completed: "#10b981",
  failed: "#ef4444",
  skipped: "#6b7280",
  cancelled: "#6b7280",
};

function ExecutionView({ run }: { run: ExecutionRun }) {
  const total = run.steps.length;
  const done = run.steps.filter((s) => s.status === "completed").length;
  const failed = run.steps.filter((s) => s.status === "failed").length;
  const skipped = run.steps.filter((s) => s.status === "skipped").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const current = run.steps.find((s) => s.status === "running" || s.status === "waiting");
  const elapsed =
    run.startedAt != null
      ? Math.max(0, +new Date(run.endedAt ?? new Date().toISOString()) - +new Date(run.startedAt))
      : 0;

  const runColor =
    run.status === "completed" ? "#10b981" : run.status === "failed" ? "#ef4444" : "#0ea5e9";

  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4">
      {/* run header */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
        <Pill color={runColor}>{run.status}</Pill>
        <span className="text-[12px] text-muted">
          {done}/{total} done{failed ? ` · ${failed} failed` : ""}{skipped ? ` · ${skipped} skipped` : ""}
        </span>
        <span className="font-mono text-[11px] text-faint">{(elapsed / 1000).toFixed(1)}s</span>
        <div className="ml-auto h-1.5 w-32 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: runColor }} />
        </div>
      </div>

      {/* current execution */}
      <div className="rounded-xl border border-line bg-surface p-3">
        <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          Current Execution
        </p>
        {current ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="inline-flex h-2 w-2 rounded-full pulse-dot" style={{ background: RUN_COLOR[current.status] }} />
            <span className="font-medium text-ink">{current.title}</span>
            {current.agentName && <span className="text-muted">→ {current.agentName}</span>}
            {current.runningTool && <span className="font-mono text-[11px] text-faint">🔧 {current.runningTool}</span>}
            <span className="font-mono text-[11px] text-muted">{EXEC_LABEL[current.status]}</span>
          </div>
        ) : (
          <p className="text-[13px] text-muted">{run.status === "running" ? "Starting…" : "No step running."}</p>
        )}
      </div>

      {/* steps */}
      <ol className="space-y-1.5">
        {run.steps.map((s, i) => (
          <RunStepRow key={s.stepId} step={s} index={i} />
        ))}
      </ol>

      {/* execution log */}
      <div className="rounded-xl border border-line bg-surface p-3">
        <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          Execution Log
        </p>
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {run.events.map((e) => (
            <li key={e.id} className="flex items-start gap-2 text-[12px]">
              <span className="flex-none font-mono text-[10px] text-faint">
                {new Date(e.at).toLocaleTimeString()}
              </span>
              <span className="text-ink">{e.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const EXEC_LABEL: Record<StepRunStatus, string> = {
  pending: "Pending",
  running: "Running",
  waiting: "Waiting",
  completed: "Completed",
  failed: "Failed",
  skipped: "Skipped",
  cancelled: "Cancelled",
};

function RunStepRow({ step, index }: { step: StepRun; index: number }) {
  const color = RUN_COLOR[step.status];
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
      <span className="grid h-5 w-5 flex-none place-items-center rounded-full border border-line text-[10px] font-semibold text-muted">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{step.title}</span>
      {step.agentName && <span className="hidden text-[11px] text-muted sm:inline">{step.agentName}</span>}
      {step.durationMs != null && (
        <span className="font-mono text-[10px] text-faint">{(step.durationMs / 1000).toFixed(1)}s</span>
      )}
      <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {EXEC_LABEL[step.status]}
      </span>
    </li>
  );
}

function PlanView({ plan }: { plan: ExecutionPlan }) {
  const cx = COMPLEXITY_META[plan.complexity];
  const st = EXECUTION_META[plan.status];
  return (
    <div className="mt-4 space-y-4">
      {/* plan header */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-3">
        <span className="text-sm font-medium text-ink">{plan.intent}</span>
        <Pill color={st.color}>{st.label}</Pill>
        <Pill color={cx.color}>Complexity: {cx.label}</Pill>
        <span className="text-[11px] text-muted">{plan.summary}</span>
      </div>

      {/* requested capabilities */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium text-muted">Requested capabilities:</span>
        {plan.capabilities.map((c) => (
          <span
            key={c}
            title={AI_CAPABILITY_META[c]?.desc}
            className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted"
          >
            {AI_CAPABILITY_META[c]?.label ?? c}
          </span>
        ))}
        <span className="ml-1 text-[10px] text-faint">(Router selects the model)</span>
      </div>

      {/* steps */}
      <ol className="space-y-2">
        {plan.steps.map((s, i) => (
          <StepRow key={s.id} step={s} index={i} />
        ))}
      </ol>

      {/* timeline */}
      <div className="rounded-xl border border-line bg-surface p-3">
        <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          Execution timeline
        </p>
        <ol className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted">
          {plan.timeline.map((e, i) => (
            <li key={e.id} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="text-faint">→</span>}
              <span className="text-ink">{e.label}</span>
              {e.detail && <span className="text-faint">({e.detail})</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function StepRow({ step, index }: { step: PlanStep; index: number }) {
  const st = EXECUTION_META[step.status];
  return (
    <li className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-start gap-3">
        <span className="grid h-6 w-6 flex-none place-items-center rounded-full border border-line text-[11px] font-semibold text-muted">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">{step.title}</span>
            <Pill color={st.color}>{st.label}</Pill>
            {step.assignedAgentName ? (
              <span className="text-[11px] text-muted">→ {step.assignedAgentName}</span>
            ) : (
              <span className="text-[11px] text-faint">→ no agent matched</span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-faint">{step.description}</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {step.requiredCapabilities.map((c) => (
              <span key={c} className="rounded-md bg-brand/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-brand">
                {AI_CAPABILITY_META[c]?.label ?? c}
              </span>
            ))}
            {step.requiredTools.map((t) => (
              <span key={t} className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                🔧 {getTool(t)?.name ?? t}
              </span>
            ))}
            {step.outputs.map((o) => (
              <span key={o} className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">
                ⤷ {o}
              </span>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ borderColor: `${color}55`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-brand/40 bg-brand/[0.10] text-brand"
          : "border-line text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function AgentCard({
  agent,
  enabled,
  onToggle,
}: {
  agent: AgentRegistration;
  enabled: boolean;
  onToggle: () => void;
}) {
  const rt = RUNTIME_META[agent.status];
  const health = HEALTH_META[agent.health];
  const active = isActiveState(agent.status);

  return (
    <Reveal className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 p-5">
      {/* header: icon + runtime pill */}
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-line bg-surface text-lg">
          {agent.icon}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
          style={{ borderColor: `${rt.color}55`, color: rt.color }}
          title={rt.desc}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${active ? "pulse-dot" : ""}`}
            style={{ background: rt.color }}
          />
          {rt.label}
        </span>
      </div>

      {/* identity */}
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-ink">{agent.name}</h3>
          <span className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">
            v{agent.version}
          </span>
        </div>
        <p className="mt-1 text-sm text-faint">{agent.description}</p>
      </div>

      {/* meta row: category · health · visibility */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="rounded-md border border-line px-1.5 py-0.5">{agent.category}</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: health.color }} />
          {health.label}
        </span>
        <span>{VISIBILITY_META[agent.visibility].label}</span>
      </div>

      {/* capabilities */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {agent.capabilities.map((c) => (
          <span
            key={c}
            className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted"
          >
            {c}
          </span>
        ))}
      </div>

      {/* implemented agents expose a console link */}
      {AGENT_CONSOLES[agent.id] && (
        <Link
          href={AGENT_CONSOLES[agent.id]}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          Open {agent.name} →
        </Link>
      )}

      {/* footer: last activity + enable toggle */}
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="font-mono text-[11px] text-faint">
          {agent.lastActivityAt
            ? new Date(agent.lastActivityAt).toLocaleString()
            : "No activity yet"}
        </span>
        <button
          type="button"
          onClick={onToggle}
          role="switch"
          aria-checked={enabled}
          aria-label={`${enabled ? "Disable" : "Enable"} ${agent.name}`}
          className={`relative h-5 w-9 flex-none rounded-full transition-colors ${
            enabled ? "bg-brand" : "bg-surface-3"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </Reveal>
  );
}

function RuntimeLegend() {
  return (
    <div className="mt-8 rounded-2xl border border-line bg-surface-2 p-4">
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
        Runtime lifecycle
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {Object.values(RUNTIME_META).map((m) => (
          <span key={m.label} className="inline-flex items-center gap-1.5 text-xs text-muted" title={m.desc}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
