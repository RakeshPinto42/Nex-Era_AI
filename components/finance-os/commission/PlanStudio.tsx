"use client";

import {
  BASES,
  MODIFIER_KINDS,
  newPlan,
  type CommissionBasis,
  type CommissionPlan,
  type ComponentBasis,
  type Modifier,
  type ModifierKind,
  type PlanComponent,
  type Slab,
  type SlabType,
} from "@/lib/finance-os/commission/types";
import { uid } from "@/lib/utils";

const input =
  "w-full rounded-lg border border-fos-border bg-fos-surface px-2.5 py-1.5 text-sm text-fos-text outline-none focus:border-brand-600/40";
const label = "mb-1 block text-xs font-medium text-fos-text";
const card = "rounded-2xl border border-fos-border bg-fos-surface p-5";

export function PlanStudio({
  plans,
  activePlanId,
  onSelect,
  onChange,
}: {
  plans: CommissionPlan[];
  activePlanId: string;
  onSelect: (id: string) => void;
  onChange: (plans: CommissionPlan[]) => void;
}) {
  const plan = plans.find((p) => p.id === activePlanId) ?? plans[0];

  const update = (fn: (p: CommissionPlan) => CommissionPlan) =>
    onChange(plans.map((p) => (p.id === plan.id ? { ...fn(p), updatedAt: Date.now() } : p)));

  const addPlan = () => {
    const np = newPlan(uid("plan"), `Plan ${plans.length + 1}`);
    onChange([...plans, np]);
    onSelect(np.id);
  };

  const duplicateVersion = () => {
    const np: CommissionPlan = {
      ...structuredClone(plan),
      id: uid("plan"),
      name: `${plan.name} v${plan.version + 1}`,
      version: plan.version + 1,
      updatedAt: Date.now(),
    };
    onChange([...plans, np]);
    onSelect(np.id);
  };

  const removePlan = () => {
    if (plans.length === 1) return;
    const rest = plans.filter((p) => p.id !== plan.id);
    onChange(rest);
    onSelect(rest[0].id);
  };

  // basis change: keep one component for non-hybrid; ensure >=1 for hybrid
  const setBasis = (basis: CommissionBasis) =>
    update((p) => {
      if (basis === "hybrid") {
        return { ...p, basis, components: p.components.length ? p.components : [makeComponent("revenue")] };
      }
      const first = p.components[0] ?? makeComponent(basis);
      return { ...p, basis, components: [{ ...first, basis: basis as ComponentBasis, weight: 1 }] };
    });

  const setComponents = (components: PlanComponent[]) => update((p) => ({ ...p, components }));
  const setModifiers = (modifiers: Modifier[]) => update((p) => ({ ...p, modifiers }));

  return (
    <div className="space-y-5">
      {/* plan selector */}
      <div className="flex flex-wrap items-center gap-2">
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              p.id === plan.id ? "border-brand-600 bg-brand-50 text-brand-600" : "border-fos-border text-fos-text hover:bg-fos-surface2"
            }`}
          >
            {p.name}
            <span className="ml-1.5 font-mono text-[10px] text-fos-muted">v{p.version}</span>
          </button>
        ))}
        <button onClick={addPlan} className="rounded-lg border border-dashed border-fos-border px-3 py-1.5 text-sm text-fos-muted hover:text-fos-text">
          + New plan
        </button>
      </div>

      {/* plan settings */}
      <div className={card}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={label}>Plan name</label>
            <input className={input} value={plan.name} onChange={(e) => update((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className={label}>Basis</label>
            <select className={input} value={plan.basis} onChange={(e) => setBasis(e.target.value as CommissionBasis)}>
              {BASES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Effective from</label>
            <input
              type="date"
              className={input}
              value={plan.effectiveFrom ?? ""}
              onChange={(e) => update((p) => ({ ...p, effectiveFrom: e.target.value || null }))}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={duplicateVersion} className="rounded-lg border border-fos-border px-3 py-1.5 text-xs text-fos-text hover:bg-fos-surface2">
            Save as new version
          </button>
          <button
            onClick={removePlan}
            disabled={plans.length === 1}
            className="rounded-lg border border-fos-border px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-40"
          >
            Delete plan
          </button>
        </div>
      </div>

      {/* components */}
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fos-text">
            {plan.basis === "hybrid" ? "Components (weighted)" : "Slab schedule"}
          </h3>
          {plan.basis === "hybrid" && (
            <button
              onClick={() => setComponents([...plan.components, makeComponent("revenue")])}
              className="rounded-lg border border-dashed border-fos-border px-2.5 py-1 text-xs text-fos-muted hover:text-fos-text"
            >
              + Component
            </button>
          )}
        </div>
        <div className="space-y-4">
          {plan.components.map((c, ci) => (
            <ComponentEditor
              key={c.id}
              component={c}
              hybrid={plan.basis === "hybrid"}
              onChange={(nc) => setComponents(plan.components.map((x) => (x.id === c.id ? nc : x)))}
              onRemove={plan.basis === "hybrid" && plan.components.length > 1 ? () => setComponents(plan.components.filter((_, i) => i !== ci)) : undefined}
            />
          ))}
        </div>
      </div>

      {/* modifiers */}
      <div className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fos-text">Modifiers</h3>
          <select
            className="rounded-lg border border-fos-border bg-fos-surface px-2.5 py-1 text-xs text-fos-text"
            value=""
            onChange={(e) => {
              if (e.target.value) setModifiers([...plan.modifiers, makeModifier(e.target.value as ModifierKind)]);
            }}
          >
            <option value="">+ Add modifier…</option>
            {MODIFIER_KINDS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {plan.modifiers.length === 0 && <p className="text-xs text-fos-muted">No modifiers. Plan pays the base schedule only.</p>}
        <div className="space-y-3">
          {plan.modifiers.map((m) => (
            <ModifierEditor
              key={m.id}
              modifier={m}
              onChange={(nm) => setModifiers(plan.modifiers.map((x) => (x.id === m.id ? nm : x)))}
              onRemove={() => setModifiers(plan.modifiers.filter((x) => x.id !== m.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- component + slab editing ----

function makeComponent(basis: ComponentBasis): PlanComponent {
  return {
    id: uid("c"),
    label: BASES.find((b) => b.value === basis)?.label ?? basis,
    basis,
    weight: 1,
    schedule: { type: "tiered", slabs: [{ upTo: 100000, rate: 5 }, { upTo: null, rate: 10 }] },
  };
}

function ComponentEditor({
  component,
  hybrid,
  onChange,
  onRemove,
}: {
  component: PlanComponent;
  hybrid: boolean;
  onChange: (c: PlanComponent) => void;
  onRemove?: () => void;
}) {
  const setSlab = (i: number, slab: Slab) =>
    onChange({ ...component, schedule: { ...component.schedule, slabs: component.schedule.slabs.map((s, j) => (j === i ? slab : s)) } });
  const addSlab = () =>
    onChange({ ...component, schedule: { ...component.schedule, slabs: [...component.schedule.slabs, { upTo: null, rate: 0 }] } });
  const removeSlab = (i: number) =>
    onChange({ ...component, schedule: { ...component.schedule, slabs: component.schedule.slabs.filter((_, j) => j !== i) } });
  const move = (i: number, dir: -1 | 1) => {
    const slabs = [...component.schedule.slabs];
    const j = i + dir;
    if (j < 0 || j >= slabs.length) return;
    [slabs[i], slabs[j]] = [slabs[j], slabs[i]];
    onChange({ ...component, schedule: { ...component.schedule, slabs } });
  };

  return (
    <div className="rounded-xl border border-fos-border bg-fos-surface2 p-4">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        {hybrid && (
          <>
            <div>
              <label className={label}>Component basis</label>
              <select
                className={input}
                value={component.basis}
                onChange={(e) => onChange({ ...component, basis: e.target.value as ComponentBasis })}
              >
                {BASES.filter((b) => b.value !== "hybrid").map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className={label}>Weight</label>
              <input
                type="number"
                step="0.1"
                className={input}
                value={component.weight}
                onChange={(e) => onChange({ ...component, weight: Number(e.target.value) })}
              />
            </div>
          </>
        )}
        <div>
          <label className={label}>Slab type</label>
          <select
            className={input}
            value={component.schedule.type}
            onChange={(e) => onChange({ ...component, schedule: { ...component.schedule, type: e.target.value as SlabType } })}
          >
            <option value="tiered">Tiered (marginal)</option>
            <option value="progressive">Progressive (whole)</option>
          </select>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="ml-auto rounded-lg border border-fos-border px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50">
            Remove component
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-fos-muted">
            <th className="pb-1">Up to (blank = ∞)</th>
            <th className="pb-1">Rate %</th>
            <th className="pb-1" />
          </tr>
        </thead>
        <tbody>
          {component.schedule.slabs.map((s, i) => (
            <tr key={i}>
              <td className="py-1 pr-2">
                <input
                  type="number"
                  className={input}
                  value={s.upTo ?? ""}
                  placeholder="∞"
                  onChange={(e) => setSlab(i, { ...s, upTo: e.target.value === "" ? null : Number(e.target.value) })}
                />
              </td>
              <td className="py-1 pr-2">
                <input type="number" step="0.1" className={input} value={s.rate} onChange={(e) => setSlab(i, { ...s, rate: Number(e.target.value) })} />
              </td>
              <td className="py-1 text-right text-fos-muted">
                <button onClick={() => move(i, -1)} className="px-1 hover:text-fos-text">↑</button>
                <button onClick={() => move(i, 1)} className="px-1 hover:text-fos-text">↓</button>
                <button onClick={() => removeSlab(i)} className="px-1 hover:text-rose-600">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addSlab} className="mt-2 rounded-lg border border-dashed border-fos-border px-2.5 py-1 text-xs text-fos-muted hover:text-fos-text">
        + Slab
      </button>
    </div>
  );
}

// ---- modifier editing ----

function makeModifier(kind: ModifierKind): Modifier {
  const base = { id: uid("m"), label: MODIFIER_KINDS.find((k) => k.value === kind)!.label };
  switch (kind) {
    case "accelerator":
      return { ...base, kind, aboveAttainmentPct: 100, rate: 5 };
    case "decelerator":
      return { ...base, kind, belowAttainmentPct: 80, factor: 0.5 };
    case "bonus":
      return { ...base, kind, minAttainmentPct: 100, amount: 1000 };
    case "spiff":
      return { ...base, kind, amount: 0, perUnit: 0 };
    case "clawback":
      return { ...base, kind, belowAttainmentPct: 70, rate: 50 };
    case "manualAdjustment":
      return { ...base, kind, rep: "", amount: 0 };
  }
}

function num(label_: string, value: number, on: (n: number) => void, step = "1") {
  return (
    <div className="w-32">
      <label className={label}>{label_}</label>
      <input type="number" step={step} className={input} value={value} onChange={(e) => on(Number(e.target.value))} />
    </div>
  );
}

function ModifierEditor({
  modifier,
  onChange,
  onRemove,
}: {
  modifier: Modifier;
  onChange: (m: Modifier) => void;
  onRemove: () => void;
}) {
  const m = modifier;
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-fos-border bg-fos-surface2 p-3">
      <div className="flex-1">
        <label className={label}>Label</label>
        <input className={input} value={m.label} onChange={(e) => onChange({ ...m, label: e.target.value })} />
      </div>
      {m.kind === "accelerator" && (
        <>
          {num("Above attain %", m.aboveAttainmentPct, (v) => onChange({ ...m, aboveAttainmentPct: v }))}
          {num("Extra rate %", m.rate, (v) => onChange({ ...m, rate: v }), "0.1")}
        </>
      )}
      {m.kind === "decelerator" && (
        <>
          {num("Below attain %", m.belowAttainmentPct, (v) => onChange({ ...m, belowAttainmentPct: v }))}
          {num("Payout factor", m.factor, (v) => onChange({ ...m, factor: v }), "0.05")}
        </>
      )}
      {m.kind === "bonus" && (
        <>
          {num("Min attain %", m.minAttainmentPct, (v) => onChange({ ...m, minAttainmentPct: v }))}
          {num("Amount", m.amount, (v) => onChange({ ...m, amount: v }))}
        </>
      )}
      {m.kind === "spiff" && (
        <>
          {num("Flat amount", m.amount, (v) => onChange({ ...m, amount: v }))}
          {num("Per unit", m.perUnit ?? 0, (v) => onChange({ ...m, perUnit: v }), "0.1")}
        </>
      )}
      {m.kind === "clawback" && (
        <>
          {num("Below attain %", m.belowAttainmentPct, (v) => onChange({ ...m, belowAttainmentPct: v }))}
          {num("Claw rate %", m.rate, (v) => onChange({ ...m, rate: v }))}
        </>
      )}
      {m.kind === "manualAdjustment" && (
        <>
          <div className="w-36">
            <label className={label}>Rep (blank = all)</label>
            <input className={input} value={m.rep ?? ""} onChange={(e) => onChange({ ...m, rep: e.target.value })} />
          </div>
          {num("Amount", m.amount, (v) => onChange({ ...m, amount: v }))}
        </>
      )}
      <span className="rounded-full bg-fos-surface px-2 py-0.5 font-mono text-[10px] uppercase text-fos-muted">{m.kind}</span>
      <button onClick={onRemove} className="rounded-lg border border-fos-border px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50">
        ✕
      </button>
    </div>
  );
}
