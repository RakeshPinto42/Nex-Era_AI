"use client";

// New Business Opportunity Engine — white-space (from catalogs) + adjacency attaches
// + strategic expansion. Evidence-based; sizing needs Sonny's internal data.

import { useEffect, useMemo } from "react";
import { useCi } from "../context";
import { readCatalogs } from "../catalogs";
import { buildNewBusiness, type NewBizOpp } from "@/lib/finance-os/ci/engines/new-business";
import { Card } from "./ui";
import { EngineEmpty } from "./EngineEmpty";

const PRIO_TONE = { High: "bg-emerald-500/15 text-emerald-300", Medium: "bg-amber-500/15 text-amber-300", Low: "bg-fos-surface2 text-fos-muted" };
const BASIS_LABEL = { catalog: "from catalog", adjacency: "industry adjacency", strategic: "strategic" };

export function NewBusiness() {
  const { setModuleRecs } = useCi();
  const cat = useMemo(() => readCatalogs(), []);
  const opps = useMemo(() => buildNewBusiness(cat.sonnys, cat.competitors), [cat]);

  useEffect(() => {
    setModuleRecs(
      "new-business",
      opps.filter((o) => o.priority === "High").slice(0, 4).map((o) => ({
        id: `nb-${o.title}`,
        module: "new-business",
        title: o.title,
        rationale: o.evidence,
        risk: "Medium" as const,
        priority: 42,
      })),
    );
  }, [opps, setModuleRecs]);

  if (!cat.hasAny) return <EngineEmpty note="Research Sonny's + competitors — white-space opportunities come from catalog gaps." />;

  const whiteSpace = opps.filter((o) => o.basis === "catalog");
  const adjacency = opps.filter((o) => o.basis === "adjacency");
  const strategic = opps.filter((o) => o.basis === "strategic");

  return (
    <div className="space-y-5">
      <Group title="White-Space (competitors sell, Sonny's doesn't)" opps={whiteSpace} empty="No category white-space found in the current catalogs." />
      <Group title="Adjacency Attaches (service · chemical · reclaim · subscription)" opps={adjacency} />
      <Group title="Strategic Expansion" opps={strategic} />
      <p className="font-mono text-[10px] text-fos-faint">Revenue sizing needs Sonny&apos;s internal customer/sales data (add locally later). These are evidence- and framework-based, not dollar estimates.</p>
    </div>
  );
}

function Group({ title, opps, empty }: { title: string; opps: NewBizOpp[]; empty?: string }) {
  return (
    <Card title={title}>
      {opps.length === 0 ? (
        <p className="text-sm text-fos-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {opps.map((o, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-fos-border bg-fos-bg p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fos-text">{o.title}</p>
                <p className="mt-0.5 text-[12px] text-fos-muted">{o.evidence}</p>
                <p className="mt-1 font-mono text-[10px] text-fos-faint">{o.type} · {BASIS_LABEL[o.basis]}</p>
              </div>
              <span className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIO_TONE[o.priority]}`}>{o.priority}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
