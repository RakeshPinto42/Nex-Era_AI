"use client";

import type { ModuleConfig, ToolKey } from "@/lib/fpa/modules";
import VarianceTool from "@/components/finance/VarianceTool";
import CommissionTool from "@/components/finance/CommissionTool";
import ForecastTool from "@/components/finance/ForecastTool";
import MarginTool from "@/components/finance/MarginTool";

const TOOLS: Record<ToolKey, () => JSX.Element> = {
  variance: VarianceTool,
  commission: CommissionTool,
  forecast: ForecastTool,
  margin: MarginTool,
};

export default function ModuleView({ module }: { module: ModuleConfig }) {
  if (!module.tool) return <ComingSoon module={module} />;
  const Tool = TOOLS[module.tool];
  return <Tool />;
}

function ComingSoon({ module }: { module: ModuleConfig }) {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-black/15 bg-black/[0.02] p-10 text-center">
      <div className="max-w-sm">
        <span className="inline-flex rounded-full border border-navy/25 bg-navy/[0.06] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-navy">
          Coming soon
        </span>
        <h3 className="mt-4 text-lg font-semibold text-neutral-900">{module.name}</h3>
        <p className="mt-2 text-sm text-black/50">{module.blurb}</p>
        <p className="mt-4 text-xs text-black/40">
          This tool isn&apos;t built yet. The live tools — Variance, Commission, Forecasting and
          Margin — compute on your own CSV, entirely in your browser.
        </p>
      </div>
    </div>
  );
}
