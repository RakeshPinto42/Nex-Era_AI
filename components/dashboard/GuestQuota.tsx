"use client";

import { useEffect, useState } from "react";

type Q = { limit: number; remaining: number };
type Me = {
  user: { username: string; role: string } | null;
  quota: { image: Q; video: Q; text: Q } | null;
};

// Shows a guest's remaining daily allowance for one action. Renders nothing for
// admins (unlimited) or while loading.
export default function GuestQuota({ action }: { action: "image" | "video" | "text" }) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setMe)
      .catch(() => {});
  }, []);

  if (!me?.quota) return null;
  const q = me.quota[action];
  const low = q.remaining <= Math.max(1, Math.ceil(q.limit * 0.2));

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] ${
        low
          ? "border-rose-500/30 bg-rose-500/[0.06] text-rose-600"
          : "border-white/10 bg-white/[0.04] text-white/60"
      }`}
      title="Guest accounts have a daily limit"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${low ? "bg-rose-500" : "bg-navy"}`} />
      Guest · {q.remaining}/{q.limit} {action === "text" ? "messages" : `${action}s`} left today
    </span>
  );
}
