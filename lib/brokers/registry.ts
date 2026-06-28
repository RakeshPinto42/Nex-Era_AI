/**
 * Broker Center — registry (Phase 13).
 *
 * Metadata for every supported broker. Only Paper Trading is "available" now;
 * the rest are "planned" — registered so future integrations plug into Broker
 * Tools without touching agents. Connection only; no trading.
 */

import type { BrokerDescriptor, BrokerId, BrokerCapability } from "./types";

const ALL_CAPS: BrokerCapability[] = [
  "auth", "account", "cash", "buying_power", "positions", "orders", "trade_history", "market_status",
];

export const BROKER_REGISTRY: BrokerDescriptor[] = [
  {
    id: "paper",
    name: "Paper Trading",
    icon: "🧪",
    region: "Global",
    assetClasses: ["stocks", "etf", "crypto"],
    authType: "none",
    status: "available",
    capabilities: ALL_CAPS,
  },
  {
    id: "interactive-brokers",
    name: "Interactive Brokers",
    icon: "🏦",
    region: "Global",
    assetClasses: ["stocks", "etf", "options", "futures"],
    authType: "oauth",
    status: "planned",
    capabilities: ALL_CAPS,
  },
  {
    id: "alpaca",
    name: "Alpaca",
    icon: "🦙",
    region: "US",
    assetClasses: ["stocks", "etf", "crypto"],
    authType: "api_key",
    status: "planned",
    capabilities: ALL_CAPS,
  },
  {
    id: "zerodha",
    name: "Zerodha",
    icon: "🇮🇳",
    region: "India",
    assetClasses: ["stocks", "etf", "futures", "options"],
    authType: "oauth",
    status: "planned",
    capabilities: ALL_CAPS,
  },
  {
    id: "angel-one",
    name: "Angel One",
    icon: "🇮🇳",
    region: "India",
    assetClasses: ["stocks", "etf", "futures", "options"],
    authType: "api_key",
    status: "planned",
    capabilities: ALL_CAPS,
  },
  {
    id: "upstox",
    name: "Upstox",
    icon: "🇮🇳",
    region: "India",
    assetClasses: ["stocks", "etf", "futures", "options"],
    authType: "oauth",
    status: "planned",
    capabilities: ALL_CAPS,
  },
  {
    id: "binance",
    name: "Binance",
    icon: "🟡",
    region: "Global",
    assetClasses: ["crypto"],
    authType: "api_key",
    status: "planned",
    capabilities: ALL_CAPS,
  },
  {
    id: "coinbase",
    name: "Coinbase",
    icon: "🔵",
    region: "Global",
    assetClasses: ["crypto"],
    authType: "oauth",
    status: "planned",
    capabilities: ALL_CAPS,
  },
  {
    id: "bybit",
    name: "Bybit",
    icon: "🟠",
    region: "Global",
    assetClasses: ["crypto"],
    authType: "api_key",
    status: "planned",
    capabilities: ALL_CAPS,
  },
];

export function getBroker(id: BrokerId): BrokerDescriptor | undefined {
  return BROKER_REGISTRY.find((b) => b.id === id);
}
