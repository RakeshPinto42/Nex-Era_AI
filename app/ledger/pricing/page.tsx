import { FlagshipPlaceholder } from "@/components/finance/FlagshipPlaceholder";
import { FINANCE_APPS } from "@/lib/finance-os/apps";

export const metadata = { title: "Finance OS — Pricing Studio" };

const app = FINANCE_APPS.find((a) => a.slug === "pricing")!;

export default function PricingStudioPage() {
  return (
    <FlagshipPlaceholder
      slug={app.slug}
      planned={[
        "Price waterfall — list → pocket margin",
        "Margin bridge — price / volume / mix / cost",
        "Deal & product price guidance bands",
        "Scenario planner with margin impact",
        "AI pricing recommendations",
        "Approval workflow with thresholds",
      ]}
    />
  );
}
