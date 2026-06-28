"use client";

/* ============================================================================
   Strategy Center (Investment Hub Phase 12).
   ----------------------------------------------------------------------------
   Create, test, save and manage investment/trading strategies — the decision
   engine. NOT a broker, NOT auto-trading. Every condition is explicit and
   visible; AI only explains, never adds hidden rules. Tests evaluate against
   normalized market data from the Investment Intelligence Agent (Tool Runtime).
   ========================================================================== */

import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { StrategyStoreProvider, useStrategyStore } from "@/components/investments/strategy/store";
import { TEMPLATE_SUMMARIES, strategyFromTemplate, newConditionId } from "@/lib/investments/strategy/templates";
import {
  STRATEGY_FACTORS,
  OPERATORS,
  REVIEW_FREQUENCIES,
  metricsForFactor,
  metricDef,
  type Strategy,
  type Condition,
  type ConditionKind,
  type StrategyFactor,
} from "@/lib/investments/strategy/types";
import { evaluateStrategy, type StrategyEvaluation, type ConditionResult } from "@/lib/investments/strategy/evaluate";

export default function StrategyCenterPage() {
  return (
    <StrategyStoreProvider>
      <PageShell
        title="Strategy Center"
        subtitle="Create, test and manage investment strategies — the decision engine. Not a broker. Not auto-trading."
        action={
          <Link href="/dashboard/investments" className="text-sm font-medium text-brand hover:underline">
            ← Investments
          </Link>
        }
      >
        <Inner />
      </PageShell>
    </StrategyStoreProvider>
  );
}

function Inner() {
  const store = useStrategyStore();
  return (
    <div className="space-y-6">
      <TemplateGallery />
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <SavedList />
        {store.active ? <Editor key={store.active.id} strategy={store.active} /> : (
          <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-surface-2 p-10 text-sm text-muted">
            Pick a template or a saved strategy to edit.
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateGallery() {
  const store = useStrategyStore();
  return (
    <section>
      <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Templates</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {TEMPLATE_SUMMARIES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => store.upsert(strategyFromTemplate(t.key))}
            className="rounded-xl border border-line bg-surface-2 p-3 text-left transition-colors hover:border-brand/40"
          >
            <p className="text-[13px] font-semibold text-ink">{t.key}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted">{t.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function SavedList() {
  const store = useStrategyStore();
  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-3">
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Saved ({store.strategies.length})</p>
      {store.strategies.length === 0 ? (
        <p className="text-[13px] text-muted">No saved strategies yet.</p>
      ) : (
        <ul className="space-y-1">
          {store.strategies.map((s) => (
            <li key={s.id} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${store.activeId === s.id ? "bg-brand/[0.10]" : "hover:bg-surface"}`}>
              <button type="button" onClick={() => store.setActiveId(s.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-[13px] font-medium text-ink">{s.name}</p>
                <p className="truncate text-[11px] text-muted">{s.template}</p>
              </button>
              <button type="button" onClick={() => store.remove(s.id)} className="text-[11px] text-muted hover:text-red-600">✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Editor({ strategy }: { strategy: Strategy }) {
  const store = useStrategyStore();
  const [draft, setDraft] = useState<Strategy>(strategy);
  useEffect(() => setDraft(strategy), [strategy]);

  const set = <K extends keyof Strategy>(k: K, v: Strategy[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const editCond = (kind: ConditionKind, id: string, patch: Partial<Condition>) =>
    setDraft((d) => ({ ...d, [listKey(kind)]: d[listKey(kind)].map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const addCond = (kind: ConditionKind) =>
    setDraft((d) => ({ ...d, [listKey(kind)]: [...d[listKey(kind)], { id: newConditionId(), factor: "Valuation" as StrategyFactor, metric: "peRatio", operator: "<", value: 0 }] }));
  const removeCond = (kind: ConditionKind, id: string) =>
    setDraft((d) => ({ ...d, [listKey(kind)]: d[listKey(kind)].filter((c) => c.id !== id) }));

  return (
    <section className="space-y-4">
      {/* identity + params */}
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full bg-transparent text-lg font-semibold text-ink outline-none"
        />
        <textarea
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className="mt-1 w-full resize-none rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-brand/40"
        />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumField label="Position size %" value={draft.positionSizePct} onChange={(v) => set("positionSizePct", v)} />
          <NumField label="Max allocation %" value={draft.maxAllocationPct} onChange={(v) => set("maxAllocationPct", v)} />
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-faint">Review</span>
            <select value={draft.reviewFrequency} onChange={(e) => set("reviewFrequency", e.target.value as Strategy["reviewFrequency"])} className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px] text-ink outline-none">
              {REVIEW_FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <NumField label="Confidence %" value={Math.round(draft.confidenceThreshold * 100)} onChange={(v) => set("confidenceThreshold", Math.max(0, Math.min(100, v)) / 100)} />
        </div>
      </div>

      <CondGroup title="Entry Conditions" kind="entry" list={draft.entryConditions} onAdd={addCond} onEdit={editCond} onRemove={removeCond} />
      <CondGroup title="Exit Conditions" kind="exit" list={draft.exitConditions} onAdd={addCond} onEdit={editCond} onRemove={removeCond} />
      <CondGroup title="Risk Rules" kind="risk" list={draft.riskRules} onAdd={addCond} onEdit={editCond} onRemove={removeCond} />

      <div className="flex gap-2">
        <button type="button" onClick={() => store.upsert(draft)} className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
          Save Strategy
        </button>
      </div>

      <TestPanel strategy={draft} />
      <ExplainPanel strategy={draft} />
    </section>
  );
}

function listKey(kind: ConditionKind): "entryConditions" | "exitConditions" | "riskRules" {
  return kind === "entry" ? "entryConditions" : kind === "exit" ? "exitConditions" : "riskRules";
}

function CondGroup({
  title, kind, list, onAdd, onEdit, onRemove,
}: {
  title: string; kind: ConditionKind; list: Condition[];
  onAdd: (k: ConditionKind) => void;
  onEdit: (k: ConditionKind, id: string, patch: Partial<Condition>) => void;
  onRemove: (k: ConditionKind, id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">{title}</p>
        <button type="button" onClick={() => onAdd(kind)} className="text-xs font-medium text-brand hover:underline">+ Add</button>
      </div>
      {list.length === 0 ? (
        <p className="text-[13px] text-muted">No conditions.</p>
      ) : (
        <div className="space-y-2">
          {list.map((c) => <CondRow key={c.id} c={c} onEdit={(p) => onEdit(kind, c.id, p)} onRemove={() => onRemove(kind, c.id)} />)}
        </div>
      )}
    </div>
  );
}

function CondRow({ c, onEdit, onRemove }: { c: Condition; onEdit: (p: Partial<Condition>) => void; onRemove: () => void }) {
  const metrics = metricsForFactor(c.factor);
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface p-2">
      <select
        value={c.factor}
        onChange={(e) => {
          const factor = e.target.value as StrategyFactor;
          const first = metricsForFactor(factor)[0]?.metric ?? "custom";
          onEdit({ factor, metric: first });
        }}
        className="rounded-md border border-line bg-surface-2 px-1.5 py-1 text-[12px] text-ink outline-none"
      >
        {STRATEGY_FACTORS.map((f) => <option key={f}>{f}</option>)}
      </select>
      <select value={c.metric} onChange={(e) => onEdit({ metric: e.target.value })} className="rounded-md border border-line bg-surface-2 px-1.5 py-1 text-[12px] text-ink outline-none">
        {metrics.map((m) => <option key={m.metric} value={m.metric}>{m.label}</option>)}
      </select>
      <select value={c.operator} onChange={(e) => onEdit({ operator: e.target.value as Condition["operator"] })} className="rounded-md border border-line bg-surface-2 px-1.5 py-1 text-[12px] text-ink outline-none">
        {OPERATORS.map((o) => <option key={o}>{o}</option>)}
      </select>
      <input type="number" value={c.value} onChange={(e) => onEdit({ value: Number(e.target.value) })} className="w-20 rounded-md border border-line bg-surface-2 px-1.5 py-1 text-[12px] text-ink outline-none" />
      {c.operator === "between" && (
        <input type="number" value={c.value2 ?? 0} onChange={(e) => onEdit({ value2: Number(e.target.value) })} className="w-20 rounded-md border border-line bg-surface-2 px-1.5 py-1 text-[12px] text-ink outline-none" />
      )}
      {metricDef(c.metric)?.manual && <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">manual</span>}
      <button type="button" onClick={onRemove} className="ml-auto text-[12px] text-muted hover:text-red-600">✕</button>
    </div>
  );
}

function TestPanel({ strategy }: { strategy: Strategy }) {
  const [ticker, setTicker] = useState("");
  const [evalRes, setEvalRes] = useState<StrategyEvaluation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const test = async () => {
    if (!ticker.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/stock?ticker=${encodeURIComponent(ticker.trim())}`).then((r) => r.json());
      if (res.error) throw new Error(res.error);
      setEvalRes(evaluateStrategy(strategy, res.data));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sigColor = (s: string) => (s === "Entry" ? "#10b981" : s === "Exit" ? "#ef4444" : "#94a3b8");

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Test Strategy</p>
      <div className="flex gap-2">
        <input value={ticker} onChange={(e) => setTicker(e.target.value)} onKeyDown={(e) => e.key === "Enter" && test()} placeholder="Ticker… e.g. AAPL, BTC" className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-brand/40" />
        <button type="button" onClick={test} disabled={busy || !ticker.trim()} className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas transition-transform hover:scale-[1.03] disabled:opacity-50">
          {busy ? "Testing…" : "Test"}
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
      {evalRes && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold" style={{ borderColor: `${sigColor(evalRes.signal)}66`, color: sigColor(evalRes.signal) }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: sigColor(evalRes.signal) }} />
              {evalRes.signal}
            </span>
            <span className="text-[12px] text-muted">{evalRes.company} · {Math.round(evalRes.confidence * 100)}% of entry rules met {evalRes.meetsThreshold ? "(≥ threshold)" : "(< threshold)"}</span>
            <span className="font-mono text-[11px] text-faint">{evalRes.dataFreshness}</span>
          </div>
          {evalRes.fromMockData && <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] text-amber-800">⚠ Tested against mock data (no live provider available).</p>}
          <ResultList title="Entry" items={evalRes.entry} />
          <ResultList title="Exit" items={evalRes.exit} />
          <ResultList title="Risk" items={evalRes.risk} />
          <p className="text-[11px] text-faint">Decision engine only — informational, not financial advice.</p>
        </div>
      )}
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: ConditionResult[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</p>
      <ul className="space-y-1">
        {items.map((r) => {
          const color = r.pass == null ? "#94a3b8" : r.pass ? "#10b981" : "#ef4444";
          const md = metricDef(r.condition.metric);
          return (
            <li key={r.condition.id} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="text-ink">
                {md?.label ?? r.condition.metric} {r.condition.operator} {r.condition.value}
                {r.condition.value2 != null ? `..${r.condition.value2}` : ""}
              </span>
              <span className="inline-flex items-center gap-1.5" style={{ color }}>
                <span className="font-mono text-faint">{r.actual == null ? "manual" : r.actual}</span>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                {r.pass == null ? "—" : r.pass ? "pass" : "fail"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ExplainPanel({ strategy }: { strategy: Strategy }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const explain = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/investments/strategy/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      }).then((r) => r.json());
      setText(res.error ? `Error: ${res.error}` : res.explanation);
    } catch (e) {
      setText(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Explain (AI)</p>
        <button type="button" onClick={explain} disabled={busy} className="text-xs font-medium text-brand hover:underline disabled:opacity-50">
          {busy ? "Explaining…" : "Explain this strategy"}
        </button>
      </div>
      {text ? (
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{text}</p>
      ) : (
        <p className="text-[12px] text-muted">AI explains the visible rules only — it never adds hidden conditions.</p>
      )}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand/40" />
    </label>
  );
}
