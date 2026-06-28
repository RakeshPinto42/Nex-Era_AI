"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import BootSequence from "./BootSequence";

/**
 * BootGate — wraps a protected surface (the dashboard) and, when armed, plays
 * the cinematic BootSequence on entry, then reveals the surface ASSEMBLING in
 * (materialize: blur+scale clear) rather than snapping on. Plays once per arm.
 *
 * Arming is decoupled from layout: any prior screen calls `armBoot()` right
 * before navigating here (e.g. login on successful auth). If not armed, the
 * surface renders normally with zero overhead — BootGate is a no-op.
 *
 * Does NOT touch the dashboard's design; it only orchestrates the entrance.
 */

const BOOT_KEY = "nex:boot";
const EASE = [0.22, 1, 0.36, 1] as const;

/** Call before navigating to the gated surface to play the boot on arrival. */
export function armBoot() {
  try {
    sessionStorage.setItem(BOOT_KEY, "1");
  } catch {
    /* SSR / privacy mode — boot simply won't play */
  }
}

export default function BootGate({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = React.useState(false);
  const [armed, setArmed] = React.useState(false);

  React.useEffect(() => {
    let on = false;
    try {
      on = sessionStorage.getItem(BOOT_KEY) === "1";
      if (on) sessionStorage.removeItem(BOOT_KEY);
    } catch {
      /* ignore */
    }
    if (on) {
      setArmed(true);
      setBooting(true);
    }
  }, []);

  return (
    <>
      {/* dashboard mounts immediately (loads data under the overlay); hidden
          while booting, then assembles in once the sequence completes. */}
      <motion.div
        initial={false}
        animate={booting ? { opacity: 0, scale: 0.985, filter: "blur(8px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: armed && !booting ? 0.9 : 0, ease: EASE }}
        style={{ transformOrigin: "50% 45%" }}
      >
        {children}
      </motion.div>

      <AnimatePresence>{booting && <BootSequence onComplete={() => setBooting(false)} />}</AnimatePresence>
    </>
  );
}
