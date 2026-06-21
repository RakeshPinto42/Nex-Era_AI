// Forecasting: project a historical series forward by linear trend or compound
// growth. Pure compute — runs in the browser.

import { toNum, type Table } from "./csv";

export type Method = "trend" | "growth";

export type ForecastPoint = { label: string; value: number; projected: boolean };

export type ForecastResult = {
  points: ForecastPoint[]; // history + projection
  history: { label: string; value: number }[];
  cagr: number; // % compound annual/period growth over history
  avgGrowth: number; // % mean period-over-period growth
  method: Method;
};

export function computeForecast(
  table: Table,
  map: { period: number; value: number },
  opts: { periods: number; method: Method },
): ForecastResult {
  const history: { label: string; value: number }[] = [];
  for (const r of table.rows) {
    const v = toNum(r[map.value]);
    if (!Number.isFinite(v)) continue;
    history.push({ label: (r[map.period] ?? `P${history.length + 1}`).trim(), value: v });
  }

  const n = history.length;
  const vals = history.map((h) => h.value);

  // Period-over-period growth + CAGR.
  const growths: number[] = [];
  for (let i = 1; i < n; i++) {
    if (vals[i - 1] !== 0) growths.push((vals[i] - vals[i - 1]) / Math.abs(vals[i - 1]));
  }
  const avgGrowth = growths.length
    ? (growths.reduce((a, b) => a + b, 0) / growths.length) * 100
    : 0;
  const cagr =
    n >= 2 && vals[0] > 0 && vals[n - 1] > 0
      ? (Math.pow(vals[n - 1] / vals[0], 1 / (n - 1)) - 1) * 100
      : 0;

  // Linear least-squares fit on index → value.
  let slope = 0;
  let intercept = vals[0] ?? 0;
  if (n >= 2) {
    const xs = history.map((_, i) => i);
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = vals.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - mx) * (vals[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    slope = den ? num / den : 0;
    intercept = my - slope * mx;
  }

  const points: ForecastPoint[] = history.map((h) => ({ ...h, projected: false }));
  const last = vals[n - 1] ?? 0;
  const g = avgGrowth / 100;
  for (let k = 1; k <= Math.max(0, opts.periods); k++) {
    const value =
      opts.method === "trend" ? intercept + slope * (n - 1 + k) : last * Math.pow(1 + g, k);
    points.push({ label: `F${k}`, value: Math.round(value), projected: true });
  }

  return { points, history, cagr, avgGrowth, method: opts.method };
}
