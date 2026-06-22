"use client";

// Attainment-distribution heatmap: buckets a numeric series into bands and
// shades each cell by count. Generic enough to reuse across modules.

export function HeatMap({
  title,
  values,
  bands = [50, 75, 90, 100, 110, 125],
  unit = "%",
}: {
  title: string;
  values: number[];
  bands?: number[];
  unit?: string;
}) {
  const edges = [-Infinity, ...bands, Infinity];
  const counts = new Array(edges.length - 1).fill(0) as number[];
  for (const v of values) {
    for (let i = 0; i < edges.length - 1; i++) {
      if (v >= edges[i] && v < edges[i + 1]) {
        counts[i]++;
        break;
      }
    }
  }
  const max = Math.max(1, ...counts);
  const labelFor = (i: number) => {
    const lo = edges[i];
    const hi = edges[i + 1];
    if (lo === -Infinity) return `<${bands[0]}${unit}`;
    if (hi === Infinity) return `≥${bands[bands.length - 1]}${unit}`;
    return `${lo}–${hi}${unit}`;
  };

  return (
    <div className="rounded-2xl border border-fos-border bg-fos-surface shadow-[var(--fos-shadow)] p-4">
      <p className="mb-3 text-sm font-semibold text-fos-text">{title}</p>
      <div className="flex gap-1.5">
        {counts.map((c, i) => {
          const intensity = c / max;
          return (
            <div key={i} className="flex-1 text-center">
              <div
                className="grid h-16 place-items-center rounded text-sm font-semibold"
                style={{
                  backgroundColor: `rgba(37, 99, 235, ${0.08 + intensity * 0.82})`,
                  color: intensity > 0.5 ? "#fff" : "var(--fos-text)",
                }}
                title={`${labelFor(i)}: ${c}`}
              >
                {c}
              </div>
              <p className="mt-1 font-mono text-[9px] text-fos-muted">{labelFor(i)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
