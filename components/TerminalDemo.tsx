"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const PROMPT = "Build a sales commission dashboard";

const STEPS = [
  "Selecting DeepSeek R1",
  "Analyzing files",
  "Building dashboard",
  "Generating reports",
];

export default function TerminalDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });

  const [typed, setTyped] = useState("");
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    setTyped("");
    setVisibleSteps(0);
    setDone(false);

    const typer = setInterval(() => {
      i += 1;
      setTyped(PROMPT.slice(0, i));
      if (i >= PROMPT.length) {
        clearInterval(typer);
        // reveal steps sequentially
        let s = 0;
        const stepper = setInterval(() => {
          s += 1;
          setVisibleSteps(s);
          if (s >= STEPS.length) {
            clearInterval(stepper);
            setTimeout(() => setDone(true), 500);
          }
        }, 750);
      }
    }, 55);

    return () => clearInterval(typer);
  }, [inView]);

  return (
    <section id="terminal" className="relative px-6 py-28">
      <div className="mx-auto max-w-4xl">
        <SectionLabel>Live Terminal</SectionLabel>
        <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight sm:text-5xl">
          <span className="text-gradient">Speak intent.</span>{" "}
          <span className="text-gradient-emerald">Watch it ship.</span>
        </h2>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mt-12 overflow-hidden rounded-2xl glass-strong shadow-2xl shadow-black/60"
        >
          {/* title bar */}
          <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 font-mono text-xs text-black/40">
              rak — autonomous-shell — zsh
            </span>
          </div>

          {/* body */}
          <div className="space-y-3 p-5 font-mono text-sm leading-relaxed sm:p-7 sm:text-[15px]">
            <div className="flex items-start gap-2">
              <span className="select-none text-navy">{">"}</span>
              <span className="text-neutral-900">
                {typed}
                {typed.length < PROMPT.length && (
                  <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-navy animate-blink" />
                )}
              </span>
            </div>

            <div className="space-y-2 pl-5">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -8 }}
                  animate={
                    i < visibleSteps ? { opacity: 1, x: 0 } : { opacity: 0 }
                  }
                  transition={{ duration: 0.35 }}
                  className="flex items-center gap-2.5"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-navy/15 text-navy">
                    <Check />
                  </span>
                  <span className="text-black/75">{step}</span>
                  {i === visibleSteps - 1 && !done && (
                    <span className="ml-1 flex gap-1">
                      <Dot d="0s" />
                      <Dot d="0.2s" />
                      <Dot d="0.4s" />
                    </span>
                  )}
                </motion.div>
              ))}
            </div>

            {done && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 rounded-lg bg-navy/10 px-3 py-2 text-navy"
              >
                <Check />
                <span>Dashboard ready · deployed to rak.os/demo</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center font-mono text-xs uppercase tracking-[0.25em] text-navy/80">
      {children}
    </p>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Dot({ d }: { d: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy/60"
      style={{ animationDelay: d, animationDuration: "0.9s" }}
    />
  );
}
