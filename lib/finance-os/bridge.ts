// Revenue Bridge Builder — decompose the change between two periods into named
// drivers (volume, price, mix, FX, new business, churn). Pure, browser-only.

export type BridgeDriver = { key: string; label: string; value: number };

export const DEFAULT_DRIVERS: BridgeDriver[] = [
  { key: "volume", label: "Volume", value: 0 },
  { key: "price", label: "Price", value: 0 },
  { key: "mix", label: "Mix", value: 0 },
  { key: "fx", label: "FX", value: 0 },
  { key: "new", label: "New Business", value: 0 },
  { key: "churn", label: "Churn", value: 0 },
];

export type BridgeResult = {
  start: number;
  end: number;
  totalChange: number;
  explained: number;
  residual: number; // end - start - sum(drivers)
  steps: { label: string; value: number }[]; // for a waterfall: start ... drivers ... end
};

export function computeBridge(start: number, drivers: BridgeDriver[], end: number): BridgeResult {
  const explained = drivers.reduce((s, d) => s + d.value, 0);
  const totalChange = end - start;
  const residual = totalChange - explained;
  // Waterfall steps are DELTAS: Start lifts 0→start, each driver/residual moves
  // the running total, landing exactly on `end`.
  const steps = [
    { label: "Start", value: start },
    ...drivers.map((d) => ({ label: d.label, value: d.value })),
    ...(Math.abs(residual) > 0.005 ? [{ label: "Unexplained", value: residual }] : []),
  ];
  return { start, end, totalChange, explained, residual, steps };
}

/** Build a plain-English summary of the biggest movers. */
export function bridgeCommentary(result: BridgeResult): string {
  const movers = result.steps
    .filter((s) => s.label !== "Start" && s.label !== "End")
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const dir = result.totalChange >= 0 ? "grew" : "declined";
  const fmt = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n).toLocaleString()}`;
  const top = movers.slice(0, 3).map((m) => `${m.label} (${fmt(m.value)})`).join(", ");
  return `Revenue ${dir} by ${fmt(result.totalChange)} from ${Math.round(result.start).toLocaleString()} to ${Math.round(result.end).toLocaleString()}. Largest drivers: ${top || "none"}.`;
}
