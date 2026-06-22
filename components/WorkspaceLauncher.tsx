"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bot, Code2, LineChart, MessagesSquare, type LucideIcon } from "lucide-react";

type Workspace = {
  name: string;
  desc: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  accent: string;
};

// The four platform pillars. Finance OS sits beside Chat / Code / Agents as a
// first-class workspace, not a secondary feature.
const WORKSPACES: Workspace[] = [
  { name: "Chat Workspace", desc: "Reason across every frontier model in one thread.", href: "/dashboard", cta: "Open Chat", icon: MessagesSquare, accent: "#06b6d4" },
  { name: "Code Workspace", desc: "Plan, write, test and ship features with an autonomous coder.", href: "/workspace/code", cta: "Open Code", icon: Code2, accent: "#3b82f6" },
  { name: "Ledger", desc: "Commercial finance tools for pricing, forecasting, commissions and reporting.", href: "/ledger", cta: "Open Ledger", icon: LineChart, accent: "#8b5cf6" },
  { name: "Agents", desc: "Autonomous workers orchestrated by the NEXERA Router.", href: "/dashboard/agents", cta: "Open Agents", icon: Bot, accent: "#8b5cf6" },
];

export default function WorkspaceLauncher() {
  return (
    <section id="workspaces" className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-navy/80">
          Unified Intelligence Workspace
        </p>
        <h2 className="heading-lift-gradient mx-auto mt-4 max-w-3xl text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          <span className="text-gradient">Build, analyze and automate through specialized workspaces.</span>
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WORKSPACES.map((w, i) => {
            const Icon = w.icon;
            return (
              <motion.div
                key={w.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
              >
                <Link
                  href={w.href}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span
                    className="grid h-11 w-11 place-items-center rounded-xl"
                    style={{ background: `${w.accent}1a`, color: w.accent }}
                  >
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink">{w.name}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{w.desc}</p>
                  <span
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-transform group-hover:translate-x-0.5"
                    style={{ color: w.accent }}
                  >
                    {w.cta}
                    <span>→</span>
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
