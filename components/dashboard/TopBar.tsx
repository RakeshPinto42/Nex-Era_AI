"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDashboard, modelKey } from "./store";
import { INTENTS, type Intent } from "@/lib/brand/intent";
import Logo from "@/components/Logo";

export default function TopBar({ onMenu }: { onMenu?: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);

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
    <header className="flex h-14 flex-none items-center gap-3 border-b border-black/10 bg-white/50 px-4 backdrop-blur-xl">
      {/* mobile menu */}
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation menu"
        className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 text-black/70 hover:bg-black/5 hover:text-neutral-900 lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
        </svg>
      </button>

      {/* brand mark — always in the bar */}
      <div className="flex items-center">
        <Logo size={24} variant="terminal" />
      </div>

      {/* model picker — ChatGPT-style, top-left */}
      <ModelPicker />

      {/* search */}
      <div className="relative flex max-w-md flex-1 items-center">
        <svg
          className="pointer-events-none absolute left-3 text-black/35"
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
          className="w-full rounded-lg border border-black/10 bg-black/[0.04] py-2 pl-9 pr-16 text-sm text-neutral-900 placeholder:text-black/35 outline-none transition-colors focus:border-navy/40 focus:bg-black/[0.06]"
        />
        <kbd className="absolute right-2.5 hidden rounded border border-black/10 bg-black/5 px-1.5 py-0.5 font-mono text-[10px] text-black/40 sm:block">
          ⌘K
        </kbd>
      </div>

      <div className="flex-1" />

      {/* status pill */}
      <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3 py-1.5 text-xs text-black/55 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-navy shadow-glow" />
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
          RP
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
                className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-black/10 bg-white/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
              >
                <div className="border-b border-black/10 px-3 py-2.5">
                  <p className="text-sm font-medium text-neutral-900">
                    {me?.username ?? "…"}
                  </p>
                  <p className="text-xs capitalize text-black/40">
                    {me?.role ? `${me.role} account` : ""}
                  </p>
                </div>
                {me?.role === "admin" && (
                  <a
                    href="/admin"
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-black/70 transition-colors hover:bg-black/5 hover:text-neutral-900"
                  >
                    API Keys / Providers
                  </a>
                )}
                <button
                  onClick={logout}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition-colors hover:bg-rose-500/5"
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

function intentDot(intent?: string): string {
  const it = intent ? INTENTS[intent as Intent] : undefined;
  return it ? it.hex : "#5e9dff";
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
        className="hidden items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs text-black/55 transition-colors hover:text-neutral-900 sm:flex"
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
        className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-1.5 text-sm text-neutral-900 transition-colors hover:bg-black/[0.06]"
      >
        {autoRoute ? (
          <span className="font-mono text-xs font-semibold text-navy">✦ Auto</span>
        ) : (
          <span
            className="h-1.5 w-1.5 flex-none rounded-full"
            style={{ background: intentDot(activeModel?.intent) }}
          />
        )}
        <span className="max-w-[110px] truncate sm:max-w-[170px]">
          {autoRoute
            ? routedModel
              ? `→ ${routedModel.label}`
              : "routes by task"
            : (activeModel?.label ?? "Select model")}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/40" aria-hidden="true">
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
              className="absolute left-0 z-50 mt-2 max-h-[66vh] w-80 overflow-y-auto rounded-xl border border-black/10 bg-white/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
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
                  autoRoute ? "bg-navy/[0.06]" : "hover:bg-black/5"
                }`}
              >
                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-navy/10 text-sm text-navy">
                  ✦
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-neutral-900">
                    Auto
                  </span>
                  <span className="block truncate text-[11px] text-black/45">
                    Routes each prompt to the best model
                  </span>
                </span>
                {autoRoute && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-navy" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>

              <p className="px-2.5 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-black/30">
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
                      isActive ? "bg-black/[0.06]" : "hover:bg-black/5"
                    }`}
                  >
                    <span
                      className="h-2 w-2 flex-none rounded-full"
                      style={{ background: intentDot(m.intent) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-neutral-900">
                        {m.label}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-black/40">
                        {m.providerName}
                      </span>
                    </span>
                    <CapChip intent={m.intent} />
                    {isActive && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-navy" aria-hidden="true">
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
