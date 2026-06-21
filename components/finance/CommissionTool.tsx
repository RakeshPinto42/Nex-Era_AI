"use client";

import { useMemo, useState } from "react";
import {
  parseCsv,
  firstNumericCol,
  fmtMoney,
  toCsv,
  download,
  type Table,
} from "@/lib/finance/csv";
import {
  computeCommission,
  DEFAULT_TIERS,
  type Tier,
} from "@/lib/finance/commission";
import { Dropzone, ColumnSelect, StatCard, BarList, PrivacyNote, Panel } from "./shared";

const SAMPLE = `Rep,Region,Revenue
A. Mehta,West,420000
J. Park,East,358000
L. Diaz,North,310000
S. Khan,South,244000
R. Cohen,West,512000
M. Ito,East,176000
T. Novak,North,288000`;

export default function CommissionTool() {
  const [table, setTable] = useState<Table | null>(null);
  const [rep, setRep] = useState(0);
  const [revenue, setRevenue] = useState(1);
  const [tiers, setTiers] = useState<Tier[]>(DEFAULT_TIERS);
  const [quota, setQuota] = useState<number | null>(null);
  const [accel, setAccel] = useState<number | null>(null);

  const onTable = (t: Table) => {
    const r = firstNumericCol(t, 1);
    setTable(t);
    setRep(0);
    setRevenue(r < 0 ? 1 : r);
  };

  const result = useMemo(
    () =>
      table
        ? computeCommission(
            table,
            { rep, revenue },
            { tiers, quota, acceleratorRate: accel },
          )
        : null,
    [table, rep, revenue, tiers, quota, accel],
  );

  const top = useMemo(() => {
    if (!result) return [];
    return result.rows.slice(0, 8).map((r) => ({
      label: r.rep,
      value: r.commission,
      display: fmtMoney(r.commission),
    }));
  }, [result]);

  const setTier = (i: number, patch: Partial<Tier>) =>
    setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addTier = () =>
    setTiers((ts) => {
      const next = [...ts];
      const last = next[next.length - 1];
      const prevCap = next.length > 1 ? next[next.length - 2].upTo ?? 0 : 0;
      next.splice(next.length - 1, 0, {
        upTo: (prevCap || 0) + 100000,
        rate: last.rate,
      });
      return next;
    });
  const removeTier = (i: number) =>
    setTiers((ts) => (ts.length > 1 ? ts.filter((_, j) => j !== i) : ts));

  const exportCsv = () => {
    if (!result) return;
    download(
      "commission-payouts.csv",
      toCsv(
        ["Rep", "Revenue", "Commission", "Eff Rate %", "Attainment %"],
        result.rows.map((r) => [
          r.rep,
          r.revenue,
          Math.round(r.commission),
          r.effRate.toFixed(2),
          r.attainment != null ? r.attainment.toFixed(0) : "",
        ]),
      ),
    );
  };

  if (!table) {
    return (
      <div className="space-y-4">
        <PrivacyNote />
        <Dropzone onTable={onTable} hint="Upload sales / bookings (CSV)" />
        <p className="text-center text-xs text-black/45">
          Need a rep/owner column and a revenue/bookings amount.{" "}
          <button onClick={() => onTable(parseCsv(SAMPLE))} className="font-medium text-navy hover:underline">
            Load sample data
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* mapping */}
        <Panel>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-black/40">
            Columns
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ColumnSelect table={table} value={rep} onChange={setRep} label="Rep / owner" />
            <ColumnSelect table={table} value={revenue} onChange={setRevenue} label="Revenue" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-black/55">Quota (optional)</span>
              <input
                type="number"
                value={quota ?? ""}
                placeholder="none"
                onChange={(e) => setQuota(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-black/10 bg-black/[0.02] px-2.5 py-2 text-sm outline-none focus:border-navy/40"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-black/55">Accelerator % over quota</span>
              <input
                type="number"
                value={accel ?? ""}
                placeholder="none"
                onChange={(e) => setAccel(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-black/10 bg-black/[0.02] px-2.5 py-2 text-sm outline-none focus:border-navy/40"
              />
            </label>
          </div>
        </Panel>

        {/* tiers */}
        <Panel>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-black/40">
            Commission tiers (marginal)
          </p>
          <div className="space-y-2">
            {tiers.map((t, i) => {
              const last = i === tiers.length - 1;
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-16 flex-none text-xs text-black/45">
                    {last ? "and above" : "up to"}
                  </span>
                  {last ? (
                    <span className="flex-1 text-black/30">—</span>
                  ) : (
                    <input
                      type="number"
                      value={t.upTo ?? 0}
                      onChange={(e) => setTier(i, { upTo: Number(e.target.value) })}
                      className="min-w-0 flex-1 rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1.5 outline-none focus:border-navy/40"
                    />
                  )}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.5"
                      value={t.rate}
                      onChange={(e) => setTier(i, { rate: Number(e.target.value) })}
                      className="w-16 rounded-lg border border-black/10 bg-black/[0.02] px-2 py-1.5 text-right outline-none focus:border-navy/40"
                    />
                    <span className="text-xs text-black/45">%</span>
                  </div>
                  <button
                    onClick={() => removeTier(i)}
                    disabled={tiers.length <= 1}
                    className="grid h-7 w-7 flex-none place-items-center rounded-lg text-black/30 hover:bg-black/5 hover:text-rose-600 disabled:opacity-30"
                    aria-label="Remove tier"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          <button onClick={addTier} className="mt-3 text-xs font-medium text-navy hover:underline">
            + Add tier
          </button>
        </Panel>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Revenue" value={fmtMoney(result.totals.revenue)} />
            <StatCard label="Total Commission" value={fmtMoney(result.totals.commission)} />
            <StatCard label="Blended Rate" value={`${result.totals.effRate.toFixed(2)}%`} />
            <StatCard label="Reps" value={String(result.rows.length)} />
          </div>

          <Panel>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-black/40">
              Commission by rep
            </p>
            <BarList items={top} />
          </Panel>

          <div className="overflow-hidden rounded-2xl border border-black/10">
            <div className="flex items-center justify-between border-b border-black/10 bg-black/[0.02] px-4 py-2.5">
              <span className="font-mono text-[11px] uppercase tracking-widest text-black/45">
                Payout detail
              </span>
              <div className="flex gap-2">
                <button onClick={exportCsv} className="rounded-lg border border-black/10 px-2.5 py-1 text-xs text-black/60 hover:bg-black/5 hover:text-neutral-900">
                  Export CSV
                </button>
                <button onClick={() => setTable(null)} className="rounded-lg border border-black/10 px-2.5 py-1 text-xs text-black/60 hover:bg-black/5 hover:text-neutral-900">
                  New file
                </button>
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-black/10 text-left font-mono text-[10px] uppercase tracking-wider text-black/40">
                    <th className="px-4 py-2 font-medium">Rep</th>
                    <th className="px-4 py-2 text-right font-medium">Revenue</th>
                    <th className="px-4 py-2 text-right font-medium">Commission</th>
                    <th className="px-4 py-2 text-right font-medium">Eff %</th>
                    {quota != null && <th className="px-4 py-2 text-right font-medium">Attain</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => (
                    <tr key={i} className="border-b border-black/5 last:border-0">
                      <td className="px-4 py-2 text-neutral-900">{r.rep}</td>
                      <td className="px-4 py-2 text-right font-mono text-black/70">{fmtMoney(r.revenue)}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-navy">{fmtMoney(r.commission)}</td>
                      <td className="px-4 py-2 text-right font-mono text-black/50">{r.effRate.toFixed(1)}%</td>
                      {quota != null && (
                        <td className={`px-4 py-2 text-right font-mono ${(r.attainment ?? 0) >= 100 ? "text-emerald-600" : "text-black/50"}`}>
                          {r.attainment != null ? `${r.attainment.toFixed(0)}%` : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
