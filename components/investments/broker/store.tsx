"use client";

/* Broker Center — client store (Phase 13). Persists broker CONNECTIONS only
   (no secrets, no trading) to localStorage. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BrokerConnection, BrokerId } from "@/lib/brokers/types";
import { getBrokerAdapter, isConnectable } from "@/lib/brokers";

const KEY = "nexera.brokers";

type StoreValue = {
  connections: BrokerConnection[];
  connect: (id: BrokerId) => Promise<string | null>; // returns error or null
  disconnect: (id: BrokerId) => void;
  connectionFor: (id: BrokerId) => BrokerConnection | undefined;
};

const Ctx = createContext<StoreValue | null>(null);

export function BrokerStoreProvider({ children }: { children: React.ReactNode }) {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);

  useEffect(() => {
    try {
      setConnections(JSON.parse(localStorage.getItem(KEY) || "[]") as BrokerConnection[]);
    } catch {
      setConnections([]);
    }
  }, []);

  const save = (next: BrokerConnection[]) => {
    setConnections(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const connect = useCallback(async (id: BrokerId): Promise<string | null> => {
    const adapter = getBrokerAdapter(id);
    if (!adapter || !isConnectable(id)) return "This broker is not connectable yet.";
    const res = await adapter.connect();
    if (!res.ok) return res.error;
    setConnections((prev) => {
      const next = [res.connection, ...prev.filter((c) => c.brokerId !== id)];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    return null;
  }, []);

  const disconnect = useCallback((id: BrokerId) => {
    setConnections((prev) => {
      const next = prev.filter((c) => c.brokerId !== id);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const connectionFor = useCallback((id: BrokerId) => connections.find((c) => c.brokerId === id), [connections]);

  const value = useMemo<StoreValue>(() => ({ connections, connect, disconnect, connectionFor }), [connections, connect, disconnect, connectionFor]);
  void save;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBrokerStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBrokerStore must be used within BrokerStoreProvider");
  return v;
}
