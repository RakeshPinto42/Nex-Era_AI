import { WorkspaceProvider } from "@/components/workspace/store";

export const metadata = {
  title: "NEXERA — Workspace Agent",
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}
