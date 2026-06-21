"use client";

import { motion } from "framer-motion";
import Logo from "./Logo";
import ConnectWallet from "./web3/ConnectWallet";

const links = [
  { label: "Workspaces", href: "#workspaces" },
  { label: "Router", href: "#router" },
  { label: "Capabilities", href: "#features" },
  { label: "Ledger", href: "#finance" },
  { label: "Console", href: "#terminal" },
];

export default function Nav() {
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav className="flex w-full max-w-6xl items-center justify-between rounded-2xl border border-black/10 bg-white/85 px-4 py-2.5 shadow-lg shadow-black/40 backdrop-blur-md">
        <Logo size={34} />

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-sm text-black/60 transition-colors hover:bg-black/5 hover:text-neutral-900"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ConnectWallet compact />
          </div>
          <a
            href="/dashboard"
            className="group relative overflow-hidden rounded-lg bg-navy px-3.5 py-1.5 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
          >
            <span className="relative z-10">Enter NEXERA</span>
          </a>
        </div>
      </nav>
    </motion.header>
  );
}
