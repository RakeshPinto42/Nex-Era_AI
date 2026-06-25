"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import RightPanel from "./RightPanel";
import Drawer from "@/components/ui/Drawer";

export default function Chrome({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const path = usePathname();

  // Close the mobile drawer on navigation.
  useEffect(() => setNavOpen(false), [path]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-obsidian text-white" style={{ colorScheme: "dark" }}>
      {/* ambient — a single soft brand wash at the top, nothing busy */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-15%] h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand/[0.06] to-violet/[0.06] blur-[120px]" />
      </div>

      {/* desktop sidebar (hidden < lg) */}
      <Sidebar />

      {/* mobile drawer */}
      <Drawer open={navOpen} onClose={() => setNavOpen(false)} label="Navigation">
        <Sidebar variant="drawer" onNavigate={() => setNavOpen(false)} />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setNavOpen(true)} />
        <div className="flex min-h-0 flex-1">
          <section className="min-w-0 flex-1">{children}</section>
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
