"use client";

// Commercial Intelligence — the flagship Ledger module, built as a strategy command
// center: left Scope rail · center Analysis workspace (sub-module tabs) · right
// Recommendations panel (always visible). Deep-blue theme. Every sub-module emits
// recommendations so the panel always answers "what should we do next?".

import { useState } from "react";
import { CI_MODULES, CI_REGIONS, CI_REGION_ALL, type CiModuleSlug } from "@/lib/finance-os/ci/types";
import { cn } from "@/lib/utils";
import { CiProvider, useCi } from "./context";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { CompetitorIntelligence } from "./modules/CompetitorIntelligence";
import { PositioningEngine } from "./modules/PositioningEngine";
import { SkuComparison } from "./modules/SkuComparison";
import { PricingStrategy } from "./modules/PricingStrategy";
import { NewBusiness } from "./modules/NewBusiness";
import { NewsCenter } from "./modules/NewsCenter";
import { ExecutiveActionCenter } from "./modules/ExecutiveActionCenter";
import { Placeholder } from "./modules/Placeholder";

const BLUE = "#1e40af";

export function CommercialIntelligence() {
  return (
    <CiProvider>
      <Workspace />
    </CiProvider>
  );
}

function Workspace() {
  const [active, setActive] = useState<CiModuleSlug>("research");
  const mod = CI_MODULES.find((m) => m.slug === active)!;

  return (
    <div className="flex h-full flex-col bg-fos-bg text-fos-text">
      {/* command-center header band */}
      <header className="flex items-center gap-3 px-6 py-4 text-white" style={{ background: `linear-gradient(115deg, ${BLUE}, #172554)` }}>
        <span className="h-9 w-1.5 flex-none rounded-full bg-white/55" />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">Commercial Intelligence</h1>
          <p className="text-sm text-white/75">Compare products, optimize pricing, maximize margins and improve commercial performance.</p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <ScopeRail />

        {/* center: analysis workspace */}
        <main className="flex min-w-0 flex-1 flex-col">
          <nav className="flex flex-none gap-1 overflow-x-auto border-b border-fos-border bg-fos-surface px-3 py-2">
            {CI_MODULES.map((m) => (
              <button
                key={m.slug}
                onClick={() => setActive(m.slug)}
                className={cn(
                  "flex-none rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active === m.slug ? "text-white" : "text-fos-muted hover:bg-fos-surface2 hover:text-fos-text",
                )}
                style={active === m.slug ? { backgroundColor: BLUE } : undefined}
              >
                {m.name}
                {!m.ready && <span className="ml-1.5 text-[10px] opacity-60">soon</span>}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {mod.ready ? <ModuleBody slug={active} /> : <Placeholder mod={mod} />}
          </div>
        </main>

        <RecommendationsPanel />
      </div>
    </div>
  );
}

function ModuleBody({ slug }: { slug: CiModuleSlug }) {
  switch (slug) {
    case "research":
      return <CompetitorIntelligence />;
    case "positioning":
      return <PositioningEngine />;
    case "sku-comparison":
      return <SkuComparison />;
    case "pricing-strategy":
      return <PricingStrategy />;
    case "new-business":
      return <NewBusiness />;
    case "news-center":
      return <NewsCenter />;
    case "executive-action":
      return <ExecutiveActionCenter />;
    default:
      return null;
  }
}

function ScopeRail() {
  const { region, setRegion } = useCi();
  return (
    <aside className="hidden w-[200px] flex-none flex-col border-r border-fos-border bg-fos-surface p-4 lg:flex">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fos-muted">Analysis Scope</p>

      <p className="mt-4 mb-1.5 text-xs font-medium text-fos-text">Region</p>
      <div className="flex flex-col gap-1">
        {[CI_REGION_ALL, ...CI_REGIONS].map((reg) => (
          <button
            key={reg}
            onClick={() => setRegion(reg)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
              region === reg ? "bg-blue-500/15 text-blue-200" : "text-fos-muted hover:bg-fos-surface2 hover:text-fos-text",
            )}
          >
            {reg}
          </button>
        ))}
      </div>

      <p className="mt-auto pt-4 text-[11px] leading-snug text-fos-faint">
        Scope drives every analysis. More dimensions (product, segment, period) land with each sub-module.
      </p>
    </aside>
  );
}
