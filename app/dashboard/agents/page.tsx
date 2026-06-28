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

type Filter = "all" | AgentCategory;

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
