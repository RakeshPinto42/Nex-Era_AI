// Scenario Engine skeleton — reusable Base / Best / Worst modelling primitive.
// Used later by Pricing Engine, Forecast Studio, Customer Profitability. No UI.

export type ScenarioKey = "base" | "best" | "worst";
export const SCENARIO_KEYS: ScenarioKey[] = ["base", "best", "worst"];

export type Scenario<T> = Record<ScenarioKey, T>;

/** Apply a compute fn to each scenario's inputs. */
export function runScenarios<I, O>(
  inputs: Scenario<I>,
  fn: (input: I, key: ScenarioKey) => O,
): Scenario<O> {
  return {
    base: fn(inputs.base, "base"),
    best: fn(inputs.best, "best"),
    worst: fn(inputs.worst, "worst"),
  };
}

/** Derive best/worst inputs from a base via adjustment fns. */
export function scenarioFromBase<T>(
  base: T,
  adjust: { best: (base: T) => T; worst: (base: T) => T },
): Scenario<T> {
  return { base, best: adjust.best(base), worst: adjust.worst(base) };
}

/** Scale a numeric base by ± a percentage to produce a scenario triple. */
export function scenarioByPct(base: number, upPct: number, downPct: number): Scenario<number> {
  return {
    base,
    best: base * (1 + upPct / 100),
    worst: base * (1 - downPct / 100),
  };
}
