import { Shell } from "@/components/finance-os/Shell";

export const metadata = { title: "NEXERA — Ledger" };

export default function FinanceOsLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
