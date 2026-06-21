"use client";

import PageShell, { GridReveal, Reveal } from "@/components/dashboard/PageShell";

const agents = [
  {
    name: "Coding Agent",
    desc: "Plans, writes, tests and ships full features.",
    status: "Running",
    runs: 142,
    accent: "navy",
  },
  {
    name: "Research Agent",
    desc: "Crawls sources, cites everything, returns briefs.",
    status: "Idle",
    runs: 88,
    accent: "ice",
  },
  {
    name: "Ledger Agent",
    desc: "Automates pricing, forecasting and commission runs.",
    status: "Idle",
    runs: 211,
    accent: "navy",
  },
  {
    name: "Image Studio",
    desc: "Studio-grade visuals from a line of intent.",
    status: "Idle",
    runs: 54,
    accent: "ice",
  },
  {
    name: "Video Director",
    desc: "Storyboards to rendered clips by prompt.",
    status: "Idle",
    runs: 23,
    accent: "navy",
  },
  {
    name: "Folder Watcher",
    desc: "Classifies and acts on files in real time.",
    status: "Active",
    runs: 309,
    accent: "ice",
  },
];

export default function AgentsPage() {
  return (
    <PageShell
      title="Agents"
      subtitle="Autonomous workers orchestrated by the NEXERA Router."
      action={
        <button className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
          + New Agent
        </button>
      }
    >
      <GridReveal>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <Reveal
              key={a.name}
              className="group relative overflow-hidden rounded-2xl border border-black/10 bg-black/[0.03] p-5 transition-colors hover:bg-black/[0.06]"
            >
              <div
                className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-100 ${
                  a.accent === "navy" ? "bg-navy/20" : "bg-ice/20"
                }`}
              />
              <div className="flex items-start justify-between">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-xl font-mono text-sm font-bold ${
                    a.accent === "navy"
                      ? "bg-navy/12 text-navy"
                      : "bg-ice/12 text-ice"
                  }`}
                >
                  {a.name.charAt(0)}
                </div>
                <span
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
                    a.status === "Idle"
                      ? "border-black/15 text-black/50"
                      : "border-navy/40 text-navy"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {a.status}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-neutral-900">{a.name}</h3>
              <p className="mt-1 text-sm text-black/50">{a.desc}</p>
              <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3 text-xs text-black/40">
                <span className="font-mono">{a.runs} runs</span>
                <button className="text-navy hover:underline">
                  Configure →
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </GridReveal>
    </PageShell>
  );
}
