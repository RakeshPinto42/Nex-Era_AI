import FpaShell from "@/components/fpa/FpaShell";

export const metadata = {
  title: "NEXERA FP&A OS",
  description: "AI operating system for Commercial and Corporate FP&A.",
};

export default function FpaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FpaShell>{children}</FpaShell>;
}
