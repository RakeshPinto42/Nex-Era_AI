import { DashboardProvider } from "@/components/dashboard/store";
import Chrome from "@/components/dashboard/Chrome";
import BootGate from "@/components/boot/BootGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <BootGate>
        <Chrome>{children}</Chrome>
      </BootGate>
    </DashboardProvider>
  );
}
