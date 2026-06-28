/**
 * Broker Tools — the gateway between the Investment Hub and brokers.
 *
 * Agents resolve adapters here; they never instantiate provider clients. Only
 * Paper Trading is implemented in Phase 13; other brokers are registered but
 * not yet connectable. Connection only — no trading.
 */

import type { BrokerAdapter } from "./adapter";
import type { BrokerId } from "./types";
import { paperBrokerAdapter } from "./paper";

const ADAPTERS: Partial<Record<BrokerId, BrokerAdapter>> = {
  paper: paperBrokerAdapter,
};

export function getBrokerAdapter(id: BrokerId): BrokerAdapter | undefined {
  return ADAPTERS[id];
}

export function isConnectable(id: BrokerId): boolean {
  return !!ADAPTERS[id];
}

export { paperBrokerAdapter };
export type { BrokerAdapter, ConnectResult } from "./adapter";
