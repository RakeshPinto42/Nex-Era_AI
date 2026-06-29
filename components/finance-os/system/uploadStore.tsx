"use client";

// Finance OS shared upload store. One dataset list for the whole shell so the
// global Upload button (top bar / ⌘U / command palette) and the per-studio drop
// zone feed the SAME data — whatever you upload globally lands in the studio you
// have open. Everything stays in memory; nothing is sent anywhere.

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Dataset } from "@/lib/finance-os/types";

type UploadCtx = {
  datasets: Dataset[];
  setDatasets: (d: Dataset[]) => void;
  addDatasets: (d: Dataset[]) => void;
};

const Ctx = createContext<UploadCtx | null>(null);

// Static no-op fallback so a component rendered outside the provider degrades to
// local-only behavior instead of crashing. The Finance shell always provides a
// real store, so studios under /ledger get shared state.
const FALLBACK: UploadCtx = { datasets: [], setDatasets: () => {}, addDatasets: () => {} };

export function FinanceUploadProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const addDatasets = (incoming: Dataset[]) => setDatasets((cur) => [...cur, ...incoming]);
  return <Ctx.Provider value={{ datasets, setDatasets, addDatasets }}>{children}</Ctx.Provider>;
}

export function useFinanceUpload(): UploadCtx {
  return useContext(Ctx) ?? FALLBACK;
}
