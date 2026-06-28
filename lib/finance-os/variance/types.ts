// Variance Studio — types. Enterprise FP&A: Budget vs Forecast vs Actual, with a
// deterministic Price / Volume / Mix / FX decomposition and a Budget→Actual
// bridge. AI never computes these numbers — it only explains them.

import type { Table } from "@/lib/finance-os/analytics/types";

export type Scenario = "budget" | "forecast" | "actual";

export type ScenarioData = { scenario: Scenario; fileName: string; table: Table };

// Column choices that drive the engine (auto-detected, user-confirmable).
export type VarianceInputs = {
  line: string;        // dimension column to bridge by (e.g. Product / Account)
  value: string;       // the money measure (e.g. Revenue / Amount)
  qty?: string;        // optional quantity measure → enables Price/Volume/Mix
  fxRate?: string;     // optional FX-rate column → enables the FX effect
};

export type LineVariance = {
  line: string;
  budget: number;
  forecast: number | null;
  actual: number;
  varAbs: number;      // actual − budget
  varPct: number;      // varAbs / |budget| · 100
  material: boolean;
  price: number;       // line price effect (when qty present)
  volume: number;      // line volume effect (when qty present)
};

export type Drivers = { price: number; volume: number; mix: number; fx: number; other: number };

export type BridgeStep = { label: string; value: number; kind: "start" | "up" | "down" | "end" };

export type VarianceResult = {
  inputs: VarianceInputs;
  totalBudget: number;
  totalForecast: number | null;
  totalActual: number;
  totalVarAbs: number;
  totalVarPct: number;
  lines: LineVariance[];
  drivers: Drivers;
  bridge: BridgeStep[];
  hasQty: boolean;
  hasFx: boolean;
  materialityPct: number;
  currency: string | null;
};
