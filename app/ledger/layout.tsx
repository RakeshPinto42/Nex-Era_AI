import { FinanceShell } from "@/components/finance/FinanceShell";

export const metadata = { title: "Finance OS — NEXERA" };

export default function FinanceOsLayout({ children }: { children: React.ReactNode }) {
  return <FinanceShell>{children}</FinanceShell>;
}
