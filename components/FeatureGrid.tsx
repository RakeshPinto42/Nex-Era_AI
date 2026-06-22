"use client";

import { motion } from "framer-motion";
import { INTENTS, type Intent } from "@/lib/brand/intent";

type Feature = {
  title: string;
  desc: string;
  icon: React.ReactNode;
  // The intent this surface routes to — drives its color.
  intent: Intent;
  span?: string;
};

const features: Feature[] = [
  {
    title: "Chat",
    desc: "Conversational reasoning across every frontier model, one thread.",
    intent: "general",
    icon: <IconChat />,
    span: "md:col-span-2",
  },
  {
    title: "Coding Agent",
    desc: "Plans, writes, tests and ships full features autonomously.",
    intent: "coding",
    icon: <IconCode />,
  },
  {
    title: "Research Agent",
    desc: "Crawls sources, cites everything, returns structured briefs.",
    intent: "research",
    icon: <IconResearch />,
  },
  {
    title: "Image Generation",
    desc: "Studio-grade visuals from a single line of intent.",
    intent: "vision",
    icon: <IconImage />,
  },
  {
    title: "Video Generation",
    desc: "Storyboards to rendered clips, fully directed by prompt.",
    intent: "vision",
    icon: <IconVideo />,
  },
  {
    title: "Folder Automation",
    desc: "Watches directories, classifies and acts on files live.",
    intent: "general",
    icon: <IconFolder />,
  },
  {
    title: "Ledger",
    desc: "Pricing, forecasting, commissions and reporting on your real data.",
    intent: "reasoning",
    icon: <IconFinance />,
    span: "md:col-span-2",
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-navy/80">
          The Operating System
        </p>
        <h2 className="heading-lift-gradient mx-auto mt-4 max-w-3xl text-center text-3xl font-semibold tracking-tight sm:text-5xl">
          <span className="text-gradient">
            Every capability, one surface.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-center text-black/55">
          NEXERA routes each task to the right agent and the right model — so you
          stay in flow.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((f, i) => {
            const it = INTENTS[f.intent];
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                className={`group relative overflow-hidden rounded-2xl glass p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-black/15 hover:shadow-lift ${
                  f.span ?? ""
                }`}
              >
                {/* hover glow — tinted by routed intent */}
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: `rgba(${it.rgb},0.2)` }}
                />
                <div className="flex items-start justify-between">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-xl"
                    style={{ background: `rgba(${it.rgb},0.12)`, color: it.hex }}
                  >
                    {f.icon}
                  </div>
                  <span
                    className="font-mono text-[10px] uppercase tracking-wider opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ color: it.hex }}
                  >
                    {it.label}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-black/55">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---- icons (stroke, inherit color) ---- */
const sw = { strokeWidth: 1.8, stroke: "currentColor", fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconCode() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}>
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}
function IconResearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function IconVideo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m22 8-6 4 6 4z" />
    </svg>
  );
}
function IconFolder() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}>
      <path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2z" />
    </svg>
  );
}
function IconFinance() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}>
      <path d="M3 3v18h18" />
      <path d="m7 14 3-3 3 3 5-6" />
    </svg>
  );
}
