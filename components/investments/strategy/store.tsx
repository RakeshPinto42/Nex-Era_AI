"use client";

/* Strategy Center — client store (Phase 12). Persists strategies to
   localStorage. No backend, no business logic beyond CRUD. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Strategy } from "@/lib/investments/strategy/types";

const KEY = "nexera.strategies";

type StoreValue = {
  strategies: Strategy[];
  activeId: string | null;
  active: Strategy | null;
  setActiveId: (id: string | null) => void;
  upsert: (s: Strategy) => void;
  remove: (id: string) => void;
};

const Ctx = createContext<StoreValue | null>(null);

export function StrategyStoreProvider({ children }: { children: React.ReactNode }) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setStrategies(JSON.parse(localStorage.getItem(KEY) || "[]") as Strategy[]);
    } catch {
      setStrategies([]);
    }
  }, []);

  const persist = useCallback((next: Strategy[]) => {
    setStrategies(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const upsert = useCallback(
    (s: Strategy) => {
      const stamped = { ...s, updatedAt: new Date().toISOString() };
      setStrategies((prev) => {
        const exists = prev.some((x) => x.id === s.id);
        const next = exists ? prev.map((x) => (x.id === s.id ? stamped : x)) : [stamped, ...prev];
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      setActiveId(s.id);
    },
    [],
  );

  const remove = useCallback(
    (id: string) => {
      setStrategies((prev) => {
        const next = prev.filter((x) => x.id !== id);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      setActiveId((cur) => (cur === id ? null : cur));
    },
    [],
  );

  const active = useMemo(() => strategies.find((s) => s.id === activeId) ?? null, [strategies, activeId]);

  const value = useMemo<StoreValue>(
    () => ({ strategies, activeId, active, setActiveId, upsert, remove }),
    [strategies, activeId, active, upsert, remove],
  );

  // persist hook retained for symmetry (upsert/remove already persist)
  void persist;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStrategyStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStrategyStore must be used within StrategyStoreProvider");
  return v;
}
