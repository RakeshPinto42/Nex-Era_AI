"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NexeraMark } from "@/components/Logo";
import MeshField from "@/components/MeshField";
import { INTENT_ORDER, INTENTS } from "@/lib/brand/intent";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const denied = params.get("denied");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Login failed");
        setBusy(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setErr("Network error");
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ---- brand panel (left) ---- */}
      <aside className="relative hidden overflow-hidden bg-[#0b1630] lg:flex">
        {/* live mesh */}
        <MeshField className="pointer-events-none absolute inset-0 h-full w-full opacity-90 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_40%,black,transparent_95%)]" />
        {/* depth gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#0b1630] via-transparent to-[#3b82f6]/40" />

        <div className="relative z-10 flex w-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <NexeraMark size={36} />
            <span className="font-display text-xl font-semibold tracking-tight text-white">
              NEXERA
            </span>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl font-bold leading-[1.05] tracking-tight text-white">
              One Interface.
              <br />
              Infinite Models.
            </h2>
            <p className="mt-4 text-balance text-white/55">
              The operating system for decentralized AI — one interface routing
              every prompt across a network of open models.
            </p>
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
              color = routed intent
            </p>
            <div className="flex flex-wrap gap-2">
              {INTENT_ORDER.map((key) => {
                const it = INTENTS[key];
                return (
                  <span
                    key={key}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-white/70"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: it.hex, boxShadow: `0 0 8px ${it.hex}` }}
                    />
                    {it.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* ---- form panel (right) ---- */}
      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* mobile brand */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <NexeraMark size={32} />
            <span className="font-display text-lg font-semibold tracking-tight text-neutral-900">
              NEXERA
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-900">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-black/50">
            Sign in to your workspace to continue.
          </p>

          {denied === "admin" && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              <span className="mt-0.5">⚠</span>
              That area is admin-only — sign in with an admin account.
            </div>
          )}

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-black/60">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                placeholder="admin"
                className="w-full rounded-xl border border-black/10 bg-black/[0.015] px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-black/25 focus:border-navy/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-black/60">
                Password
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-black/10 bg-black/[0.015] px-3.5 py-2.5 pr-11 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-black/25 focus:border-navy/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-black/35 transition-colors hover:bg-black/5 hover:text-black/70"
                >
                  {show ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.6 6.6A18.5 18.5 0 0 0 2 12s3 8 10 8a9.1 9.1 0 0 0 5.4-1.6M1 1l22 22M9.9 9.9a3 3 0 1 0 4.2 4.2" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {err && (
              <p className="flex items-center gap-1.5 text-xs text-rose-600">
                <span>✕</span> {err}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1d2f54] hover:shadow-md disabled:opacity-50"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <>
                  Sign in
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-[11px] text-black/35">
            <span className="h-px flex-1 bg-black/10" />
            restricted access
            <span className="h-px flex-1 bg-black/10" />
          </div>
          <p className="mt-3 text-center text-[11px] text-black/35">
            Contact the workspace owner for credentials.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
