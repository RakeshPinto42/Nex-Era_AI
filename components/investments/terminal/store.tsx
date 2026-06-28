"use client";

/* Live Market Terminal — client polling store (Phase 5). Polls the snapshot
   endpoint on an interval for incremental updates; never reloads the page. */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { TerminalSnapshot } from "@/lib/investments/terminal/types";

type StoreValue = {
  snap: TerminalSnapshot | null;
  updatedAt: number | null;
  live: boolean;
  error: string | null;
};

const Ctx = createContext<StoreValue>({ snap: null, updatedAt: null, live: false, error: null });

export function TerminalProvider({ intervalMs = 10_000, children }: { intervalMs?: number; children: React.ReactNode }) {
  const [snap, setSnap] = useState<TerminalSnapshot | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/investments/terminal", { cache: "no-store" }).then((r) => r.json());
        if (!alive) return;
        if (res.error) {
          setError(res.error);
          setLive(false);
        } else {
          setSnap(res as TerminalSnapshot);
          setUpdatedAt(Date.now());
          setLive(true);
          setError(null);
        }
      } catch (e) {
        if (alive) {
          setError((e as Error).message);
          setLive(false);
        }
      }
    };
    poll();
    timer.current = setInterval(poll, intervalMs);
    return () => {
      alive = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [intervalMs]);

  return <Ctx.Provider value={{ snap, updatedAt, live, error }}>{children}</Ctx.Provider>;
}

export function useTerminal(): StoreValue {
  return useContext(Ctx);
}
