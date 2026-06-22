"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import PageShell from "@/components/dashboard/PageShell";
import GuestQuota from "@/components/dashboard/GuestQuota";

type Job = {
  id: string;
  prompt: string;
  status: "rendering" | "done" | "error" | "needs-key";
  url?: string;
  provider?: string;
  error?: string;
};

export default function VideosPage() {
  const [prompt, setPrompt] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    const p = prompt.trim();
    if (!p || busy) return;
    setBusy(true);
    const id = crypto.randomUUID();
    setJobs((prev) => [{ id, prompt: p, status: "rendering" }, ...prev]);
    setPrompt("");

    try {
      const res = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? data.ok
              ? { ...j, status: "done", url: data.url, provider: data.provider }
              : {
                  ...j,
                  status: data.mode === "needs-key" ? "needs-key" : "error",
                  error: data.error,
                }
            : j,
        ),
      );
    } catch {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id ? { ...j, status: "error", error: "Network error" } : j,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Videos"
      subtitle="Text-to-video on free cloud models (Replicate / Wan)."
    >
      <div className="mb-2 flex flex-col gap-2 rounded-2xl border border-black/10 bg-black/[0.04] p-2 sm:flex-row">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder="Describe a clip… e.g. drone shot over a neon city at night"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-black/35 outline-none"
        />
        <button
          onClick={generate}
          disabled={!prompt.trim() || busy}
          className="rounded-xl bg-navy px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-40"
        >
          {busy ? "Rendering…" : "Generate"}
        </button>
      </div>
      <div className="mb-2 px-1">
        <GuestQuota action="video" />
      </div>
      <p className="mb-6 px-1 font-mono text-[11px] text-black/35">
        Needs <code className="text-black/60">REPLICATE_API_TOKEN</code> (free-tier
        credits). Renders can take 30–90s.
      </p>

      {jobs.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-black/15 py-20 text-center">
          <p className="text-sm text-black/45">
            No clips yet. Describe one above to render a real video.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <motion.div
              key={j.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-black/10 bg-black/[0.03]"
            >
              <div className="relative grid aspect-video place-items-center bg-neutral-100/60">
                {j.status === "rendering" && (
                  <div className="flex flex-col items-center gap-2">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-ice border-t-transparent" />
                    <span className="font-mono text-[11px] text-black/40">
                      rendering…
                    </span>
                  </div>
                )}
                {j.status === "done" && j.url && (
                  <video
                    src={j.url}
                    controls
                    loop
                    className="h-full w-full object-cover"
                  />
                )}
                {(j.status === "error" || j.status === "needs-key") && (
                  <div className="px-4 text-center">
                    <p
                      className={`text-xs ${j.status === "needs-key" ? "text-[#f0c178]" : "text-[#ff8a8a]"}`}
                    >
                      {j.error}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-3">
                <p className="line-clamp-1 text-sm text-black/80">{j.prompt}</p>
                {j.provider && (
                  <span className="flex-none font-mono text-[10px] text-navy">
                    {j.provider}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
