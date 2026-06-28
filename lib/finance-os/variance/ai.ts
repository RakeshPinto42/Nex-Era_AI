// Variance Studio — AI seam. The model NEVER computes a financial number; it is
// handed the engine's already-computed figures and only narrates: root causes,
// business drivers, risks, recommendations. Reuses the shared Router wrapper.

import { runModel } from "@/lib/finance-os/analytics/ai";
import { fmt, fmtPct } from "./engine";
import type { VarianceResult } from "./types";

export { runModel };

const SYSTEM =
  "You are an enterprise FP&A analyst inside NEXERA Finance OS. You are given variance numbers that are already computed — NEVER recalculate or invent figures, only interpret them. Be precise, concise and decision-useful.";

function numbersBlock(r: VarianceResult): string {
  const d = r.drivers;
  const top = r.lines.filter((l) => l.material).slice(0, 6)
    .map((l) => `${l.line}: ${fmt(l.varAbs, r.currency)} (${fmtPct(l.varPct)})`).join("; ");
  const drv = [
    r.hasQty ? `Price ${fmt(d.price, r.currency)}` : null,
    r.hasQty ? `Volume ${fmt(d.volume, r.currency)}` : null,
    r.hasQty ? `Mix ${fmt(d.mix, r.currency)}` : null,
    r.hasFx ? `FX ${fmt(d.fx, r.currency)}` : null,
    `Other ${fmt(d.other, r.currency)}`,
  ].filter(Boolean).join(", ");
  return `Actual ${fmt(r.totalActual, r.currency)} vs Budget ${fmt(r.totalBudget, r.currency)} → variance ${fmt(r.totalVarAbs, r.currency)} (${fmtPct(r.totalVarPct)}). Drivers: ${drv}. Material lines: ${top || "none"}.`;
}

export function rootCausePrompt(r: VarianceResult): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: `${numbersBlock(r)}\n\nIn 3-5 short bullets, explain the ROOT CAUSES behind this variance — attribute each material line to its dominant driver (price / volume / mix / FX) and the likely business reason. Do not restate the totals.`,
  };
}

export function commentaryPrompt(r: VarianceResult): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: `${numbersBlock(r)}\n\nWrite concise MANAGEMENT COMMENTARY in three labelled sections — **Drivers**, **Risks**, **Recommendations** — 2-3 bullets each, suitable for a monthly business review. Interpret only; never invent numbers.`,
  };
}

// Deterministic executive summary (no AI) — always available.
export function execSummary(r: VarianceResult): string {
  const dir = r.totalVarAbs >= 0 ? "favorable" : "unfavorable";
  const driverRank = Object.entries({ Price: r.drivers.price, Volume: r.drivers.volume, Mix: r.drivers.mix, FX: r.drivers.fx, Other: r.drivers.other })
    .filter(([, v]) => Math.abs(v) > 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])); // largest first
  const lead = driverRank[0];
  const topLine = r.lines.find((l) => l.material);
  const parts = [
    `Actual ${fmt(r.totalActual, r.currency)} came in ${fmt(Math.abs(r.totalVarAbs), r.currency)} (${fmtPct(r.totalVarPct)}) ${dir} versus budget of ${fmt(r.totalBudget, r.currency)}.`,
    lead ? `The variance is led by ${lead[0].toLowerCase()} (${fmt(lead[1], r.currency)}).` : "",
    topLine ? `Largest contributor: ${topLine.line} at ${fmt(topLine.varAbs, r.currency)} (${fmtPct(topLine.varPct)}).` : "",
    `${r.lines.filter((l) => l.material).length} of ${r.lines.length} lines breach the ${r.materialityPct}% materiality threshold.`,
  ];
  return parts.filter(Boolean).join(" ");
}
