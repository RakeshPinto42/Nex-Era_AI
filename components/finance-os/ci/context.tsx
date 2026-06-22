"use client";

// Command-center shared state: the analysis Scope (region etc.) selected in the
// left rail, plus a Recommendation registry every sub-module writes into so the
// right-hand panel — and later the Executive Strategy Center — can aggregate.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Recommendation } from "@/lib/finance-os/ci/types";
import { CI_REGION_ALL, rankRecommendations } from "@/lib/finance-os/ci/types";

type CiCtx = {
  region: string;
  setRegion: (r: string) => void;
  /** Replace one module's recommendations (called by each sub-module). */
  setModuleRecs: (module: string, recs: Recommendation[]) => void;
  recsByModule: Record<string, Recommendation[]>;
  allRecs: Recommendation[];
};

const Ctx = createContext<CiCtx | null>(null);

export function CiProvider({ children }: { children: ReactNode }) {
  const [region, setRegion] = useState<string>(CI_REGION_ALL);
  const [recsByModule, setRecsByModule] = useState<Record<string, Recommendation[]>>({});

  const setModuleRecs = useCallback((module: string, recs: Recommendation[]) => {
    setRecsByModule((prev) => {
      // Skip the state write when nothing changed — sub-modules call this from an
      // effect on every recompute, and a no-op update would loop.
      const prevRecs = prev[module];
      if (prevRecs && sameRecs(prevRecs, recs)) return prev;
      return { ...prev, [module]: recs };
    });
  }, []);

  const allRecs = useMemo(
    () => rankRecommendations(Object.values(recsByModule).flat()),
    [recsByModule],
  );

  const value = useMemo<CiCtx>(
    () => ({ region, setRegion, setModuleRecs, recsByModule, allRecs }),
    [region, setModuleRecs, recsByModule, allRecs],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCi(): CiCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCi must be used within CiProvider");
  return ctx;
}

function sameRecs(a: Recommendation[], b: Recommendation[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((r, i) => r.title === b[i].title && r.marginGain === b[i].marginGain && r.risk === b[i].risk);
}
