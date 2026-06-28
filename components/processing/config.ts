"use client";

// Processing Personality — user config (localStorage). Enable/disable, animation
// speed, reduced-motion (also honors the OS prefers-reduced-motion query).

import { useEffect, useState } from "react";

export type ProcessingConfig = { enabled: boolean; speedMs: number; reducedMotion: boolean };
const KEY = "nexera.processing";
const DEFAULT: ProcessingConfig = { enabled: true, speedMs: 2600, reducedMotion: false };

export function useProcessingConfig() {
  const [cfg, setCfg] = useState<ProcessingConfig>(DEFAULT);
  const [osReduced, setOsReduced] = useState(false);

  useEffect(() => {
    try { const raw = JSON.parse(localStorage.getItem(KEY) || "null"); if (raw) setCfg({ ...DEFAULT, ...raw }); } catch { /* */ }
    const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (mq) { setOsReduced(mq.matches); const h = () => setOsReduced(mq.matches); mq.addEventListener?.("change", h); return () => mq.removeEventListener?.("change", h); }
  }, []);

  const update = (next: Partial<ProcessingConfig>) => {
    setCfg((prev) => { const merged = { ...prev, ...next }; try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch { /* */ } return merged; });
  };

  return { cfg: { ...cfg, reducedMotion: cfg.reducedMotion || osReduced }, update };
}
