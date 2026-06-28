/**
 * Broker Center — types (Investment Hub Phase 13).
 *
 * Broker abstraction. Agents (Investment Intelligence, future Trading Agent)
 * NEVER connect to brokers directly — everything goes through Broker Tools.
 * Connection only in Phase 13: NO order placement, NO trading.
 */

export type BrokerId =
  | "paper"
  | "interactive-brokers"
  | "alpaca"
  | "zerodha"
  | "angel-one"
  | "upstox"
  | "binance"
  | "coinbase"
  | "bybit";

export type AssetClass = "stocks" | "etf" | "options" | "futures" | "crypto";

export type BrokerAuthType = "oauth" | "api_key" | "credentials" | "none";

export type BrokerStatus = "available" | "planned";

export type BrokerCapability =
  | "auth"
  | "account"
  | "cash"
  | "buying_power"
  | "positions"
  | "orders"
  | "trade_history"
  | "market_status";

export type BrokerDescriptor = {
  id: BrokerId;
  name: string;
  icon: string;
  region: string;
  assetClasses: AssetClass[];
  authType: BrokerAuthType;
  status: BrokerStatus;
  capabilities: BrokerCapability[];
};

// ---- account + holdings (read-only snapshots) ----

export type BrokerAccount = {
  brokerId: BrokerId;
  accountId: string;
  name: string;
  currency: string;
  type: "paper" | "live";
  status: "active" | "restricted";
};

export type Position = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  marketValue: number;
  unrealizedPnl: number;
};

export type Order = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  type: "market" | "limit";
  status: "open" | "filled" | "cancelled";
  createdAt: string;
};

export type Trade = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  at: string;
};

export type MarketStatus = {
  market: string;
  isOpen: boolean;
  session: "pre" | "regular" | "post" | "closed";
  nextChange: string;
};

/** Full read-only account snapshot a Broker Tool returns. */
export type AccountSnapshot = {
  account: BrokerAccount;
  cash: number;
  buyingPower: number;
  positions: Position[];
  orders: Order[];
  trades: Trade[];
  marketStatus: MarketStatus;
};

export type BrokerConnection = {
  brokerId: BrokerId;
  accountId: string;
  type: "paper" | "live";
  connectedAt: string;
  status: "connected" | "error";
};
