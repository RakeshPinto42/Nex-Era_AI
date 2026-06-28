"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import RightPanel from "./RightPanel";
import Drawer from "@/components/ui/Drawer";
import { PageTransition } from "@/components/fx";

export default function Chrome({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const path = usePathname();

  // Close the mobile drawer on navigation.
  useEffect(() => setNavOpen(false), [path]);

  // The Studio brings its own reasoning/artifacts rail — suppress the global one.
  const hideRightPanel =
    path.startsWith("/dashboard/studio") ||
    path.startsWith("/dashboard/research") ||
    path.startsWith("/dashboard/worlds") ||
    path.startsWith("/dashboard/home");

  return (
    <div className="relative flex h-screen overflow-hidden bg-canvas text-ink" style={{ colorScheme: "light" }}>
      {/* desktop sidebar (hidden < lg) */}
      <Sidebar />

      {/* mobile drawer */}
      <Drawer open={navOpen} onClose={() => setNavOpen(false)} label="Navigation">
        <Sidebar variant="drawer" onNavigate={() => setNavOpen(false)} />
      </Drawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setNavOpen(true)} />
        <div className="flex min-h-0 flex-1">
          <section className="min-w-0 flex-1">
            <PageTransition routeKey={path}>{children}</PageTransition>
          </section>
          {!hideRightPanel && <RightPanel />}
        </div>
      </div>
    </div>
  );
}
