// Variance Studio — the deterministic FP&A engine. ALL financial numbers are
// computed here (exact, instant, offline). AI never touches these.
//
// Decomposition (standard rate / volume / mix), exact when quantity is present:
//   Price  = Σ (Pa_i − Pb_i)·Qa_i            where P = Value/Qty per line
//   VolEff = Σ (Qa_i − Qb_i)·Pb_i
//   PureVolume = (ΣQa − ΣQb) · (ΣVb / ΣQb)   (total volume change at budget price)
//   Mix    = VolEff − PureVolume             (composition shift)
//   ⇒ Price + PureVolume + Mix = Actual − Budget   (identity, no FX)
//   FX     = Actual · (1 − rateB/rateA)      (currency translation, when rates given)
//   Other  = TotalVar − Price − PureVolume − Mix − FX   (residual / unexplained)

import type { Table } from "@/lib/finance-os/analytics/types";
import { parseNumber } from "@/lib/finance-os/analytics/profile";
import type { BridgeStep, Drivers, LineVariance, ScenarioData, VarianceInputs, VarianceResult } from "./types";

type Agg = Map<string, { value: number; qty: number }>;

function colIndex(t: Table, name: string): number {
  return t.columns.find((c) => c.name === name)?.index ?? -1;
}

function aggregate(t: Table, lineCol: string, valueCol: string, qtyCol?: string): Agg {
  const li = colIndex(t, lineCol), vi = colIndex(t, valueCol), qi = qtyCol ? colIndex(t, qtyCol) : -1;
  const map: Agg = new Map();
  if (li < 0 || vi < 0) return map;
  for (const r of t.rows) {
    const key = (r[li] ?? "").trim() || "—";
    const cur = map.get(key) ?? { value: 0, qty: 0 };
    cur.value += parseNumber(r[vi] ?? "") ?? 0;
    if (qi >= 0) cur.qty += parseNumber(r[qi] ?? "") ?? 0;
    map.set(key, cur);
  }
  return map;
}

function avgRate(t: Table, rateCol: string): number {
  const ri = colIndex(t, rateCol);
  if (ri < 0) return 0;
  const vals = t.rows.map((r) => parseNumber(r[ri] ?? "")).filter((n): n is number => n != null && n !== 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

const div = (a: number, b: number) => (b ? a / b : 0);

export function computeVariance(
  budget: ScenarioData,
  actual: ScenarioData,
  forecast: ScenarioData | null,
  inputs: VarianceInputs,
  materialityPct: number,
  currency: string | null,
): VarianceResult {
  const B = aggregate(budget.table, inputs.line, inputs.value, inputs.qty);
  const A = aggregate(actual.table, inputs.line, inputs.value, inputs.qty);
  const F = forecast ? aggregate(forecast.table, inputs.line, inputs.value, inputs.qty) : null;

  const keys = [...new Set([...B.keys(), ...A.keys()])].sort();
  const hasQty = !!inputs.qty && [...A.values()].some((v) => v.qty > 0);

  let totalBudget = 0, totalActual = 0, totalForecast = 0;
  let totalQb = 0, totalQa = 0;
  let price = 0, volEff = 0;
  const lines: LineVariance[] = [];

  for (const k of keys) {
    const b = B.get(k) ?? { value: 0, qty: 0 };
    const a = A.get(k) ?? { value: 0, qty: 0 };
    const f = F?.get(k) ?? null;
    totalBudget += b.value; totalActual += a.value; totalForecast += f?.value ?? 0;
    totalQb += b.qty; totalQa += a.qty;

    let pEff = 0, vEff = 0;
    if (hasQty) {
      const Pb = div(b.value, b.qty), Pa = div(a.value, a.qty);
      pEff = (Pa - Pb) * a.qty;
      vEff = (a.qty - b.qty) * Pb;
      price += pEff; volEff += vEff;
    }

    const varAbs = a.value - b.value;
    const varPct = b.value ? (varAbs / Math.abs(b.value)) * 100 : 0;
    lines.push({
      line: k, budget: b.value, forecast: f ? f.value : null, actual: a.value,
      varAbs, varPct, material: false, price: pEff, volume: vEff,
    });
  }

  const totalVarAbs = totalActual - totalBudget;
  const totalVarPct = totalBudget ? (totalVarAbs / Math.abs(totalBudget)) * 100 : 0;

  // mix / pure-volume split
  const pureVolume = hasQty ? (totalQa - totalQb) * div(totalBudget, totalQb) : 0;
  const mix = hasQty ? volEff - pureVolume : 0;

  // optional FX translation effect
  let fx = 0;
  const hasFx = !!inputs.fxRate;
  if (hasFx) {
    const rB = avgRate(budget.table, inputs.fxRate!);
    const rA = avgRate(actual.table, inputs.fxRate!);
    if (rA) fx = totalActual * (1 - rB / rA);
  }

  const explained = price + pureVolume + mix + fx;
  const other = totalVarAbs - explained;
  const drivers: Drivers = { price, volume: pureVolume, mix, fx, other };

  // materiality flags (relative or ≥2% of total budget)
  const absGate = Math.abs(totalBudget) * 0.02;
  for (const l of lines) l.material = Math.abs(l.varPct) >= materialityPct || Math.abs(l.varAbs) >= absGate;

  // Budget → … → Actual bridge
  const bridge: BridgeStep[] = [{ label: "Budget", value: totalBudget, kind: "start" }];
  const push = (label: string, v: number) => { if (Math.abs(v) > 0.0001) bridge.push({ label, value: v, kind: v >= 0 ? "up" : "down" }); };
  if (hasQty) { push("Price", price); push("Volume", pureVolume); push("Mix", mix); }
  if (hasFx) push("FX", fx);
  push(hasQty ? "Other" : "Net variance", other + (hasQty ? 0 : 0));
  bridge.push({ label: "Actual", value: totalActual, kind: "end" });

  lines.sort((a, b) => Math.abs(b.varAbs) - Math.abs(a.varAbs));

  return {
    inputs, totalBudget, totalForecast: forecast ? totalForecast : null, totalActual,
    totalVarAbs, totalVarPct, lines, drivers, bridge, hasQty, hasFx, materialityPct, currency,
  };
}

// ---- presentation helpers ----
export function fmt(v: number, currency: string | null): string {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  const s = a >= 1000 ? a.toLocaleString(undefined, { maximumFractionDigits: 0 }) : a.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${sign}${currency ?? "$"}${s}`;
}
export function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}
