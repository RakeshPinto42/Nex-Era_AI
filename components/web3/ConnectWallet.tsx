"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useWallet } from "./useWallet";

export default function ConnectWallet({ compact = false }: { compact?: boolean }) {
  const { address, short, network, connect, disconnect, connecting, error } = useWallet();
  const [open, setOpen] = useState(false);

  if (address) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-navy/30 bg-navy/[0.07] px-3 py-1.5 text-sm font-medium text-navy transition-colors hover:bg-navy/[0.12]"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-navy opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-navy" />
          </span>
          <span className="font-mono">{short}</span>
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
                className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white/95 p-1.5 shadow-pop backdrop-blur-xl"
              >
                <div className="border-b border-black/10 px-3 py-2.5">
                  <p className="font-mono text-xs text-black/50">Connected identity</p>
                  <p className="truncate font-mono text-sm text-navy">{short}</p>
                  {network && (
                    <p className="mt-1 text-xs text-black/40">{network}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(address);
                    setOpen(false);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-black/70 hover:bg-black/5 hover:text-ink"
                >
                  Copy address
                </button>
                <button
                  onClick={() => {
                    disconnect();
                    setOpen(false);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-[#ff8a8a] hover:bg-black/5"
                >
                  Disconnect
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={connect}
        disabled={connecting}
        className={`group relative overflow-hidden rounded-lg border border-navy/40 bg-navy/[0.06] font-medium text-navy transition-colors hover:bg-navy/[0.12] disabled:opacity-50 ${
          compact ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm"
        }`}
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
      {error && (
        <span className="absolute right-0 top-full mt-1 w-max max-w-[220px] text-right text-[11px] text-[#ff8a8a]">
          {error}
        </span>
      )}
    </div>
  );
}
