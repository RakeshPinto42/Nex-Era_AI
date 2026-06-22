"use client";

import { useMemo, useState } from "react";
import { ModuleScreen } from "@/components/finance-os/ModuleScreen";
import { WaterfallChart } from "@/components/finance-os/dashboard/Charts";
import { KpiCard, KpiGrid } from "@/components/finance-os/dashboard/KpiCard";
import { fmtMoney } from "@/lib/finance/csv";
import { bridgeCommentary, computeBridge, DEFAULT_DRIVERS, type BridgeDriver } from "@/lib/finance-os/bridge";

const inp = "w-full rounded-lg border border-fos-border bg-fos-surface px-2.5 py-1.5 text-sm text-fos-text outline-none focus:border-brand-600/40";
const lbl = "mb-1 block text-xs font-medium text-fos-text";

const SAMPLE_DRIVERS: BridgeDriver[] = [
  { key: "volume", label: "Volume", value: 420_000 },
  { key: "price", label: "Price", value: 260_000 },
  { key: "mix", label: "Mix", value: -90_000 },
  { key: "fx", label: "FX", value: -45_000 },
  { key: "new", label: "New Business", value: 380_000 },
  { key: "churn", label: "Churn", value: -210_000 },
];

export function RevenueBridge() {
  const [start, setStart] = useState(4_200_000);
  const [end, setEnd] = useState(4_915_000);
  const [drivers, setDrivers] = useState<BridgeDriver[]>(DEFAULT_DRIVERS);

  const result = useMemo(() => computeBridge(start, drivers, end), [start, drivers, end]);
  const setDriver = (key: string, value: number) => setDrivers((ds) => ds.map((d) => (d.key === key ? { ...d, value } : d)));

  return (
    <ModuleScreen slug="revenue-bridge" title="Revenue Bridge Builder">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="rounded-2xl border border-fos-border bg-fos-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-fos-text">Periods</h3>
            <div className="grid grid-cols-2 gap-3">
              <label><span className={lbl}>Start revenue</span><input type="number" className={inp} value={start} onChange={(e) => setStart(Number(e.target.value))} /></label>
              <label><span className={lbl}>End revenue</span><input type="number" className={inp} value={end} onChange={(e) => setEnd(Number(e.target.value))} /></label>
            </div>
            <button onClick={() => { setStart(4_200_000); setEnd(4_915_000); setDrivers(SAMPLE_DRIVERS); }} className="mt-3 rounded-lg border border-fos-border px-3 py-1.5 text-xs text-fos-text hover:bg-fos-surface2">
              Load sample
            </button>
          </div>
          <div className="rounded-2xl border border-fos-border bg-fos-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-fos-text">Drivers</h3>
            <div className="space-y-2">
              {drivers.map((d) => (
                <label key={d.key} className="flex items-center gap-2">
                  <span className="w-28 text-sm text-fos-text">{d.label}</span>
                  <input type="number" className={inp} value={d.value} onChange={(e) => setDriver(d.key, Number(e.target.value))} />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <KpiGrid>
            <KpiCard label="Total change" value={fmtMoney(result.totalChange)} tone={result.totalChange >= 0 ? "good" : "bad"} />
            <KpiCard label="Explained" value={fmtMoney(result.explained)} />
            <KpiCard label="Unexplained" value={fmtMoney(result.residual)} tone={Math.abs(result.residual) > 0.01 ? "bad" : "good"} />
          </KpiGrid>
          <WaterfallChart title="Revenue bridge" steps={result.steps} />
          <div className="rounded-xl border border-fos-border bg-fos-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-fos-text">Commentary</h3>
            <p className="text-sm text-fos-text">{bridgeCommentary(result)}</p>
          </div>
        </div>
      </div>
    </ModuleScreen>
  );
}
