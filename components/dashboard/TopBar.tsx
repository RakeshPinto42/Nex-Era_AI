"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard, modelKey } from "./store";
import { INTENTS, intentEmoji, type Intent } from "@/lib/brand/intent";
import { NexeraMark } from "@/components/Logo";

export default function TopBar({ onMenu }: { onMenu?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const [me, setMe] = useState<{ username: string; role: string; displayName?: string; title?: string; avatar?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <header className="flex h-14 flex-none items-center gap-3 border-b border-line bg-surface/70 px-4 backdrop-blur-xl">
      {/* mobile menu */}
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation menu"
        className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {/* brand mark — always in the bar */}
      <div className="flex items-center gap-2">
        <NexeraMark size={26} />
        <span className="font-display text-[15px] font-semibold tracking-tight text-ink">nexera</span>
      </div>

      {/* model picker — ChatGPT-style, top-left */}
      <ModelPicker />

      {/* search */}
      <div className="relative flex max-w-md flex-1 items-center">
        <svg
          className="pointer-events-none absolute left-3 text-faint"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          aria-label="Search chats, files and agents"
          placeholder="Search chats, files, agents…"
          className="w-full rounded-lg border border-line bg-surface-2 py-2 pl-9 pr-16 text-sm text-ink placeholder:text-faint outline-none transition-colors focus:border-brand/50 focus:bg-surface"
        />
        <kbd className="absolute right-2.5 hidden rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-faint sm:block">
          ⌘K
        </kbd>
      </div>

      <div className="flex-1" />

      {/* status pill */}
      <div className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Online
      </div>

      {/* user menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-navy to-ice text-xs font-bold text-white transition-transform hover:scale-105"
        >
          {me?.avatar ?? "··"}
        </button>
        <AnimatePresence>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop backdrop-blur-xl"
              >
                <div className="border-b border-line px-3 py-2.5">
                  <p className="text-sm font-medium text-ink">
                    {me?.displayName ?? me?.username ?? "…"}
                  </p>
                  <p className="text-xs text-faint">
                    {me?.title ?? (me?.role ? `${me.role} account` : "")}
                  </p>
                </div>
                {me?.role === "admin" && (
                  <a
                    href="/admin"
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    API Keys / Providers
                  </a>
                )}
                <button
                  onClick={logout}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/5"
                >
                  Sign out
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

// Friendly capability label per model intent.
const CAP_LABEL: Record<string, string> = {
  reasoning: "Reasoning",
  coding: "Code",
  general: "Text",
  research: "Research",
  vision: "Vision",
};

function CapChip({ intent }: { intent?: string }) {
  const key = intent ?? "general";
  const it = INTENTS[key as Intent] ?? INTENTS.general;
  return (
    <span
      className="flex-none rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider"
      style={{ background: `rgba(${it.rgb},0.12)`, color: it.hex }}
    >
      {CAP_LABEL[key] ?? key}
    </span>
  );
}

function ModelPicker() {
  const {
    availableModels,
    activeModel,
    setActiveModel,
    modelsLoaded,
    autoRoute,
    setAutoRoute,
    routedModel,
  } = useDashboard();
  const [open, setOpen] = useState(false);

  if (modelsLoaded && availableModels.length === 0) {
    return (
      <a
        href="/admin"
        className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink sm:flex"
      >
        + Add provider
      </a>
    );
  }

  const pickModel = (key: string) => {
    setActiveModel(key);
    setAutoRoute(false);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface"
      >
        {autoRoute ? (
          <span className="font-mono text-xs font-semibold text-brand">✦ Auto</span>
        ) : (
          <span className="text-sm leading-none" aria-hidden="true">
            {intentEmoji(activeModel?.intent)}
          </span>
        )}
        <span className="max-w-[110px] truncate sm:max-w-[170px]">
          {autoRoute
            ? routedModel
              ? `→ ${routedModel.label}`
              : "routes by task"
            : (activeModel?.label ?? "Select model")}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-faint" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              role="listbox"
              className="absolute left-0 z-50 mt-2 max-h-[66vh] w-80 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-pop backdrop-blur-xl"
            >
              {/* Auto */}
              <button
                type="button"
                role="option"
                aria-selected={autoRoute}
                onClick={() => {
                  setAutoRoute(true);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  autoRoute ? "bg-brand/10" : "hover:bg-surface-2"
                }`}
              >
                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-brand/15 text-sm text-brand">
                  ✦
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">
                    Auto
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    Routes each prompt to the best model
                  </span>
                </span>
                {autoRoute && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-brand" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>

              <p className="px-2.5 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-faint">
                Or pick a model
              </p>

              {availableModels.map((m) => {
                const isActive =
                  !autoRoute && activeModel && modelKey(m) === modelKey(activeModel);
                return (
                  <button
                    key={modelKey(m)}
                    type="button"
                    role="option"
                    aria-selected={isActive ? true : false}
                    onClick={() => pickModel(modelKey(m))}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      isActive ? "bg-surface-3" : "hover:bg-surface-2"
                    }`}
                  >
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-line bg-surface-2 text-sm" aria-hidden="true">
                      {intentEmoji(m.intent)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {m.label}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-faint">
                        {m.providerName}
                      </span>
                    </span>
                    <CapChip intent={m.intent} />
                    {isActive && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-brand" aria-hidden="true">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
