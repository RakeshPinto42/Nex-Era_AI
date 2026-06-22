"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import ModuleNav from "./ModuleNav";
import TopBar from "./TopBar";
import AIAssistant from "./AIAssistant";
import Drawer from "@/components/ui/Drawer";

export default function FpaShell({ children }: { children: React.ReactNode }) {
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const path = usePathname();

  useEffect(() => setNavOpen(false), [path]);

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f6f7f9] text-ink">
      {/* floating gradients */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[14%] top-[-10%] h-[420px] w-[520px] rounded-full bg-navy/10 blur-[150px]" />
        <div className="absolute bottom-[-12%] right-[10%] h-[420px] w-[520px] rounded-full bg-ice/10 blur-[150px]" />
        <div className="absolute inset-0 bg-grid-fade bg-[size:56px_56px] opacity-[0.3] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
      </div>

      {/* desktop nav */}
      <div className="hidden lg:block">
        <ModuleNav />
      </div>

      {/* mobile drawer nav */}
      <Drawer open={navOpen} onClose={() => setNavOpen(false)} label="FP&A modules">
        <ModuleNav />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          assistantOpen={assistantOpen}
          onToggleAssistant={() => setAssistantOpen((v) => !v)}
          onMenu={() => setNavOpen(true)}
        />
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto p-5">{children}</main>
          <AIAssistant open={assistantOpen} />
        </div>
      </div>
    </div>
  );
}
