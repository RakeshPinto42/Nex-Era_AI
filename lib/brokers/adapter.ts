/**
 * Broker Center — adapter interface (Phase 13).
 *
 * The seam every broker integration implements. CONNECTION ONLY — there is no
 * order-placement method here by design (no trading in Phase 13). Future
 * brokers implement this so agents stay decoupled from providers.
 */

import type { AccountSnapshot, BrokerConnection, BrokerId } from "./types";

export type ConnectResult =
  | { ok: true; connection: BrokerConnection }
  | { ok: false; error: string };

export interface BrokerAdapter {
  readonly brokerId: BrokerId;
  /** Authenticate / establish a connection. No trading. */
  connect(credentials?: Record<string, string>): Promise<ConnectResult>;
  /** Read-only account snapshot for a live connection. */
  getSnapshot(connection: BrokerConnection): Promise<AccountSnapshot>;
}
