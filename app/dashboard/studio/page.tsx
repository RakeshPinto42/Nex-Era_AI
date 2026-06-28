import { StudioProvider } from "@/components/studio/store";
import StudioShell from "@/components/studio/StudioShell";

export const metadata = { title: "NEXERA — AI Studio" };

export default function StudioPage() {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  );
}
