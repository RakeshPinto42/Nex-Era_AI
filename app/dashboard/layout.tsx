import { DashboardProvider } from "@/components/dashboard/store";
import Chrome from "@/components/dashboard/Chrome";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <Chrome>{children}</Chrome>
    </DashboardProvider>
  );
}
