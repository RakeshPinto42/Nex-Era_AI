"use client";

// Shown for CI sub-modules whose engine isn't built yet. Not an empty state — it
// states the module's purpose so the command center reads as complete and the
// build roadmap is visible in-product.

import { Construction } from "lucide-react";
import type { CiModuleDef } from "@/lib/finance-os/ci/types";

export function Placeholder({ mod }: { mod: CiModuleDef }) {
  return (
    <div className="grid h-full place-items-center py-20">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
          <Construction size={22} />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-fos-text">{mod.name}</h3>
        <p className="mt-1 text-sm text-fos-muted">{mod.desc}</p>
        <p className="mt-3 text-xs text-fos-faint">On the build roadmap — ships next, computing from the researched catalogs (plus your cost/volume where needed).</p>
        <p className="mt-4 inline-block rounded-full border border-fos-border px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-fos-muted">
          Engine in build
        </p>
      </div>
    </div>
  );
}
