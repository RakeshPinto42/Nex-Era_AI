// Canonicalize a CommissionData snapshot: sort every collection by stable `id`.
// Imports arrive in arbitrary order (Excel/SAP); canonicalization guarantees
// that DIFFERENT INPUT ORDER PRODUCES IDENTICAL OUTPUT — same logical dataset ⇒
// same snapshot hash ⇒ same run. Pure; returns a new object (inputs untouched).

import type { CommissionData } from "../model";

type WithId = { id: string };
const byId = (a: WithId, b: WithId) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const s = <T extends WithId>(arr: T[]): T[] => [...arr].sort(byId);

export function canonicalizeData(d: CommissionData): CommissionData {
  return {
    periods: s(d.periods), plans: s(d.plans), planVersions: s(d.planVersions),
    rules: s(d.rules), rateTables: s(d.rateTables), quotas: s(d.quotas),
    quotaTargets: s(d.quotaTargets), territories: s(d.territories), creditRules: s(d.creditRules),
    accelerators: s(d.accelerators), draws: s(d.draws), guarantees: s(d.guarantees),
    payees: s(d.payees), positions: s(d.positions), hierarchies: s(d.hierarchies),
    importBatches: s(d.importBatches), fxRates: s(d.fxRates), transactions: s(d.transactions),
    credits: s(d.credits), runs: s(d.runs), payoutLines: s(d.payoutLines),
    statements: s(d.statements), disputes: s(d.disputes), adjustments: s(d.adjustments),
    approvals: s(d.approvals), auditEvents: s(d.auditEvents),
  };
}
