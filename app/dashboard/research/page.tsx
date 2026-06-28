import { ResearchProvider } from "@/components/research/store";
import ResearchHub from "@/components/research/ResearchHub";

export const metadata = { title: "NEXERA — Research Hub" };

export default function ResearchPage() {
  return (
    <ResearchProvider>
      <ResearchHub />
    </ResearchProvider>
  );
}
