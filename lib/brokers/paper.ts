/**
 * Broker Center — Paper Trading adapter (Phase 13).
 *
 * A deterministic mock broker for connection + read-only snapshots. No real
 * provider, no real money, no order placement. Lets the Broker Center work
 * end-to-end before any live integration exists.
 */

import type { BrokerAdapter, ConnectResult } from "./adapter";
import type { AccountSnapshot, BrokerConnection, MarketStatus } from "./types";

function usMarketStatus(): MarketStatus {
  const now = new Date();
  const day = now.getUTCDay(); // 0 Sun .. 6 Sat
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const open = 13 * 60 + 30; // 13:30 UTC ≈ 09:30 ET
  const close = 20 * 60; // 20:00 UTC ≈ 16:00 ET
  const weekday = day >= 1 && day <= 5;
  const isOpen = weekday && mins >= open && mins < close;
  const session: MarketStatus["session"] = !weekday
    ? "closed"
    : mins < open
      ? "pre"
      : mins < close
        ? "regular"
        : "post";
  return { market: "US Equities", isOpen, session, nextChange: isOpen ? "16:00 ET" : "09:30 ET" };
}

export const paperBrokerAdapter: BrokerAdapter = {
  brokerId: "paper",
  async connect(): Promise<ConnectResult> {
    return {
      ok: true,
      connection: {
        brokerId: "paper",
        accountId: `PAPER-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        type: "paper",
        connectedAt: new Date().toISOString(),
        status: "connected",
      },
    };
  },
  async getSnapshot(connection: BrokerConnection): Promise<AccountSnapshot> {
    const positions = [
      { symbol: "AAPL", quantity: 25, avgPrice: 180, marketValue: 4750, unrealizedPnl: 250 },
      { symbol: "VOO", quantity: 10, avgPrice: 420, marketValue: 4350, unrealizedPnl: 150 },
      { symbol: "BTC", quantity: 0.05, avgPrice: 60000, marketValue: 3200, unrealizedPnl: 200 },
    ];
    const cash = 25000;
    return {
      account: {
        brokerId: "paper",
        accountId: connection.accountId,
        name: "Paper Trading Account",
        currency: "USD",
        type: "paper",
        status: "active",
      },
      cash,
      buyingPower: cash * 2, // paper margin
      positions,
      orders: [], // connection only — no orders
      trades: [], // no trade history yet
      marketStatus: usMarketStatus(),
    };
  },
};
