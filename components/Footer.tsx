"use client";

import Logo from "./Logo";
import { INTENTS, type Intent } from "@/lib/brand/intent";

// Product surfaces carry their routed-intent color into the footer nav.
const PRODUCT_INTENT: Record<string, Intent> = {
  Chat: "general",
  "Coding Agent": "coding",
  Research: "research",
  "Finance OS": "reasoning",
};

const cols = [
  {
    title: "Product",
    links: ["Chat", "Coding Agent", "Research", "Finance OS", "AI Router"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Blog", "Security", "Status"],
  },
  {
    title: "Developers",
    links: ["Docs", "API", "CLI", "Changelog", "Community"],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-black/10 px-6 pb-10 pt-20">
      <div className="mx-auto max-w-6xl">
        {/* CTA */}
        <div className="relative overflow-hidden rounded-3xl glass-strong p-10 text-center sm:p-14">
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[600px] -translate-x-1/2 rounded-full bg-navy/[0.08] blur-[120px]" />
          <h3 className="heading-lift-gradient relative text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="text-gradient">Run your work on</span>{" "}
            <span className="text-gradient-emerald">autonomous intelligence.</span>
          </h3>
          <p className="relative mx-auto mt-4 max-w-md text-black/55">
            One interface for every model and every agent. Start free, scale to
            the firm.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#"
              className="w-full rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.03] sm:w-auto"
            >
              Enter NEXERA
            </a>
            <a
              href="#"
              className="w-full rounded-xl glass px-6 py-3 text-sm font-semibold text-black/80 transition-colors hover:bg-black/[0.07] sm:w-auto"
            >
              Talk to sales
            </a>
          </div>
        </div>

        {/* link columns */}
        <div className="mt-16 grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo size={36} />
            <p className="mt-4 max-w-xs text-sm text-black/45">
              Decentralized AI. The AI operating system for finance,
              research and engineering.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="font-mono text-xs uppercase tracking-widest text-black/40">
                {c.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => {
                  const intent = PRODUCT_INTENT[l];
                  return (
                    <li key={l}>
                      <a
                        href="#"
                        className="group inline-flex items-center gap-2 text-sm text-black/55 transition-colors hover:text-ink"
                      >
                        {intent && (
                          <span
                            className="h-1.5 w-1.5 flex-none rounded-full opacity-60 transition-opacity group-hover:opacity-100"
                            style={{ background: INTENTS[intent].hex }}
                          />
                        )}
                        {l}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-black/10 pt-6 sm:flex-row">
          <p className="font-mono text-xs text-black/35">
            © {new Date().getFullYear()} NEXERA · Decentralized AI
          </p>
          <div className="flex items-center gap-5 text-xs text-black/40">
            <a href="#" className="transition-colors hover:text-ink">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-ink">
              Terms
            </a>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-navy" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
