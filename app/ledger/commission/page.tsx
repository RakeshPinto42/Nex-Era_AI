import { FlagshipPlaceholder } from "@/components/finance/FlagshipPlaceholder";
import { FINANCE_APPS } from "@/lib/finance-os/apps";

export const metadata = { title: "Finance OS — Commission Studio" };

const app = FINANCE_APPS.find((a) => a.slug === "commission")!;

export default function CommissionStudioPage() {
  return (
    <FlagshipPlaceholder
      slug={app.slug}
      planned={[
        "Plan Designer — visual Compensation Configurator (rules, tiers, rate tables)",
        "Calculation runs over real transactions, with traceability",
        "Payee detail — credits, attainment, payout, statement history",
        "Quota management & automated approvals by hierarchy",
        "Dispute resolution workflow",
        "Branded payee statements + audit",
      ]}
    />
  );
}
