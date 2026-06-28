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
            className={`rounded-xl border px-4 py-2.5 text-left transition-all duration-200 active:scale-[0.98] ${
              tool === t.key
                ? "border-brand/30 bg-accent-tint shadow-soft"
                : "border-line hover:bg-surface-2 hover:border-line-strong"
            }`}
          >
            <span className={`block text-sm font-semibold ${tool === t.key ? "text-brand" : "text-ink"}`}>{t.label}</span>
            <span className="block text-xs text-faint">{t.desc}</span>
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
