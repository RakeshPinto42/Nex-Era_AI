"use client";

/* ============================================================================
   VARIANCE STUDIO — enterprise FP&A analysis workspace. Upload Budget / Forecast
   / Actual → auto-detect dimensions → deterministic variance + Price/Volume/Mix/
   FX decomposition → waterfall → root cause → executive summary → management
   commentary → export. The engine computes every number; AI only explains.
   Browser-first. Renders only in the Finance OS workspace slot (shell untouched).
   ========================================================================== */

import { useState } from "react";
import { GitCompareArrows, UploadCloud, SlidersHorizontal, BarChart4, X, ArrowRight, RotateCcw } from "lucide-react";
import type { Scenario, ScenarioData, VarianceInputs, VarianceResult } from "@/lib/finance-os/variance/types";
import { computeVariance } from "@/lib/finance-os/variance/engine";
import { parseWorkbook } from "@/lib/finance-os/analytics/profile";
import { UploadModeBar } from "@/components/finance/UploadModeBar";
import { VarianceAnalysis } from "./VarianceAnalysis";
import { Button, Chip, Select, cx } from "@/components/uikit";

type Stage = "upload" | "map" | "analysis";
type Files = Partial<Record<Scenario, ScenarioData>>;

export function VarianceStudio() {
  const [stage, setStage] = useState<Stage>("upload");
  const [files, setFiles] = useState<Files>({});
  const [inputs, setInputs] = useState<VarianceInputs>({ line: "", value: "" });
  const [materiality, setMateriality] = useState(5);
  const [result, setResult] = useState<VarianceResult | null>(null);

  const reset = () => { setStage("upload"); setFiles({}); setResult(null); setInputs({ line: "", value: "" }); };

  const onContinueToMap = () => {
    const t = files.budget!.table;
    const measures = t.columns.filter((c) => c.role === "measure");
    const dims = t.columns.filter((c) => c.role === "dimension");
    const money = measures.find((c) => c.type === "currency") ?? measures[0];
    const qty = measures.find((c) => /unit|qty|quantity|volume|count/i.test(c.name));
    const fx = t.columns.find((c) => /rate|fx|exchange/i.test(c.name));
    setInputs({ line: dims[0]?.name ?? "", value: money?.name ?? "", qty: qty?.name, fxRate: fx?.name });
    setStage("map");
  };

  const run = () => {
    if (!files.budget || !files.actual || !inputs.line || !inputs.value) return;
    const currency = files.budget.table.columns.find((c) => c.name === inputs.value)?.currency ?? "$";
    setResult(computeVariance(files.budget, files.actual, files.forecast ?? null, inputs, materiality, currency));
    setStage("analysis");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-none flex-wrap items-center gap-3 border-b border-line bg-surface/60 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#8b5cf6]/12 text-[#8b5cf6]"><GitCompareArrows size={15} /></span>
          <span className="font-display text-sm font-semibold text-ink">Variance Studio</span>
        </div>
        <Stepper stage={stage} />
        <div className="ml-auto flex items-center gap-2">
          {result && <Chip tone="neutral">{result.lines.length} lines</Chip>}
          {Object.keys(files).length > 0 && <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={reset}>Start over</Button>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {stage === "upload" && <UploadStage files={files} setFiles={setFiles} onContinue={onContinueToMap} />}
        {stage === "map" && files.budget && (
          <MapStage table={files.budget.table} inputs={inputs} setInputs={setInputs} materiality={materiality} setMateriality={setMateriality} onRun={run} hasForecast={!!files.forecast} />
        )}
        {stage === "analysis" && result && <VarianceAnalysis result={result} />}
      </div>
    </div>
  );
}

function Stepper({ stage }: { stage: Stage }) {
  const steps: { key: Stage; label: string; icon: typeof UploadCloud }[] = [
    { key: "upload", label: "Upload", icon: UploadCloud },
    { key: "map", label: "Map", icon: SlidersHorizontal },
    { key: "analysis", label: "Analysis", icon: BarChart4 },
  ];
  const idx = steps.findIndex((s) => s.key === stage);
  return (
    <div className="hidden items-center gap-1 md:flex">
      {steps.map((s, i) => {
        const Icon = s.icon; const on = i === idx;
        return (
          <div key={s.key} className={cx("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium", on ? "bg-[#8b5cf6]/12 text-[#8b5cf6]" : i < idx ? "text-ink" : "text-faint")}>
            <Icon size={13} /> <span className="hidden lg:inline">{s.label}</span>{i < steps.length - 1 && <span className="ml-1 text-faint">›</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- upload */
const SCENARIOS: { key: Scenario; label: string; required: boolean; desc: string }[] = [
  { key: "budget", label: "Budget", required: true, desc: "Plan / target numbers" },
  { key: "forecast", label: "Forecast", required: false, desc: "Latest estimate (optional)" },
  { key: "actual", label: "Actual", required: true, desc: "What actually happened" },
];

function UploadStage({ files, setFiles, onContinue }: { files: Files; setFiles: (f: Files) => void; onContinue: () => void }) {
  const [err, setErr] = useState("");
  const load = async (scenario: Scenario, file: File) => {
    setErr("");
    try {
      const tables = await parseWorkbook(file);
      const table = [...tables].sort((a, b) => b.columns.length * b.rowCount - a.columns.length * a.rowCount)[0];
      if (!table) throw new Error("No readable sheet.");
      setFiles({ ...files, [scenario]: { scenario, fileName: file.name, table } });
    } catch (e) { setErr((e as Error).message || "Could not read file."); }
  };
  const ready = !!files.budget && !!files.actual;
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-xl font-bold text-ink">Upload your scenarios</h2>
        <p className="mt-1 text-sm text-muted">Budget and Actual are required; Forecast is optional. Same layout (line item + value, ideally a quantity) across files. Parsed in your browser.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {SCENARIOS.map((s) => {
            const f = files[s.key];
            return (
              <label key={s.key} className={cx("grid cursor-pointer place-items-center rounded-2xl border border-dashed bg-surface px-4 py-7 text-center shadow-soft transition-colors hover:border-brand/40", f ? "border-success/40" : "border-line-strong")}>
                <UploadCloud size={20} className={cx("mb-1.5", f ? "text-success" : "text-faint")} />
                <span className="text-[13px] font-semibold text-ink">{s.label}{s.required && <span className="text-danger"> *</span>}</span>
                <span className="mt-0.5 text-[11px] text-faint">{f ? f.fileName : s.desc}</span>
                <input type="file" accept=".xlsx,.xls,.csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && load(s.key, e.target.files[0])} />
              </label>
            );
          })}
        </div>
        {err && <p className="mt-3 text-sm text-danger">{err}</p>}
        <div className="mt-5 text-left"><UploadModeBar /></div>
        <div className="mt-5 flex justify-end">
          <Button onClick={onContinue} disabled={!ready} iconRight={<ArrowRight size={15} />}>Detect dimensions</Button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- map */
function MapStage({ table, inputs, setInputs, materiality, setMateriality, onRun, hasForecast }: {
  table: ScenarioData["table"]; inputs: VarianceInputs; setInputs: (i: VarianceInputs) => void;
  materiality: number; setMateriality: (n: number) => void; onRun: () => void; hasForecast: boolean;
}) {
  const dims = table.columns.filter((c) => c.role === "dimension" || c.role === "id");
  const measures = table.columns.filter((c) => c.role === "measure");
  const set = (k: keyof VarianceInputs, v: string) => setInputs({ ...inputs, [k]: v || undefined });
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-display text-xl font-bold text-ink">Map the analysis</h2>
        <p className="mt-1 text-sm text-muted">Auto-detected from the Budget file. Confirm the line item, value, and (for Price/Volume/Mix) a quantity. FX is optional.</p>

        <div className="mt-5 space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-soft">
          <Field label="Line item (bridge dimension)"><Select value={inputs.line} onChange={(e) => set("line", e.target.value)}>{dims.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</Select></Field>
          <Field label="Value measure (money)"><Select value={inputs.value} onChange={(e) => set("value", e.target.value)}>{measures.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</Select></Field>
          <Field label="Quantity (optional — enables Price / Volume / Mix)"><Select value={inputs.qty ?? ""} onChange={(e) => set("qty", e.target.value)}><option value="">— none —</option>{measures.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</Select></Field>
          <Field label="FX rate (optional — enables FX effect)"><Select value={inputs.fxRate ?? ""} onChange={(e) => set("fxRate", e.target.value)}><option value="">— none —</option>{table.columns.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</Select></Field>
          <Field label={`Materiality threshold (${materiality}%)`}>
            <input type="range" min={1} max={25} value={materiality} onChange={(e) => setMateriality(Number(e.target.value))} className="w-full accent-[#8b5cf6]" />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-muted">
          {!inputs.qty && <Chip tone="warning">No quantity → Price/Volume/Mix disabled (shows net $ variance)</Chip>}
          {hasForecast && <Chip tone="info">Forecast included</Chip>}
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={onRun} disabled={!inputs.line || !inputs.value} iconRight={<ArrowRight size={15} />}>Run variance analysis</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[12px] font-medium text-muted">{label}</span>{children}</label>;
}
