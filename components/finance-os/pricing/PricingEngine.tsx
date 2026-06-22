"use client";

import { useMemo, useState } from "react";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { WaterfallChart } from "@/components/finance-os/dashboard/Charts";
import { fmtMoney } from "@/lib/finance/csv";
import { computePricing, pricingScenarios, type PricingInput } from "@/lib/finance-os/pricing";

const DEFAULTS: PricingInput = {
  cost: 60, volume: 1000, listPrice: 100, discountPct: 10, marginTargetPct: 35, opexPct: 15, fixedCost: 10000,
};

const FIELDS: { key: keyof PricingInput; label: string; step?: string; suffix?: string }[] = [
  { key: "listPrice", label: "List price", suffix: "$" },
  { key: "discountPct", label: "Discount", step: "0.5", suffix: "%" },
  { key: "cost", label: "Unit cost", suffix: "$" },
  { key: "volume", label: "Volume", suffix: "u" },
  { key: "marginTargetPct", label: "Margin target", step: "0.5", suffix: "%" },
  { key: "opexPct", label: "Opex % of rev", step: "0.5", suffix: "%" },
  { key: "fixedCost", label: "Fixed cost", suffix: "$" },
];

export function PricingEngine() {
  const [input, setInput] = useState<PricingInput>(DEFAULTS);
  const r = useMemo(() => computePricing(input), [input]);
  const sc = useMemo(() => pricingScenarios(input), [input]);
  const set = (k: keyof PricingInput, v: number) => setInput((p) => ({ ...p, [k]: v }));

  return (
    <ModuleScreen slug="pricing" title="Pricing Engine">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ---- calculator slab ---- */}
        <div className="lg:col-span-4">
          <div className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-lg">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#2dd4bf" }} />
              <span className="font-mono text-xs uppercase tracking-widest text-teal-300">Calculator</span>
            </div>
            <div className="divide-y divide-white/5">
              {FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm text-slate-300">{f.label}</span>
                  <span className="flex items-center gap-1">
                    {f.suffix === "$" && <span className="text-slate-500">$</span>}
                    <input
                      type="number"
                      step={f.step ?? "1"}
                      value={input[f.key]}
                      onChange={(e) => set(f.key, Number(e.target.value))}
                      className="w-24 bg-transparent text-right font-mono text-lg text-teal-200 outline-none [appearance:textfield] focus:text-white"
                    />
                    {f.suffix !== "$" && <span className="w-3 text-slate-500">{f.suffix}</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ---- result readout ---- */}
        <div className="space-y-5 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-fos-border bg-fos-surface p-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-fos-muted">Net price / unit</p>
              <p className="text-5xl font-semibold tabular-nums text-fos-text">{fmtMoney(r.netPrice)}</p>
            </div>
            <div className="h-12 w-px bg-line" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-fos-muted">Gross margin</p>
              <p className="text-3xl font-semibold tabular-nums" style={{ color: r.meetsTarget ? "#0d9488" : "#e11d48" }}>
                {r.grossMarginPct.toFixed(1)}%
              </p>
              <p className="text-xs" style={{ color: r.meetsTarget ? "#0d9488" : "#e11d48" }}>
                {r.meetsTarget ? "✓ meets target" : `↓ target ${input.marginTargetPct}%`}
              </p>
            </div>
            <div className="ml-auto rounded-xl px-4 py-3 text-center" style={{ background: r.approval === "Auto Approve" ? "#0d948814" : "#d9770614" }}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-fos-muted">Approval</p>
              <p className="text-sm font-semibold text-fos-text">{r.approval}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Readout label="Revenue" value={fmtMoney(r.revenue)} />
            <Readout label="Gross profit" value={fmtMoney(r.grossProfit)} />
            <Readout label="EBITDA" value={fmtMoney(r.ebitda)} sub={`${r.ebitdaPct.toFixed(1)}% of rev`} />
            <Readout label="Recommended px" value={Number.isFinite(r.recommendedPrice) ? fmtMoney(r.recommendedPrice) : "—"} sub="to hit target" />
            <Readout label="Break-even" value={Number.isFinite(r.breakEvenUnits) ? `${Math.ceil(r.breakEvenUnits).toLocaleString()} u` : "—"} />
          </div>

          {/* scenario columns */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(["best", "base", "worst"] as const).map((k) => {
              const s = sc[k];
              const tone = k === "best" ? "#0d9488" : k === "worst" ? "#e11d48" : "#475569";
              return (
                <div key={k} className="rounded-2xl border bg-fos-surface p-4" style={{ borderColor: `${tone}33` }}>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: tone }}>{k} case</p>
                  <Line label="Revenue" v={fmtMoney(s.revenue)} />
                  <Line label="Margin" v={`${s.grossMarginPct.toFixed(1)}%`} />
                  <Line label="EBITDA" v={fmtMoney(s.ebitda)} bold />
                </div>
              );
            })}
          </div>

          <WaterfallChart title="Price waterfall (per unit)" steps={r.waterfall} />
        </div>
      </div>
    </ModuleScreen>
  );
}

function Readout({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-fos-border bg-fos-surface p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-fos-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-fos-text">{value}</p>
      {sub && <p className="text-[11px] text-fos-muted">{sub}</p>}
    </div>
  );
}

function Line({ label, v, bold }: { label: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-0.5 text-sm">
      <span className="text-fos-muted">{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold text-fos-text" : "text-fos-text"}`}>{v}</span>
    </div>
  );
}
