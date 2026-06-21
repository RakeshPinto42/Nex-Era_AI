"use client";

// Margin Optimizer — pick (or edit) a SKU, see the optimal price tiers, the margin
// curve, the cost→price build-up and price sensitivity. Pushes its pricing moves
// into the shared Recommendations panel. Region comes from the command-center scope.

import { useEffect, useMemo, useState } from "react";
import { TrendChart, WaterfallChart } from "@/components/finance-os/dashboard/Charts";
import { fmtMoney } from "@/lib/finance/csv";
import { cn } from "@/lib/utils";
import { useCi } from "../context";
import {
  computeMarginOptimizer,
  MARGIN_OPTIMIZER_SAMPLES,
  type MarginOptimizerInput,
} from "@/lib/finance-os/ci/margin-optimizer";

const lbl = "mb-1 block font-mono text-[10px] uppercase tracking-wider text-fos-muted";
const inp = "w-full rounded-lg border border-fos-border bg-fos-bg px-2 py-1.5 text-sm text-fos-text outline-none focus:border-blue-500";

export function MarginOptimizer() {
  const { region, setModuleRecs } = useCi();
  const [idx, setIdx] = useState(0);
  const [form, setForm] = useState<MarginOptimizerInput>({ ...MARGIN_OPTIMIZER_SAMPLES[0], region });

  // Load a sample SKU when picked; always inherit the scope region.
  const loadSample = (i: number) => {
    setIdx(i);
    setForm({ ...MARGIN_OPTIMIZER_SAMPLES[i], region });
  };
  useEffect(() => setForm((f) => ({ ...f, region })), [region]);

  const set = (p: Partial<MarginOptimizerInput>) => setForm((f) => ({ ...f, ...p }));
  const r = useMemo(() => computeMarginOptimizer(form), [form]);

  useEffect(() => setModuleRecs("margin-optimizer", r.recommendations), [r, setModuleRecs]);

  const num = (k: keyof MarginOptimizerInput) => (
    <label>
      <span className={lbl}>{FIELD_LABELS[k]}</span>
      <input
        type="number"
        className={inp}
        value={form[k] as number}
        onChange={(e) => set({ [k]: Number(e.target.value) } as Partial<MarginOptimizerInput>)}
      />
    </label>
  );

  return (
    <div className="space-y-5">
      {/* SKU picker */}
      <div className="flex flex-wrap gap-1.5">
        {MARGIN_OPTIMIZER_SAMPLES.map((s, i) => (
          <button
            key={s.product}
            onClick={() => loadSample(i)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              i === idx ? "border-blue-500 bg-blue-500/15 text-blue-200" : "border-fos-border text-fos-muted hover:text-fos-text",
            )}
          >
            {s.product}
          </button>
        ))}
      </div>

      {/* inputs */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-fos-border bg-fos-surface p-4 sm:grid-cols-3 lg:grid-cols-6">
        {num("cost")}
        {num("currentPrice")}
        {num("competitorPrice")}
        {num("volume")}
        {num("targetMarginPct")}
        {num("floorMarginPct")}
      </div>

      {/* price tiers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TierCard label="Floor" price={r.minPrice} cost={form.cost} tone="muted" sub={`${form.floorMarginPct}% min`} />
        <TierCard label="Target" price={r.targetPrice} cost={form.cost} tone="brand" sub={`${form.targetMarginPct}% goal`} />
        <TierCard label="Premium" price={r.premiumPrice} cost={form.cost} tone="good" sub="vs competitor" />
        <TierCard label="Stretch" price={r.stretchPrice} cost={form.cost} tone="good" sub="above market" />
      </div>

      {/* headline metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Current Margin" value={`${r.currentMarginPct.toFixed(1)}%`} tone={r.currentMarginPct < form.floorMarginPct ? "bad" : "neutral"} />
        <Metric label="Current Profit" value={fmtMoney(r.currentProfit)} />
        <Metric label="Profit Impact @ Target" value={fmtMoney(r.profitImpact)} tone={r.profitImpact >= 0 ? "good" : "bad"} />
        <Metric label="Competitor Gap" value={`${r.competitorGapPct > 0 ? "+" : ""}${r.competitorGapPct.toFixed(1)}%`} tone={r.competitorGapPct > 0 ? "good" : "bad"} />
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart title="Margin curve (margin % vs price)" data={r.curve as unknown as Record<string, number>[]} xKey="price" yKey="marginPct" />
        <WaterfallChart title="Cost → target price build-up (per unit)" steps={r.waterfall} />
      </div>

      {/* sensitivity */}
      <div className="rounded-xl border border-fos-border bg-fos-surface p-4">
        <p className="mb-3 text-sm font-semibold text-fos-text">Price sensitivity</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fos-border text-right font-mono text-[10px] uppercase tracking-wider text-fos-muted">
              <th className="py-2 text-left">Move</th>
              <th className="py-2">Price</th>
              <th className="py-2">Margin</th>
              <th className="py-2">Profit</th>
            </tr>
          </thead>
          <tbody>
            {r.sensitivity.map((s) => (
              <tr key={s.label} className={cn("border-b border-fos-border/50", s.label === "0%" && "bg-blue-500/5")}>
                <td className="py-2 text-fos-text">{s.label}</td>
                <td className="py-2 text-right font-mono tabular-nums text-fos-text">{fmtMoney(s.price)}</td>
                <td className="py-2 text-right font-mono tabular-nums text-fos-muted">{s.marginPct.toFixed(1)}%</td>
                <td className="py-2 text-right font-mono tabular-nums text-fos-text">{fmtMoney(s.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  cost: "Cost",
  currentPrice: "Current Price",
  competitorPrice: "Competitor Price",
  volume: "Volume",
  targetMarginPct: "Target Margin %",
  floorMarginPct: "Floor Margin %",
};

function TierCard({ label, price, cost, sub, tone }: { label: string; price: number; cost: number; sub: string; tone: "muted" | "brand" | "good" }) {
  const margin = price ? ((price - cost) / price) * 100 : 0;
  const ring = tone === "brand" ? "border-blue-500/50" : tone === "good" ? "border-emerald-500/40" : "border-fos-border";
  const txt = tone === "brand" ? "text-blue-300" : tone === "good" ? "text-emerald-300" : "text-fos-text";
  return (
    <div className={cn("rounded-xl border bg-fos-surface p-4", ring)}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", txt)}>{fmtMoney(price)}</p>
      <p className="mt-0.5 text-xs text-fos-muted">{margin.toFixed(1)}% · {sub}</p>
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" }) {
  const txt = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : "text-fos-text";
  return (
    <div className="rounded-xl border border-fos-border bg-fos-surface p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", txt)}>{value}</p>
    </div>
  );
}
