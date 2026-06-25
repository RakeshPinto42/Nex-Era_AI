"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NexeraMark } from "@/components/Logo";
import { GROUPS, modulesByGroup } from "@/lib/fpa/modules";

export default function ModuleNav() {
  const path = usePathname();

  return (
    <aside className="flex h-full w-[244px] flex-none flex-col border-r border-white/[0.08] bg-obsidian-100/70 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3.5">
        <span className="flex items-center gap-2">
          <NexeraMark size={26} />
          <span className="font-display text-[15px] font-semibold tracking-tight text-white">nexera</span>
        </span>
        <span className="rounded-md border border-navy/30 bg-navy/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-navy">
          FP&A OS
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
        <NavLink
          href="/fpa"
          label="Executive Dashboard"
          active={path === "/fpa"}
          accent
        />

        {GROUPS.map((g) => (
          <div key={g.key} className="mt-5">
            <p className="px-2 pb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
              {g.label}
            </p>
            {modulesByGroup(g.key).map((m) => (
              <NavLink
                key={m.slug}
                href={`/fpa/${m.slug}`}
                label={m.name}
                active={path === `/fpa/${m.slug}`}
                soon={!m.tool}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.08] p-3">
        <Link
          href="/admin"
          className="mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/55 transition-colors hover:text-white"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-ice/60" />
          Admin · Model Providers
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/45 transition-colors hover:text-white"
        >
          ← Back to NEXERA
        </Link>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  active,
  accent,
  soon,
}: {
  href: string;
  label: string;
  active: boolean;
  accent?: boolean;
  soon?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative my-0.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
        active
          ? "text-white"
          : soon
            ? "text-white/35 hover:bg-white/[0.03] hover:text-white/60"
            : "text-white/55 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {active && (
        <motion.span
          layoutId="fpa-nav-active"
          className="absolute inset-0 rounded-lg border border-navy/25 bg-navy/[0.08]"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <span
        className={`relative z-10 h-1.5 w-1.5 flex-none rounded-full ${
          active ? "bg-navy" : soon ? "bg-white/15" : accent ? "bg-ice/60" : "bg-emerald-600/60"
        }`}
      />
      <span className="relative z-10 flex-1 truncate">{label}</span>
      {soon && (
        <span className="relative z-10 font-mono text-[8px] uppercase tracking-wider text-white/30">
          soon
        </span>
      )}
    </Link>
  );
}
