"use client";

/* ============================================================================
   NEX-ERA — Login.  The warm-white airlock into the AI Command Center.
   ----------------------------------------------------------------------------
   Sunrise canvas + a soft orbital "portal", floating live system-status cards
   and a clean glass sign-in panel. On a successful login the screen does NOT
   snap to the next route — it runs a brief threshold cross, then hands off to
   the dashboard boot. Real auth (POST /api/auth/login) is preserved exactly.
   ========================================================================== */

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { NexeraMark } from "@/components/Logo";
import { Chip, cx } from "@/components/uikit";
import { armBoot } from "@/components/boot/BootGate";

const EASE = [0.22, 1, 0.36, 1] as const;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard/home";
  const denied = params.get("denied");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [booting, setBooting] = useState(false);
  const reduce = useRef(false);
  useEffect(() => {
    reduce.current = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  function runBoot() {
    setBooting(true);
    if (next.startsWith("/dashboard")) armBoot();
    window.setTimeout(() => {
      router.replace(next);
      router.refresh();
    }, reduce.current ? 150 : 900);
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Authentication failed");
        setBusy(false);
        return;
      }
      runBoot();
    } catch {
      setErr("Network error — link could not be established");
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-canvas text-ink">
      {/* sunrise wash + warm orbs */}
      <div className="pointer-events-none absolute inset-0 bg-sunrise" />
      <div className="pointer-events-none absolute -left-32 bottom-[-10%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(251,140,106,0.18),transparent_70%)]" />

      <div className="relative z-10 grid min-h-[100svh] grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        {/* ============================ LEFT — portal HQ ============================ */}
        <aside className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
          <div className="flex items-center gap-3">
            <NexeraMark size={34} />
            <span className="font-display text-xl font-bold tracking-tight text-ink">NEX·ERA</span>
          </div>

          <div className="relative grid place-items-center py-6">
            <Portal />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="absolute bottom-2 text-center"
            >
              <div className="font-display text-sm font-bold uppercase tracking-[0.4em] text-ink">Enter Nex-Era</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.3em] text-faint">The AI Operating System</div>
            </motion.div>

            <StatusCard className="absolute left-0 top-6" label="AI Agents" value="6 online" tone="success" delay={0.7} />
            <StatusCard className="absolute right-0 top-24" label="AI Router" value="optimal" tone="success" delay={0.9} signal />
            <StatusCard className="absolute bottom-24 left-2" label="Your Data" value="encrypted" tone="warning" delay={1.1} />
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Network online</span>
            <span className="h-3 w-px bg-line-strong" />
            <span>v1 · command center</span>
          </div>
        </aside>

        {/* ============================ RIGHT — login panel ============================ */}
        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative w-full max-w-md"
          >
            <div className="relative overflow-hidden rounded-3xl border border-line bg-surface/90 p-7 shadow-pop backdrop-blur-xl sm:p-9">
              <span className="pointer-events-none absolute inset-x-9 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(242,118,28,0.6),rgba(251,140,106,0.6),transparent)]" />

              <div className="mb-6 flex items-center gap-2.5 lg:hidden">
                <NexeraMark size={30} />
                <span className="font-display text-lg font-bold tracking-tight text-ink">NEX·ERA</span>
              </div>

              <Chip tone="accent" dot className="mb-4">Secure terminal</Chip>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Welcome back</h1>
              <p className="mt-2 text-sm text-muted">Authenticate to enter your AI universe.</p>

              {denied === "admin" && (
                <div className="mt-5 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-[#b27400]">
                  <span className="mt-0.5">⚠</span> That sector is admin-only — authenticate with an admin account.
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <SsoButton onClick={() => setInfo("Single sign-on is being provisioned — use operator credentials below.")} label="Google" icon={<GoogleIcon />} />
                <SsoButton onClick={() => setInfo("Single sign-on is being provisioned — use operator credentials below.")} label="GitHub" icon={<GitHubIcon />} />
              </div>

              <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-faint">
                <span className="h-px flex-1 bg-line" />
                or operator credentials
                <span className="h-px flex-1 bg-line" />
              </div>

              <form onSubmit={submit} className="space-y-4">
                <Field label="Operator ID">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    placeholder="admin"
                    className={inputCls}
                  />
                </Field>

                <Field label="Access key">
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      aria-label={show ? "Hide access key" : "Show access key"}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      {show ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </Field>

                {err && (
                  <p className="flex items-center gap-1.5 text-xs text-danger">
                    <span>✕</span> {err}
                  </p>
                )}
                {info && !err && (
                  <p className="flex items-center gap-1.5 text-xs text-info">
                    <span>ⓘ</span> {info}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="group relative mt-2 inline-flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-brand to-accent-soft text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:shadow-lg hover:brightness-[1.03] active:scale-[0.99] disabled:opacity-70"
                >
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Establishing link…
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-white/90" />
                      Enter Nex-Era
                      <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14m0 0-6-6m6 6-6 6" />
                      </svg>
                    </>
                  )}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)] transition-transform duration-700 group-hover:translate-x-full" />
                </button>
              </form>

              <p className="mt-6 text-center text-[11px] text-faint">
                Restricted access · contact the workspace owner for credentials.
              </p>
            </div>
          </motion.div>
        </section>
      </div>

      <AnimatePresence>{booting && <WarpOut />}</AnimatePresence>
    </main>
  );
}

/* -------------------------------------------------------- warp-out */
function WarpOut() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[999] grid place-items-center bg-[rgba(251,248,244,0.92)] backdrop-blur-xl"
      role="status"
      aria-label="Entering Nex-Era"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0.4 }}
        animate={{ scale: [0.7, 1, 2.6], opacity: [0.4, 1, 0] }}
        transition={{ duration: 1.1, ease: EASE, times: [0, 0.4, 1] }}
        className="pointer-events-none absolute inset-0 grid place-items-center"
      >
        <div className="h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(242,118,28,0.5),rgba(251,140,106,0.2),transparent_70%)]" />
      </motion.div>
      <div className="relative z-10 text-center">
        <div className="font-display text-2xl font-bold">
          <span className="bg-accent-gradient bg-clip-text text-transparent">Entering the universe</span>
        </div>
        <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.3em] text-faint">establishing neural link…</div>
      </div>
    </motion.div>
  );
}

/* --------------------------------------------------------- subparts */

/** Warm orbital portal — concentric rings with a soft sun core. */
function Portal() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: EASE }}
      className="relative grid h-[360px] w-[360px] place-items-center"
    >
      {[300, 230, 160].map((s, i) => (
        <span
          key={s}
          className="absolute rounded-full border border-brand/15"
          style={{ width: s, height: s, animation: `spin-y ${18 + i * 6}s linear infinite` }}
        />
      ))}
      <span className="absolute h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,196,140,0.35),transparent_65%)]" />
      <span className="relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-[#ffd9a8] to-[#ff8a3d] shadow-[0_0_60px_-8px_rgba(242,118,28,0.6)] motion-safe:animate-[float_6s_ease-in-out_infinite]">
        <NexeraMark size={40} />
      </span>
    </motion.div>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none transition-all placeholder:text-faint focus:border-brand/50 focus:bg-surface focus:shadow-[0_0_0_3px_rgba(242,118,28,0.15)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-faint">{label}</span>
      {children}
    </label>
  );
}

function SsoButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface py-2.5 text-sm font-medium text-muted transition-all hover:border-line-strong hover:bg-surface-2 hover:text-ink"
    >
      {icon}
      {label}
    </button>
  );
}

function StatusCard({ label, value, tone, className, delay = 0, signal }: { label: string; value: string; tone: "success" | "warning"; className?: string; delay?: number; signal?: boolean }) {
  const dot = tone === "success" ? "bg-success" : "bg-warning";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: EASE }}
      className={cx("pointer-events-none w-40 rounded-2xl border border-line bg-surface/90 p-3 shadow-lift backdrop-blur-xl motion-safe:animate-[float_6s_ease-in-out_infinite]", className)}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">{label}</span>
        <span className={cx("h-1.5 w-1.5 rounded-full", dot)} />
      </div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
      {signal && <ConnectionBars />}
    </motion.div>
  );
}

function ConnectionBars() {
  return (
    <div className="mt-2 flex items-end gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-brand motion-safe:animate-[float_1.4s_ease-in-out_infinite]"
          style={{ height: `${5 + i * 3}px`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

/* icons */
function Eye() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" /></svg>; }
function EyeOff() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.6 6.6A18.5 18.5 0 0 0 2 12s3 8 10 8a9.1 9.1 0 0 0 5.4-1.6M1 1l22 22M9.9 9.9a3 3 0 1 0 4.2 4.2" /></svg>; }
function GoogleIcon() { return <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.7 3-4.3 3-7.3 0-.7-.1-1.4-.2-2z" opacity=".95"/><path fill="#34A853" d="M12 21.6c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.4-4H3.3v2.5A10 10 0 0 0 12 21.6z"/><path fill="#FBBC05" d="M6.6 13.7a6 6 0 0 1 0-3.8V7.4H3.3a10 10 0 0 0 0 9z"/><path fill="#EA4335" d="M12 6.5c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.3 7.4l3.3 2.5C7.3 7.7 9.5 6.5 12 6.5z"/></svg>; }
function GitHubIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2A10 10 0 0 0 8.8 21.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/></svg>; }

export default function LoginPage() {
  return (
    <MotionConfig reducedMotion="user">
      <Suspense>
        <LoginForm />
      </Suspense>
    </MotionConfig>
  );
}
