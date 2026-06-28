// Golden test cases — FIXED commission plans, transactions and inputs. The
// engine's output for these is captured in `expected.json`; any future change
// that alters these results must be reviewed and the golden re-blessed
// (GOLDEN_UPDATE=1). This is the backward-compatibility / payout-regression guard.
//
// At Milestone 1 the stages are identity stubs, so the captured output is the
// deterministic run structure (hashes + empty working set). As real Validation /
// Crediting / Calculation stages land, the golden captures the actual PayoutLines
// — and these same fixed inputs guarantee no silent payout regressions.

import {
  EMPTY_COMMISSION_DATA, type CommissionData, type Period, type PlanVersionId,
} from "@/lib/finance-os/commission/studio/model";

const at = "2026-01-01T00:00:00.000Z";
const period: Period = {
  id: "2026-Q2", label: "FY26 Q2", type: "quarter", fiscalYear: "FY26",
  start: "2026-04-01", end: "2026-06-30", status: "open", reportingCurrency: "USD",
  createdAt: at, createdBy: "seed",
};

function base(over: Partial<CommissionData>): CommissionData {
  return { ...structuredClone(EMPTY_COMMISSION_DATA), ...over };
}

export type GoldenCase = { name: string; period: Period; planVersionIds: PlanVersionId[]; data: CommissionData };

export const CASES: GoldenCase[] = [
  {
    name: "01-empty",
    period,
    planVersionIds: [],
    data: base({}),
  },
  {
    name: "02-basic-percent-plan",
    period,
    planVersionIds: ["pv-ae-1"],
    data: base({
      plans: [{ id: "plan-ae", name: "AE — Enterprise", segment: "AE", status: "active", currentVersionId: "pv-ae-1", createdAt: at, createdBy: "seed" }],
      planVersions: [{
        id: "pv-ae-1", planId: "plan-ae", version: 1, status: "published",
        effectiveFrom: "2026-04-01",
        components: { rules: ["rule-1"], rateTables: ["rt-1"], quotas: ["q-1"], territories: [], accelerators: [], draws: [], guarantees: [], creditRules: ["cr-1"] },
        eligibility: { roles: ["payee"] }, createdAt: at, createdBy: "seed",
      }],
      rateTables: [{
        id: "rt-1", key: "rt", version: 1, status: "published", effectiveFrom: "2026-04-01",
        name: "Flat 10%", basis: "amount", currency: "USD",
        tiers: [{ id: "t1", fromAmt: 0, rate: 10, rateType: "percent" }], createdAt: at, createdBy: "seed",
      }],
      quotas: [{ id: "q-1", key: "q", version: 1, status: "published", effectiveFrom: "2026-04-01", name: "AE Quota", periodId: "2026-Q2", measure: "revenue", currency: "USD", createdAt: at, createdBy: "seed" }],
      quotaTargets: [{ id: "qt-1", quotaId: "q-1", periodId: "2026-Q2", payeeId: "payee-1", amount: 100000 }],
      creditRules: [{ id: "cr-1", key: "cr", version: 1, status: "published", effectiveFrom: "2026-04-01", name: "Direct credit", creditType: "direct", match: [], allocations: [{ id: "a1", role: "payee", pct: 100 }], createdAt: at, createdBy: "seed" }],
      rules: [{ id: "rule-1", key: "rule", version: 1, status: "published", effectiveFrom: "2026-04-01", name: "Pay 10% of revenue", kind: "payout", conditions: [], action: { type: "payout", rateTableId: "rt-1", basis: "amount" }, createdAt: at, createdBy: "seed" }],
      payees: [{ id: "payee-1", name: "Alex Rep", employeeId: "E001", email: "alex@x.co", status: "active", hireDate: "2025-01-01", planIds: ["plan-ae"], createdAt: at, createdBy: "seed" }],
      transactions: [
        { id: "tx-1", externalId: "INV-1", date: "2026-04-10", periodId: "2026-Q2", amount: 20000, currency: "USD", ownerPayeeId: "payee-1", productId: "P1", accountId: "ACME" },
        { id: "tx-2", externalId: "INV-2", date: "2026-05-12", periodId: "2026-Q2", amount: 35000, currency: "USD", ownerPayeeId: "payee-1", productId: "P2", accountId: "GLOBEX" },
        { id: "tx-3", externalId: "INV-3", date: "2026-06-20", periodId: "2026-Q2", amount: 45000, currency: "USD", ownerPayeeId: "payee-1", productId: "P1", accountId: "INITECH" },
      ],
    }),
  },
  {
    name: "03-multi-currency",
    period,
    planVersionIds: ["pv-ae-1"],
    data: base({
      fxRates: [{ id: "fx-1", fromCurrency: "EUR", toCurrency: "USD", rate: 1.1, effectiveFrom: "2026-04-01", periodId: "2026-Q2" }],
      payees: [{ id: "payee-1", name: "Alex Rep", employeeId: "E001", email: "alex@x.co", status: "active", hireDate: "2025-01-01", planIds: ["plan-ae"], createdAt: at, createdBy: "seed" }],
      transactions: [
        { id: "tx-usd", externalId: "U-1", date: "2026-04-10", periodId: "2026-Q2", amount: 10000, currency: "USD", ownerPayeeId: "payee-1" },
        { id: "tx-eur", externalId: "E-1", date: "2026-05-10", periodId: "2026-Q2", amount: 10000, currency: "EUR", ownerPayeeId: "payee-1" },
      ],
    }),
  },
];
