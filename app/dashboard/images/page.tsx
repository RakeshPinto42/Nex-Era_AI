"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "@/components/dashboard/PageShell";
import GuestQuota from "@/components/dashboard/GuestQuota";

type GenItem = {
  id: string;
  prompt: string;
  url?: string;
  provider?: string;
  status: "loading" | "done" | "error";
  error?: string;
};

const STARTERS = [
  "Obsidian trading terminal, neon navy HUD, cinematic",
  "Isometric data center, soft blue light, minimal",
  "Abstract liquidity flow, glass shards, dark",
  "Holographic KPI rings, finance dashboard",
];

export default function ImagesPage() {
  const [prompt, setPrompt] = useState("");
  const [items, setItems] = useState<GenItem[]>([]);
  const [busy, setBusy] = useState(false);

  const generate = async (text: string) => {
    const p = text.trim();
    if (!p || busy) return;
    setBusy(true);
    const id = crypto.randomUUID();
    setItems((prev) => [{ id, prompt: p, status: "loading" }, ...prev]);
    setPrompt("");

    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? data.ok
              ? { ...it, status: "done", url: data.url, provider: data.provider }
              : { ...it, status: "error", error: data.error ?? "Failed" }
            : it,
        ),
      );
    } catch {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, status: "error", error: "Network error" } : it,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title="Images" subtitle="Text-to-image on free cloud models.">
      <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 sm:flex-row">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate(prompt)}
          placeholder="Describe an image… e.g. obsidian trading terminal, navy glow"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none"
        />
        <button
          onClick={() => generate(prompt)}
          disabled={!prompt.trim() || busy}
          className="rounded-xl bg-navy px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-40"
        >
          {busy ? "Generating…" : "Generate"}
        </button>
      </div>

      <div className="mb-3">
        <GuestQuota action="image" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {STARTERS.map((s) => (
          <button
            key={s}
            onClick={() => generate(s)}
            disabled={busy}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/55 transition-colors hover:text-white disabled:opacity-40"
          >
            {s.split(",")[0]}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-white/15 py-20 text-center">
          <p className="text-sm text-white/45">
            No images yet. Describe one above — runs keyless on Pollinations,
            or set <code className="font-mono text-white/70">TOGETHER_API_KEY</code> /{" "}
            <code className="font-mono text-white/70">HF_TOKEN</code> for FLUX.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence>
            {items.map((it) => (
              <motion.div
                key={it.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40"
              >
                {it.status === "loading" && (
                  <div className="grid h-full place-items-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent" />
                      <span className="font-mono text-[11px] text-white/40">
                        rendering…
                      </span>
                    </div>
                  </div>
                )}
                {it.status === "done" && it.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.url}
                    alt={it.prompt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                {it.status === "error" && (
                  <div className="grid h-full place-items-center p-3 text-center">
                    <span className="text-xs text-[#ff8a8a]">{it.error}</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <div>
                    <p className="line-clamp-2 text-xs text-white/85">{it.prompt}</p>
                    {it.provider && (
                      <p className="mt-1 font-mono text-[10px] text-navy">
                        {it.provider}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </PageShell>
  );
}
