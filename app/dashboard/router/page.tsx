"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import PageShell from "@/components/dashboard/PageShell";
import { routeLive, liveKey, type LiveModel, type LiveRoute } from "@/lib/router/live";

const EXAMPLES = [
  "Refactor this React hook and fix the type error",
  "Prove why quicksort is O(n log n) on average",
  "Find the latest 2026 papers on RAG and cite them",
  "Read the text from this scanned invoice",
  "Hey, what should I cook tonight?",
];

export default function RouterPage() {
  const [models, setModels] = useState<LiveModel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<LiveRoute | null>(null);
  const [routing, setRouting] = useState(false);
  const [down, setDown] = useState<Record<string, boolean>>({});

  // live run output
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [runMeta, setRunMeta] = useState<{ provider?: string; model?: string }>({});
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    outRef.current?.scrollTo({ top: 1e9 });
  }, [output]);

  const route = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setRouting(true);
    setResult(null);
    setOutput("");
    setRunMeta({});
    setTimeout(() => {
      setResult(routeLive(t, models, down));
      setRouting(false);
    }, 500);
  };

  const run = async () => {
    if (!result?.selected || running) return;
    setRunning(true);
    setOutput("");
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: result.selected.providerId,
          model: result.selected.model,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      setRunMeta({
        provider: res.headers.get("X-Run-Provider") ?? undefined,
        model: res.headers.get("X-Run-Model") ?? undefined,
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        setOutput((o) => o + dec.decode(value, { stream: true }));
      }
    } catch {
      setOutput((o) => o || "Run failed. Check the provider key in Admin.");
    } finally {
      setRunning(false);
    }
  };

  const hasModels = models.length > 0;

  return (
    <PageShell
      title="AI Router"
      subtitle="Classifies intent, then routes to the best configured free model."
    >
      {loaded && !hasModels && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-[#f0c178]/30 bg-[#f0c178]/[0.06] px-4 py-3 text-sm text-[#f0c178]">
          <span>No models configured. Add a free cloud key to enable routing.</span>
          <Link
            href="/admin"
            className="rounded-lg border border-[#f0c178]/40 px-3 py-1 text-xs hover:bg-[#f0c178]/10"
          >
            Open Admin →
          </Link>
        </div>
      )}

      {/* prompt */}
      <div className="rounded-2xl border border-black/10 bg-black/[0.04] p-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) route(prompt);
          }}
          rows={2}
          placeholder="Describe your task… ⌘↵ to route"
          className="w-full resize-none bg-transparent px-3 py-2 text-sm text-ink placeholder:text-black/35 outline-none"
        />
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="font-mono text-[11px] text-black/30">
            {hasModels ? `${models.length} live models` : "no models"}
          </span>
          <button
            onClick={() => route(prompt)}
            disabled={!prompt.trim() || routing || !hasModels}
            className="rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-30"
          >
            {routing ? "Routing…" : "Route"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            disabled={!hasModels}
            onClick={() => {
              setPrompt(e);
              route(e);
            }}
            className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1.5 text-xs text-black/60 transition-colors hover:border-navy/30 hover:text-ink disabled:opacity-30"
          >
            {e}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          {routing && (
            <motion.div
              key="r"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid place-items-center rounded-2xl border border-black/10 bg-black/[0.03] py-14"
            >
              <div className="relative grid place-items-center">
                <motion.div
                  className="conic-glow absolute h-20 w-20 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative grid h-14 w-14 place-items-center rounded-2xl glass-strong shadow-glow">
                  <span className="font-mono text-[10px] font-bold text-gradient-emerald">
                    ROUTE
                  </span>
                </div>
              </div>
              <p className="mt-4 font-mono text-xs text-black/50">
                classifying intent · scoring models…
              </p>
            </motion.div>
          )}

          {result && !routing && (
            <motion.div
              key="res"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* metrics */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric label="Selected Model" highlight>
                  <span className="text-lg font-semibold text-gradient-emerald">
                    {result.selected?.label ?? "—"}
                  </span>
                  <span className="block text-xs text-black/40">
                    {result.selected?.providerName ?? "no provider"}
                  </span>
                </Metric>
                <Metric label="Confidence">
                  <ConfidenceMeter value={result.confidence} />
                </Metric>
                <Metric label="Intent">
                  <span className="text-lg font-semibold text-ink">
                    {result.intentLabel}
                  </span>
                  <span className="block text-xs text-black/40">
                    {(result.intentConfidence * 100).toFixed(0)}% sure
                  </span>
                </Metric>
                <Metric label="Routing">
                  <span className="text-lg font-semibold text-ink">
                    {result.usedFallback ? "Fallback" : "Primary"}
                  </span>
                  <span className="block text-xs text-navy">
                    {result.ranked.filter((r) => r.available).length} available
                  </span>
                </Metric>
              </div>

              {/* reason */}
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-black/40">
                  Reason
                </p>
                <p className="text-sm text-black/80">{result.reason}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* intent distribution */}
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-black/40">
                    Intent Distribution
                  </p>
                  <div className="space-y-2.5">
                    {result.intentScores.map((s) => (
                      <Bar
                        key={s.intent}
                        label={s.intent}
                        pct={s.score * 100}
                        active={s.intent === result.intent}
                      />
                    ))}
                  </div>
                </div>

                {/* model scores */}
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                  <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-black/40">
                    Model Scores
                  </p>
                  <div className="space-y-2.5">
                    {result.ranked.map((r) => (
                      <div key={liveKey(r.m)}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                r.m === result.selected
                                  ? "bg-navy shadow-glow"
                                  : r.available
                                    ? "bg-black/30"
                                    : "bg-[#ff8a8a]"
                              }`}
                            />
                            <span
                              className={
                                r.m === result.selected
                                  ? "font-medium text-ink"
                                  : "text-black/60"
                              }
                            >
                              {r.m.label}
                            </span>
                            <span className="font-mono text-[10px] text-black/30">
                              {r.m.providerName}
                            </span>
                          </span>
                          <span className="font-mono text-xs text-black/45">
                            {(r.score * 100).toFixed(0)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${r.score * 100}%`,
                              background:
                                r.m === result.selected
                                  ? "linear-gradient(90deg,#3b82f6,#5e9dff)"
                                  : "rgba(255,255,255,0.25)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* run on selected */}
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-black/40">
                    Live Output
                  </p>
                  <button
                    onClick={run}
                    disabled={!result.selected || running}
                    className="rounded-lg bg-navy px-4 py-1.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-30"
                  >
                    {running ? "Running…" : "Run on selected model"}
                  </button>
                </div>
                {runMeta.provider && (
                  <p className="mb-2 font-mono text-[11px] text-black/40">
                    {runMeta.provider} · {runMeta.model}
                  </p>
                )}
                <div
                  ref={outRef}
                  className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-neutral-100/60 p-3 font-mono text-[13px] leading-relaxed text-black/80"
                >
                  {output || (
                    <span className="text-black/30">
                      Route a prompt, then run it on the selected model.
                    </span>
                  )}
                  {running && (
                    <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-navy animate-blink" />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* availability toggles */}
      {hasModels && (
        <div className="mt-8 rounded-2xl border border-black/10 bg-black/[0.03] p-4">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-black/40">
            Model Availability · toggle to test fallback
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {models.map((m) => {
              const k = liveKey(m);
              return (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-black/[0.03]"
                >
                  <span className="text-sm text-black/70">
                    {m.label}{" "}
                    <span className="font-mono text-[10px] text-black/30">
                      {m.providerName}
                    </span>
                  </span>
                  <button
                    onClick={() => setDown((d) => ({ ...d, [k]: !d[k] }))}
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                      down[k]
                        ? "border-[#ff8a8a]/40 text-[#ff8a8a]"
                        : "border-navy/40 text-navy"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {down[k] ? "Down" : "Up"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* ---- helpers ---- */

function Metric({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-navy/30 bg-navy/[0.06]"
          : "border-black/10 bg-black/[0.03]"
      }`}
    >
      <p className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-black/40">
        {label}
      </p>
      {children}
    </div>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <span className="text-lg font-semibold text-ink">{pct}%</span>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
          className="h-full rounded-full bg-gradient-to-r from-navy to-ice"
        />
      </div>
    </div>
  );
}

function Bar({
  label,
  pct,
  active,
}: {
  label: string;
  pct: number;
  active?: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className={active ? "text-ink" : "text-black/55"}>{label}</span>
        <span className="font-mono text-black/40">{pct.toFixed(0)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-full"
          style={{
            background: active
              ? "linear-gradient(90deg,#3b82f6,#5e9dff)"
              : "rgba(255,255,255,0.25)",
          }}
        />
      </div>
    </div>
  );
}
