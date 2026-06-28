"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useDashboard, modelKey } from "./store";
import { INTENTS, type Intent } from "@/lib/brand/intent";

const CAP_LABEL: Record<string, string> = {
  reasoning: "Reasoning",
  coding: "Code",
  general: "Text",
  research: "Research",
  vision: "Vision",
  images: "Image",
  videos: "Video",
};

function CapChip({ intent }: { intent?: string | null }) {
  const key = intent ?? "general";
  const it = INTENTS[key as Intent] ?? INTENTS.general;
  return (
    <span
      className="rounded-md px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider"
      style={{ background: `rgba(${it.rgb},0.12)`, color: it.hex }}
    >
      {CAP_LABEL[key] ?? key}
    </span>
  );
}

function Card({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        {accent && <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />}
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

export default function RightPanel() {
  const {
    availableModels,
    activeModel,
    setActiveModel,
    modelsLoaded,
    autoRoute,
    setAutoRoute,
    routedModel,
    routedIntent,
    routedConfidence,
    routedReason,
    tokensIn,
    tokensOut,
    agentStatus,
    workflow,
  } = useDashboard();

  const total = tokensIn + tokensOut;
  const limit = 128000;
  const pct = Math.min(100, (total / limit) * 100);
  const conf = routedConfidence != null ? Math.round(routedConfidence * 100) : null;

  return (
    <aside className="hidden h-full w-[320px] flex-none flex-col gap-4 overflow-y-auto border-l border-line bg-surface/60 p-4 backdrop-blur-xl xl:flex">
      {/* ---- Model Router (flagship) ---- */}
      <Card title="Model Router" accent="#3b82f6">
        {availableModels.length === 0 ? (
          <div className="text-sm text-muted">
            {modelsLoaded ? (
              <>
                No models configured.{" "}
                <Link href="/admin" className="font-medium text-brand hover:underline">
                  Add a provider →
                </Link>
              </>
            ) : (
              "Loading models…"
            )}
          </div>
        ) : (
          <>
            <div className="mb-3 flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setAutoRoute(true)}
                className={`flex-1 rounded-md px-2 py-1.5 transition-all ${
                  autoRoute ? "bg-surface text-brand shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                ✦ Auto
              </button>
              <button
                type="button"
                onClick={() => setAutoRoute(false)}
                className={`flex-1 rounded-md px-2 py-1.5 transition-all ${
                  !autoRoute ? "bg-surface text-brand shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                Manual
              </button>
            </div>

            {autoRoute ? (
              <div className="rounded-xl border border-brand/20 bg-gradient-to-br from-brand/[0.10] to-violet/[0.08] p-3">
                {routedModel ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-ink">
                        {routedModel.label}
                      </span>
                      <CapChip intent={routedIntent} />
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">
                      {routedModel.providerName}
                    </p>
                    {conf != null && (
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-muted">
                          <span>Routing confidence</span>
                          <span className="font-mono text-brand">{conf}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-brand to-violet"
                            initial={{ width: 0 }}
                            animate={{ width: `${conf}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    )}
                    {routedReason && (
                      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">{routedReason}</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted">
                    Routes every prompt to the best model — send one to see the pick.
                  </p>
                )}
              </div>
            ) : (
              <select
                value={activeModel ? modelKey(activeModel) : ""}
                onChange={(e) => setActiveModel(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink outline-none focus:border-brand/50"
              >
                {availableModels.map((m) => (
                  <option key={modelKey(m)} value={modelKey(m)}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-3 text-center font-mono text-[10px] text-muted">
              {availableModels.length} models across the network
            </p>
          </>
        )}
      </Card>

      {/* ---- Token Usage ---- */}
      <Card title="Token Usage">
        <div className="flex items-end justify-between">
          <span className="text-2xl font-semibold text-ink">{total.toLocaleString()}</span>
          <span className="font-mono text-xs text-muted">/ {(limit / 1000).toFixed(0)}K</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand to-violet"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="mt-3 flex justify-between font-mono text-xs">
          <span className="text-brand">↑ {tokensIn.toLocaleString()} in</span>
          <span className="text-violet">↓ {tokensOut.toLocaleString()} out</span>
        </div>
      </Card>

      {/* ---- Agents ---- */}
      <Card title="Agents">
        <div className="space-y-2">
          {AGENTS.map((a) => {
            const on = a.key === "coding" && agentStatus === "running";
            return (
              <div
                key={a.key}
                className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                  on ? "border-brand/30 bg-brand/[0.08]" : "border-line bg-surface-2"
                }`}
              >
                <span
                  className="grid h-8 w-8 flex-none place-items-center rounded-lg text-white"
                  style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)` }}
                >
                  {a.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">{a.name}</p>
                  <p className="text-[11px] text-muted">{a.role}</p>
                </div>
                <span className="relative flex h-2 w-2">
                  {on && (
                    <span
                      className="pulse-dot absolute inline-flex h-full w-full rounded-full"
                      style={{ background: a.color }}
                    />
                  )}
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ background: on ? a.color : "#d8ccbe" }}
                  />
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ---- Workflow timeline ---- */}
      <Card title="Workflow">
        <ol className="relative ml-1">
          {workflow.map((step, i) => {
            const done = step.state === "done";
            const activeStep = step.state === "active";
            return (
              <li key={step.label} className="flex gap-3 pb-4 last:pb-0">
                <div className="relative flex flex-col items-center">
                  <motion.span
                    initial={false}
                    animate={{ scale: activeStep ? [1, 1.15, 1] : 1 }}
                    transition={{ repeat: activeStep ? Infinity : 0, duration: 1.4 }}
                    className={`grid h-6 w-6 flex-none place-items-center rounded-full text-[10px] font-semibold ${
                      done
                        ? "bg-brand text-white"
                        : activeStep
                          ? "border-2 border-brand bg-brand/10 text-brand"
                          : "border border-line bg-surface-2 text-muted"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </motion.span>
                  {i < workflow.length - 1 && (
                    <span className={`mt-1 w-px flex-1 ${done ? "bg-brand/30" : "bg-surface-3"}`} />
                  )}
                </div>
                <span
                  className={`pt-0.5 text-[13px] ${
                    step.state === "pending" ? "text-muted" : "font-medium text-ink"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>
    </aside>
  );
}

const AGENTS = [
  { key: "coding", name: "Coding Agent", role: "Plans, writes & ships code", color: "#3b82f6", icon: <IconCode /> },
  { key: "research", name: "Research Agent", role: "Crawls & cites sources", color: "#8b5cf6", icon: <IconSearch /> },
  { key: "finance", name: "Finance OS", role: "Pricing, forecast & commissions", color: "#06b6d4", icon: <IconChart /> },
];

function IconCode() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m8 9-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18M7 14l3-3 3 3 5-6" />
    </svg>
  );
}
