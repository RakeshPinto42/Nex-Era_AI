import { FlagshipPlaceholder } from "@/components/finance/FlagshipPlaceholder";
import { FINANCE_APPS } from "@/lib/finance-os/apps";

export const metadata = { title: "Finance OS — Commentary AI" };

const app = FINANCE_APPS.find((a) => a.slug === "commentary")!;

export default function CommentaryAiPage() {
  return (
    <FlagshipPlaceholder
      slug={app.slug}
      planned={[
        "Template gallery — monthly, quarterly, board, variance",
        "Finance-grade narrative editor",
        "Fact-linked figures (no hallucinated numbers)",
        "Tone controls — CFO / board / operational",
        "Review & approve with version compare",
        "Export Word · PowerPoint (speaker notes) · PDF",
      ]}
    />
  );
}
