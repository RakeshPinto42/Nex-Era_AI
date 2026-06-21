"use client";

import { useState } from "react";
import PageShell from "@/components/dashboard/PageShell";
import VarianceTool from "@/components/finance/VarianceTool";
import CommissionTool from "@/components/finance/CommissionTool";
import ForecastTool from "@/components/finance/ForecastTool";
import MarginTool from "@/components/finance/MarginTool";
import SampleData from "@/components/finance/SampleData";

const TOOLS = [
  { key: "variance", label: "Variance Analysis", desc: "Actual vs budget, by line item" },
  { key: "commission", label: "Commission Calculator", desc: "Tiered payouts per rep" },
  { key: "forecast", label: "Forecasting", desc: "Project a series forward" },
  { key: "margin", label: "Margin Analysis", desc: "Gross margin by segment" },
  { key: "samples", label: "Sample Data", desc: "Dummy CSV / Excel datasets" },
] as const;

type ToolKey = (typeof TOOLS)[number]["key"];

export default function FinancePage() {
  const [tool, setTool] = useState<ToolKey>("variance");

  return (
    <PageShell
      title="Finance Tools"
      subtitle="Upload your own data and compute real results — variance, commissions, forecasting and margin. Everything runs locally in your browser."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTool(t.key)}
            className={`rounded-xl border px-4 py-2.5 text-left transition-colors ${
              tool === t.key
                ? "border-navy/30 bg-navy/[0.05]"
                : "border-black/10 hover:bg-black/[0.03]"
            }`}
          >
            <span className="block text-sm font-semibold text-neutral-900">{t.label}</span>
            <span className="block text-xs text-black/45">{t.desc}</span>
          </button>
        ))}
      </div>

      {tool === "variance" && <VarianceTool />}
      {tool === "commission" && <CommissionTool />}
      {tool === "forecast" && <ForecastTool />}
      {tool === "margin" && <MarginTool />}
      {tool === "samples" && <SampleData />}
    </PageShell>
  );
}
