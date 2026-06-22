"use client";

import { usePathname } from "next/navigation";
import { GROUPS, MODULE_BY_SLUG } from "@/lib/fpa/modules";

const PERIODS = ["MTD", "QTD", "YTD", "FY26"];

export default function TopBar({
  onToggleAssistant,
  assistantOpen,
  onMenu,
}: {
  onToggleAssistant: () => void;
  assistantOpen: boolean;
  onMenu?: () => void;
}) {
  const path = usePathname();
  const slug = path.startsWith("/fpa/") ? path.slice(5) : null;
  const mod = slug ? MODULE_BY_SLUG[slug] : null;
  const groupLabel = mod
    ? GROUPS.find((g) => g.key === mod.group)?.label
    : "Overview";

  return (
    <header className="flex h-14 flex-none items-center gap-3 border-b border-black/10 bg-white/50 px-4 backdrop-blur-xl">
      {/* mobile menu */}
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open module menu"
        className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-black/70 hover:bg-black/5 hover:text-ink lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden text-black/40 sm:inline">{groupLabel}</span>
        <span className="hidden text-black/20 sm:inline">/</span>
        <span className="font-medium text-ink">
          {mod ? mod.name : "Executive Dashboard"}
        </span>
      </div>

      <div className="flex-1" />

      {/* period selector */}
      <div className="hidden items-center gap-0.5 rounded-lg border border-black/10 bg-black/[0.03] p-0.5 md:flex">
        {PERIODS.map((p, i) => (
          <button
            key={p}
            className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
              i === 2
                ? "bg-navy/15 text-navy"
                : "text-black/50 hover:text-ink"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* search */}
      <div className="relative hidden lg:block">
        <input
          type="search"
          aria-label="Search metrics and accounts"
          placeholder="Search metrics, accounts…"
          className="w-56 rounded-lg border border-black/10 bg-black/[0.04] py-1.5 pl-3 pr-3 text-sm text-ink placeholder:text-black/35 outline-none focus:border-navy/40"
        />
      </div>

      {/* assistant toggle */}
      <button
        onClick={onToggleAssistant}
        aria-pressed={assistantOpen}
        aria-label="Toggle AI Copilot panel"
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
          assistantOpen
            ? "border-navy/40 bg-navy/10 text-navy"
            : "border-black/10 text-black/70 hover:text-ink"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        <span className="hidden sm:inline">AI Copilot</span>
      </button>

      <div
        className="grid h-8 w-8 flex-none place-items-center rounded-full bg-gradient-to-br from-navy to-ice text-xs font-bold text-white"
        aria-hidden="true"
      >
        RP
      </div>
    </header>
  );
}
