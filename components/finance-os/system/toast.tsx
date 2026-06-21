"use client";

// Lightweight toast system for Finance OS. Replaces native alert() with themed,
// auto-dismissing notifications.

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn, uid } from "@/lib/utils";

type Tone = "success" | "error" | "info";
type Toast = { id: string; message: string; tone: Tone };

const ToastCtx = createContext<{ toast: (message: string, tone?: Tone) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Tone = "info") => {
    const id = uid("t");
    setToasts((ts) => [...ts, { id, message, tone }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex flex-col gap-2">
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? XCircle : Info;
          const color = t.tone === "success" ? "#10b981" : t.tone === "error" ? "#ef4444" : "#3b82f6";
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-center gap-2.5 rounded-xl border border-fos-border bg-fos-surface px-4 py-3 text-sm text-fos-text shadow-lg",
                "animate-[fos-toast_0.25s_ease-out]",
              )}
              style={{ boxShadow: "var(--fos-shadow)" }}
            >
              <Icon size={16} style={{ color }} />
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
