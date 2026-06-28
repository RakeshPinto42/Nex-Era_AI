"use client";

/* ============================================================================
   Broker Center (Investment Hub Phase 13).
   ----------------------------------------------------------------------------
   Manage trading-account connections through Broker Tools. Agents never connect
   to brokers directly. CONNECTION ONLY — no trading, no order placement. Paper
   Trading works as a mock; other brokers are registered as planned.
   ========================================================================== */

import { useState } from "react";
import Link from "next/link";
import PageShell from "@/components/dashboard/PageShell";
import { BrokerStoreProvider, useBrokerStore } from "@/components/investments/broker/store";
import { BROKER_REGISTRY } from "@/lib/brokers/registry";
import { getBrokerAdapter } from "@/lib/brokers";
import type { AccountSnapshot, BrokerDescriptor, BrokerId } from "@/lib/brokers/types";

export default function BrokerCenterPage() {
  return (
    <BrokerStoreProvider>
      <PageShell
        title="Broker Center"
        subtitle="Connect and manage trading accounts through Broker Tools. Connection only — no trading yet."
        action={
          <Link href="/dashboard/investments" className="text-sm font-medium text-brand hover:underline">
            ← Investments
          </Link>
        }
      >
        <Inner />
      </PageShell>
    </BrokerStoreProvider>
  );
}

function Inner() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BROKER_REGISTRY.map((b) => <BrokerCard key={b.id} broker={b} />)}
      </div>
      <ConnectedAccounts />
    </div>
  );
}

function BrokerCard({ broker }: { broker: BrokerDescriptor }) {
  const store = useBrokerStore();
  const conn = store.connectionFor(broker.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = broker.status === "available";

  const onConnect = async () => {
    setBusy(true);
    setError(null);
    const err = await store.connect(broker.id);
    if (err) setError(err);
    setBusy(false);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-lg">{broker.icon}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${available ? "border-emerald-300 text-emerald-600" : "border-line text-muted"}`}>
          {available ? "Available" : "Planned"}
        </span>
      </div>
      <h3 className="mt-3 font-semibold text-ink">{broker.name}</h3>
      <p className="mt-0.5 text-[11px] text-muted">{broker.region} · {broker.assetClasses.join(", ")}</p>
      <p className="mt-0.5 font-mono text-[10px] text-faint">auth: {broker.authType}</p>

      <div className="mt-3 flex flex-wrap gap-1">
        {broker.capabilities.map((c) => (
          <span key={c} className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[9px] text-muted">{c}</span>
        ))}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        {!available ? (
          <button type="button" disabled className="w-full rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-faint">
            Coming soon
          </button>
        ) : conn ? (
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected · {conn.accountId}
            </span>
            <button type="button" onClick={() => store.disconnect(broker.id)} className="text-[11px] text-muted hover:text-red-600">Disconnect</button>
          </div>
        ) : (
          <button type="button" onClick={onConnect} disabled={busy} className="w-full rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50">
            {busy ? "Connecting…" : "Connect"}
          </button>
        )}
        {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function ConnectedAccounts() {
  const store = useBrokerStore();
  if (store.connections.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface-2 p-8 text-center text-sm text-muted">
        No connected accounts. Connect Paper Trading to preview account details.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {store.connections.map((c) => <AccountPanel key={c.brokerId} brokerId={c.brokerId} />)}
    </div>
  );
}

function AccountPanel({ brokerId }: { brokerId: BrokerId }) {
  const store = useBrokerStore();
  const conn = store.connectionFor(brokerId)!;
  const [snap, setSnap] = useState<AccountSnapshot | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const adapter = getBrokerAdapter(brokerId);
    if (!adapter) return;
    setBusy(true);
    try {
      setSnap(await adapter.getSnapshot(conn));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          {conn.accountId} · {conn.type}
        </p>
        <button type="button" onClick={load} disabled={busy} className="text-xs font-medium text-brand hover:underline disabled:opacity-50">
          {busy ? "Loading…" : snap ? "Refresh" : "Load account"}
        </button>
      </div>

      {snap && (
        <div className="mt-3 space-y-4">
          {/* balances + market status */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Cash" value={`$${snap.cash.toLocaleString()}`} />
            <Stat label="Buying Power" value={`$${snap.buyingPower.toLocaleString()}`} />
            <Stat label="Positions" value={String(snap.positions.length)} />
            <Stat label={snap.marketStatus.market} value={snap.marketStatus.isOpen ? "Open" : "Closed"} sub={snap.marketStatus.session} />
          </div>

          {/* positions */}
          <div>
            <SubHead>Open Positions</SubHead>
            {snap.positions.length === 0 ? <Empty>None.</Empty> : (
              <table className="mt-2 w-full text-[12px]">
                <thead><tr className="text-faint">
                  <th className="text-left font-medium">Symbol</th><th className="text-right font-medium">Qty</th>
                  <th className="text-right font-medium">Avg</th><th className="text-right font-medium">Mkt Val</th><th className="text-right font-medium">P/L</th>
                </tr></thead>
                <tbody>
                  {snap.positions.map((p) => (
                    <tr key={p.symbol} className="border-t border-line">
                      <td className="py-1 text-ink">{p.symbol}</td>
                      <td className="py-1 text-right text-muted">{p.quantity}</td>
                      <td className="py-1 text-right text-muted">{p.avgPrice}</td>
                      <td className="py-1 text-right text-ink">${p.marketValue.toLocaleString()}</td>
                      <td className={`py-1 text-right ${p.unrealizedPnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {p.unrealizedPnl >= 0 ? "+" : ""}{p.unrealizedPnl}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* orders + trades */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><SubHead>Orders</SubHead>{snap.orders.length === 0 ? <Empty>No open orders (connection only).</Empty> : null}</div>
            <div><SubHead>Trade History</SubHead>{snap.trades.length === 0 ? <Empty>No trades yet.</Empty> : null}</div>
          </div>
          <p className="text-[11px] text-faint">Connection only — no order placement in this phase.</p>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
      {sub && <p className="text-[10px] text-muted">{sub}</p>}
    </div>
  );
}
function SubHead({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">{children}</p>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[13px] text-muted">{children}</p>;
}
