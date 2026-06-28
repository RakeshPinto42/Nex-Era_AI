import { FlagshipPlaceholder } from "@/components/finance/FlagshipPlaceholder";
import { FINANCE_APPS } from "@/lib/finance-os/apps";

export const metadata = { title: "Finance OS — Executive Dashboard" };

const app = FINANCE_APPS.find((a) => a.slug === "")!;

export default function ExecutiveDashboardPage() {
  return (
    <FlagshipPlaceholder
      slug={app.slug}
      planned={[
        "Finance KPIs — revenue, margin, OpEx, EBITDA vs plan",
        "Recent projects across the five studios",
        "Recent reports & exports",
        "AI alerts — material variances, margin breaches, deadlines",
        "Quick-launch shortcuts into every studio",
      ]}
    />
  );
}
