// Shared fixtures for the Commission Engine tests. NOT a test file (no `.test`),
// so vitest does not collect it as a suite.

import { EMPTY_COMMISSION_DATA, type CommissionData, type Period, type Transaction } from "@/lib/finance-os/commission/studio/model";

export const PERIOD: Period = {
  id: "2026-06", label: "Jun 2026", type: "month", fiscalYear: "FY26",
  start: "2026-06-01", end: "2026-06-30", status: "open",
  createdAt: "2026-06-01T00:00:00.000Z", createdBy: "test",
};

export function makeTransaction(i: number, over: Partial<Transaction> = {}): Transaction {
  return {
    id: `tx${i}`,
    externalId: `EXT-${i}`,
    date: `2026-06-${String((i % 28) + 1).padStart(2, "0")}`,
    periodId: PERIOD.id,
    amount: 1000 + i * 137.5,
    currency: "USD",
    quantity: 10 + i,
    productId: `P${i % 3}`,
    accountId: `A${i % 4}`,
    region: ["NA", "EMEA", "APAC"][i % 3],
    ownerPayeeId: `payee${i % 5}`,
    ...over,
  };
}

export function makeData(txCount = 8, over: Partial<CommissionData> = {}): CommissionData {
  const transactions = Array.from({ length: txCount }, (_, i) => makeTransaction(i));
  return { ...structuredClone(EMPTY_COMMISSION_DATA), transactions, ...over };
}
