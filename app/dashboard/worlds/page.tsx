import { WorldsProvider } from "@/components/worlds/store";
import WorldsApp from "@/components/worlds/WorldsApp";

export const metadata = { title: "NEXERA — Worlds" };

export default function WorldsPage() {
  return (
    <WorldsProvider>
      <WorldsApp />
    </WorldsProvider>
  );
}
