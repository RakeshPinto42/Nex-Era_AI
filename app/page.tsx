import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import WorkspaceLauncher from "@/components/WorkspaceLauncher";
import TerminalDemo from "@/components/TerminalDemo";
import FeatureGrid from "@/components/FeatureGrid";
import AIRouter from "@/components/AIRouter";
import Subnets from "@/components/Subnets";
import FinanceOS from "@/components/FinanceOS";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Ambient background — technical grid + a single signal source.
          The live mesh (Hero) carries the color; no stacked glow blobs. */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-fade bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] opacity-50" />
        <div className="absolute left-1/2 top-[-12%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-navy/[0.07] blur-[150px]" />
      </div>

      <Nav />
      <Hero />
      <WorkspaceLauncher />
      <TerminalDemo />
      <FeatureGrid />
      <AIRouter />
      <Subnets />
      <FinanceOS />
      <Footer />
    </main>
  );
}
