"use client";

/* Processing Personality Engine — animated indicator. Replaces generic
   "Thinking…/Loading…/Processing…". Context-aware (category), weighted/no-repeat
   messages, smooth fade + subtle pulse, reduced-motion + disable aware. */

import { useEffect, useRef, useState } from "react";
import { nextMessage } from "@/lib/processing/engine";
import type { ProcessingCategory } from "@/lib/processing/messages";
import { useProcessingConfig } from "./config";

export default function ProcessingIndicator({ category = "general", className = "" }: { category?: ProcessingCategory; className?: string }) {
  const { cfg } = useProcessingConfig();
  const history = useRef<string[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // first message
    const first = nextMessage(category, history.current);
    history.current = [...history.current, first].slice(-40);
    setMsg(first);

    if (!cfg.enabled) return;
    const speed = Math.max(1200, cfg.speedMs);
    const id = setInterval(() => {
      const next = nextMessage(category, history.current);
      history.current = [...history.current, next].slice(-40);
      if (cfg.reducedMotion) { setMsg(next); return; }
      setVisible(false);
      setTimeout(() => { setMsg(next); setVisible(true); }, 200);
    }, speed);
    return () => clearInterval(id);
  }, [category, cfg.enabled, cfg.speedMs, cfg.reducedMotion]);

  if (!cfg.enabled) {
    return <span className={`inline-flex items-center gap-2 text-sm text-muted ${className}`}><Dot reduced /> Working…</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2 text-sm text-muted ${className}`} aria-live="polite">
      <Dot reduced={cfg.reducedMotion} />
      <span
        style={{ transition: cfg.reducedMotion ? undefined : "opacity 200ms ease", opacity: visible ? 1 : 0 }}
        className="tabular-nums"
      >
        {msg}
      </span>
    </span>
  );
}

function Dot({ reduced }: { reduced?: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {!reduced && <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-brand/60" />}
      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
    </span>
  );
}
