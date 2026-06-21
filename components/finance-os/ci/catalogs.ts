"use client";

// Reads the latest researched catalog for Sonny's (home) + each competitor from the
// local tracking store, shaped for the engines. Call inside a useMemo on mount.

import { getRecord } from "@/lib/finance-os/ci/agent/store";
import { HOME, COMPETITORS, type EntityCatalog } from "@/lib/finance-os/ci/sonnys";

export function readCatalogs(): { sonnys: EntityCatalog; competitors: EntityCatalog[]; hasAny: boolean; sonnysReady: boolean } {
  const homeRec = getRecord(HOME);
  const sonnys: EntityCatalog = { name: HOME, products: homeRec?.snapshots[0]?.products ?? [], isHome: true };
  const competitors: EntityCatalog[] = COMPETITORS.map((n) => {
    const r = getRecord(n);
    return { name: n, products: r?.snapshots[0]?.products ?? [] };
  });
  const hasAny = sonnys.products.length > 0 || competitors.some((c) => c.products.length > 0);
  return { sonnys, competitors, hasAny, sonnysReady: sonnys.products.length > 0 };
}
