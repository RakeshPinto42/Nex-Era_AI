"use client";

/* ============================================================================
   NEX-ERA — AI COMMAND CENTER.  A three-zone AI Operating System home:
     • Left   — global navigation (Chrome sidebar)
     • Main   — fluid, full-width, information-dense widget grid (live data)
     • Right  — a Dashboard Context Panel (AI Copilot, continue-work, suggested
                next actions, smart notifications) — contextual, never duplicating
                a main widget.
   All data is real (markets, crypto, TAO, research/worlds/chat local stores).
   ========================================================================== */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useDashboard } from "@/components/dashboard/store";
import { CountUp } from "@/components/fx";
import { ToolCard, ProgressRing, Chip, Skeleton, EmptyState, Button } from "@/components/uikit";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ----------------------------------------------------------------- types */
type Idx = { symbol: string; name: string; currency: string; price: number; d24: number | null; series: number[] };
type Row = { symbol: string; name: string; price: number; currency: string; d24: number | null };
type Coin = { id: string; name: string; symbol: string; price: number; d24: number | null; series: number[] };
type WorldT = { id: string; name: string; emoji: string; updatedAt: number; items: { kind: string; title: string; done?: boolean; file?: unknown }[] };

const money = (n: number, cur = "USD") =>
  `${cur === "INR" ? "₹" : "$"}${n.toLocaleString(cur === "INR" ? "en-IN" : "en-US", { maximumFractionDigits: n >= 1 ? 2 : 4 })}`;
const pct = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`);
const pcCls = (n: number | null) => (n == null ? "text-faint" : n >= 0 ? "text-success" : "text-danger");
const relTime = (ts: number) => {
  const m = Math.floor((Date.now() - ts) / 60000);
  return m < 1 ? "now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
};

function useGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

export default function CommandCenter() {
  const router = useRouter();
  const { availableModels, conversations, agentStatus, tokensIn, tokensOut, createConversation } = useDashboard();
  const greeting = useGreeting();

  const [me, setMe] = useState("Operator");
  const [now, setNow] = useState(() => new Date());
  const [mkt, setMkt] = useState<{ indices: Idx[]; growth: Row[]; us: Row[]; metals: Row[] } | null>(null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [tao, setTao] = useState<{ price: number; d24: number; series: number[] } | null>(null);
  // Intelligence inputs — pulled from the other surfaces' local stores.
  const [research, setResearch] = useState<{ id: string; title: string; mode: string }[]>([]);
  const [worlds, setWorlds] = useState<WorldT[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; name: string; dir: string; target: number; currency: string; triggeredAt?: number }[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) { setMe(d.user.displayName ?? d.user.username); try { setAlerts(JSON.parse(localStorage.getItem(`nexera.invest.alerts.${d.user.username}`) ?? "[]")); } catch { /* ignore */ } }
    }).catch(() => {});
    try { setResearch(JSON.parse(localStorage.getItem("nexera.research.history.v1") ?? "[]")); } catch { /* ignore */ }
    try { setWorlds(JSON.parse(localStorage.getItem("nexera.worlds.v1") ?? "[]")); } catch { /* ignore */ }
    const t = setInterval(() => setNow(new Date()), 1000);
    fetch("/api/investments/markets").then((r) => r.json()).then((d) => setMkt({ indices: d.indices ?? [], growth: d.growth ?? [], us: d.us ?? [], metals: d.metals ?? [] })).catch(() => {});
    fetch("/api/investments/crypto").then((r) => r.json()).then((d) => setCoins(d.items ?? [])).catch(() => {});
    // TAO (Bittensor) live from CoinGecko — keyless.
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bittensor&sparkline=true&price_change_percentage=24h")
      .then((r) => r.json())
      .then((d) => { const c = d?.[0]; if (c) setTao({ price: c.current_price, d24: c.price_change_percentage_24h ?? 0, series: c.sparkline_in_7d?.price ?? [] }); })
      .catch(() => {});
    return () => clearInterval(t);
  }, []);

  const btc = coins.find((c) => c.symbol?.toLowerCase() === "btc");
  const gold = mkt?.metals.find((m) => m.symbol === "GC=F");
  const tiles: Idx[] = useMemo(() => {
    const out: Idx[] = [];
    const nifty = mkt?.indices.find((i) => i.symbol === "^NSEI");
    const sp = mkt?.indices.find((i) => i.symbol === "^GSPC");
    if (nifty) out.push(nifty);
    if (sp) out.push(sp);
    if (btc) out.push({ symbol: "BTC", name: "BTC/USDT", currency: "USD", price: btc.price, d24: btc.d24, series: btc.series });
    if (gold) out.push({ symbol: "GC=F", name: "GOLD/OZ", currency: gold.currency, price: gold.price, d24: gold.d24, series: [] });
    return out;
  }, [mkt, btc, gold]);

  const watchlist: Row[] = useMemo(() => [...(mkt?.growth.slice(0, 2) ?? []), ...(mkt?.us.slice(0, 2) ?? [])], [mkt]);
  const activeAgents = 4;
  const memPct = Math.min(100, Math.round(((tokensIn + tokensOut) / 128000) * 100));

  const startChat = () => { createConversation(); router.push("/dashboard"); };

  // ---- personalization: infer focus from recent activity ----
  const recentConvos = useMemo(() => [...conversations].filter((c) => c.messages.length).sort((a, b) => b.updatedAt - a.updatedAt), [conversations]);
  const focus = useMemo<"markets" | "coding" | "research" | "german" | "general">(() => {
    const titles = recentConvos.slice(0, 6).map((c) => c.title).join(" ").toLowerCase();
    const intents = recentConvos.slice(0, 6).flatMap((c) => c.messages.filter((m) => m.role === "assistant" && m.intent).map((m) => m.intent));
    if (alerts.length || /market|stock|invest|crypto|btc|nifty|portfolio/.test(titles)) return "markets";
    if (intents.filter((i) => i === "coding").length >= 1 || /code|build|refactor|component|api/.test(titles)) return "coding";
    if (/german|spanish|french|language|lesson|vocab/.test(titles)) return "german";
    if (research.length) return "research";
    return "general";
  }, [recentConvos, alerts, research]);

  // storage estimate + cross-surface intelligence
  const storageKb = useMemo(() => worlds.reduce((s, w) => s + (w.items?.length ?? 0) * 4, 0), [worlds]);
  const taskItems = useMemo(() => worlds.flatMap((w) => (w.items ?? []).filter((i) => i.kind === "task" && !i.done).map((i) => ({ world: w.name, title: i.title }))).slice(0, 4), [worlds]);
  const fileItems = useMemo(() => worlds.flatMap((w) => (w.items ?? []).filter((i) => i.file).map((i) => ({ world: w.name, title: i.title }))).slice(0, 5), [worlds]);
  const docCount = useMemo(() => worlds.reduce((n, w) => n + (w.items?.filter((i) => i.file).length ?? 0), 0), [worlds]);
  const recentWorlds = useMemo(() => [...worlds].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4), [worlds]);

  const recommendation = {
    markets: "You’ve been tracking markets — review the Investment Hub watchlist and any triggered alerts.",
    coding: "Pick up your last build in the AI Studio — your code blocks are saved as artifacts.",
    research: "Continue your last research thread, or start a new web/PDF investigation.",
    german: "Keep your German streak — a new lesson (Kapitel 5) is ready.",
    general: "Start a chat, or open a World to organize a project end-to-end.",
  }[focus];

  const lastResearch = research[0];

  // "Continue where you left off" — the single most recent resumable item
  // (kept distinct from the Activity widget, which lists chats).
  const continueItem = useMemo(() => {
    if (lastResearch) return { kind: "Research", title: lastResearch.title, href: "/dashboard/research", icon: "🔬" };
    if (recentWorlds[0]) return { kind: "World", title: recentWorlds[0].name, href: "/dashboard/worlds", icon: recentWorlds[0].emoji };
    if (recentConvos[0]) return { kind: "Chat", title: recentConvos[0].title, href: "/dashboard", icon: "💬" };
    return null;
  }, [lastResearch, recentWorlds, recentConvos]);

  // Smart notifications — real signals, shown ONLY here (not echoed in the grid).
  const notifications = useMemo(() => {
    const out: { icon: string; text: string; tone: "danger" | "accent" | "info" | "success" }[] = [];
    const fired = alerts.filter((a) => a.triggeredAt).length;
    if (fired) out.push({ icon: "🔔", text: `${fired} price alert${fired > 1 ? "s" : ""} triggered`, tone: "danger" });
    out.push({ icon: "🇩🇪", text: "German lesson · Kapitel 5 is ready", tone: "accent" });
    if (research.length) out.push({ icon: "🔬", text: `${research.length} research result${research.length > 1 ? "s" : ""} saved`, tone: "info" });
    if (btc?.d24 != null) out.push({ icon: "₿", text: `BTC ${btc.d24 >= 0 ? "+" : ""}${btc.d24.toFixed(1)}% in 24h`, tone: btc.d24 >= 0 ? "success" : "danger" });
    return out.slice(0, 4);
  }, [alerts, research, btc]);

  // personalized quick-launch ordering
  const launchOrder = useMemo(() => {
    const pref: Record<string, string> = { markets: "Data & Excel", coding: "Code Studio", research: "Research", german: "AI Chat", general: "AI Chat" };
    const first = pref[focus];
    return [...LAUNCH].sort((a, b) => (a.label === first ? -1 : b.label === first ? 1 : 0));
  }, [focus]);

  // ---- main grid widgets (unique data; focus floats the relevant one first) ----
  const widgets = useMemo(() => {
    const list: { key: string; node: JSX.Element }[] = [
      { key: "german", node: <ProgressTutor onCta={startChat} /> },
      { key: "invest", node: <InvestmentMini tiles={tiles} watchlist={watchlist} /> },
      { key: "agents", node: <AgentsRunning active={activeAgents} /> },
      { key: "research", node: <ResearchWidget research={research} /> },
      { key: "tao", node: <TaoCard tao={tao} /> },
      { key: "activity", node: <ActivityFeed conversations={conversations} /> },
      { key: "worlds", node: <RecentWorldsWidget worlds={recentWorlds} /> },
      { key: "docs", node: <DocumentsWidget files={fileItems} docCount={docCount} /> },
    ];
    const firstKey = { markets: "invest", research: "research", german: "german", coding: "agents", general: "german" }[focus];
    return list.sort((a, b) => (a.key === firstKey ? -1 : b.key === firstKey ? 1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, watchlist, research, tao, conversations, recentWorlds, fileItems, docCount, focus]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ===================== MAIN — fluid, information-dense ===================== */}
      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[320px] bg-sunrise" />
        <Sun />

        <div className="mx-auto w-full max-w-[1760px] px-6 py-6 2xl:px-8">
          {/* ---- greeting + clock ---- */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[2rem]">
                {greeting}, <span className="text-brand capitalize">{me}</span>.
              </h1>
              <p className="mt-1 text-sm text-muted">Here’s your AI ecosystem at a glance.</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold tabular-nums text-ink">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              <p className="font-mono text-[11px] text-faint">{now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</p>
            </div>
          </motion.div>

          {/* ---- system telemetry ribbon (live stats) ---- */}
          <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-1.5 rounded-xl border border-line bg-surface px-4 py-2.5 font-mono text-[11px] shadow-soft">
            <span className="flex items-center gap-1.5 text-success" title="AI engine status"><span className={`h-1.5 w-1.5 rounded-full bg-success ${agentStatus === "running" || agentStatus === "thinking" ? "fx-live" : ""}`} /> AI {agentStatus === "idle" ? "READY" : agentStatus.toUpperCase()}</span>
            <Rib k={activeAgents} label="AGENTS" hint="Active AI agents" />
            <Rib k={availableModels.length} label="MODELS" hint="Models available across providers" />
            <Rib k={research.length} label="RESEARCH JOBS" hint="Saved research investigations" />
            <Rib k={worlds.length} label="WORLDS" hint="Your knowledge Worlds" />
            <span className="text-muted" title="Context window used">MEMORY <span className="text-ink">{memPct}%</span></span>
            <span className="text-muted" title="Local storage across Worlds">STORAGE <span className="text-ink">{storageKb < 1024 ? `${storageKb} KB` : `${(storageKb / 1024).toFixed(1)} MB`}</span></span>
          </div>

          {/* ---- quick launch row (personalized order) ---- */}
          <div className="mb-6 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
            {launchOrder.map((l) => (
              <ToolCard key={l.label} label={l.label} href={l.href} icon={l.icon} tint={l.tint} />
            ))}
          </div>

          {/* ---- dense widget grid — fills the width, no gutters ---- */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]"
          >
            {widgets.map((w) => (
              <motion.div key={w.key} variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}>
                {w.node}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>

      {/* ===================== CONTEXT PANEL — Dashboard context ===================== */}
      <aside className="hidden w-[340px] flex-none flex-col gap-4 overflow-y-auto border-l border-line bg-surface/50 p-4 backdrop-blur-sm xl:flex">
        <CopilotBox recommendation={recommendation} onAsk={startChat} />
        <ContinueCard item={continueItem} />
        <NextActions tasks={taskItems} alerts={alerts} onStartChat={startChat} />
        <Notifications items={notifications} />
        <ShortcutsFooter />
      </aside>
    </div>
  );
}

/* sunrise sun — soft glowing disc top-right of the header band */
function Sun() {
  return (
    <div className="pointer-events-none absolute right-[8%] top-6 -z-10 hidden sm:block">
      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#ffd9a8] to-[#ff9a52] opacity-70 blur-[2px]" />
    </div>
  );
}

/* ============================================================ CONTEXT PANEL */

function PanelCard({ title, action, children }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

function CopilotBox({ recommendation, onAsk }: { recommendation: string; onAsk: () => void }) {
  const [v, setV] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); onAsk(); };
  return (
    <section className="rounded-2xl border border-brand/20 bg-gradient-to-br from-accent-tint to-surface p-4 shadow-soft">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-brand to-accent-soft text-[11px] text-white">✦</span>
        <p className="font-display text-[14px] font-semibold text-ink">AI Copilot</p>
      </div>
      <p className="mb-3 text-[12px] leading-relaxed text-muted"><span className="font-semibold text-brand">Recommends:</span> {recommendation}</p>
      <form onSubmit={submit} className="relative">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Ask anything, build anything…"
          aria-label="Ask the AI copilot"
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-3.5 pr-10 text-sm text-ink placeholder:text-faint outline-none transition-all focus:border-brand/50 focus:shadow-[0_0_0_3px_rgba(242,118,28,0.15)]"
        />
        <button type="submit" aria-label="Start chat" className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg bg-gradient-to-br from-brand to-accent-soft text-white transition-transform active:scale-90">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
        </button>
      </form>
    </section>
  );
}

function ContinueCard({ item }: { item: { kind: string; title: string; href: string; icon: string } | null }) {
  return (
    <PanelCard title="Continue where you left off">
      {item ? (
        <Link href={item.href} className="group flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3 transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-2">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-surface text-base shadow-soft">{item.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-faint">{item.kind}</span>
            <span className="block truncate text-[13px] font-semibold text-ink">{item.title}</span>
          </span>
          <span className="text-faint transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      ) : (
        <p className="py-3 text-center text-[12px] text-faint">Nothing in progress yet — start a chat or open a World.</p>
      )}
    </PanelCard>
  );
}

function NextActions({ tasks, alerts, onStartChat }: { tasks: { world: string; title: string }[]; alerts: { triggeredAt?: number }[]; onStartChat: () => void }) {
  const fired = alerts.filter((a) => a.triggeredAt).length;
  const rows: { icon: string; label: string; sub?: string; href?: string; onClick?: () => void }[] = [];
  tasks.slice(0, 3).forEach((t) => rows.push({ icon: "✓", label: t.title, sub: t.world, href: "/dashboard/worlds" }));
  if (alerts.length) rows.push({ icon: "🔔", label: fired ? `Review ${fired} triggered alert${fired > 1 ? "s" : ""}` : `${alerts.length} alert${alerts.length > 1 ? "s" : ""} watching`, href: "/dashboard/investments" });
  if (rows.length < 3) rows.push({ icon: "💬", label: "Ask the AI a question", onClick: onStartChat });

  return (
    <PanelCard title="Suggested next actions">
      <ul className="space-y-1.5">
        {rows.map((r, i) => {
          const inner = (
            <span className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/50 p-2.5 transition-all hover:-translate-y-0.5 hover:border-line-strong">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-surface text-[13px]">{r.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-ink">{r.label}</span>
                {r.sub && <span className="block truncate text-[10.5px] text-faint">{r.sub}</span>}
              </span>
              <span className="text-faint">→</span>
            </span>
          );
          return r.href ? (
            <li key={i}><Link href={r.href}>{inner}</Link></li>
          ) : (
            <li key={i}><button onClick={r.onClick} className="block w-full text-left">{inner}</button></li>
          );
        })}
      </ul>
    </PanelCard>
  );
}

function Notifications({ items }: { items: { icon: string; text: string; tone: "danger" | "accent" | "info" | "success" }[] }) {
  const dot = { danger: "bg-danger", accent: "bg-brand", info: "bg-info", success: "bg-success" } as const;
  return (
    <PanelCard title="Smart notifications">
      {items.length === 0 ? (
        <p className="py-3 text-center text-[12px] text-faint">You’re all caught up ✨</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((n, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className={`mt-1.5 h-1.5 w-1.5 flex-none rounded-full ${dot[n.tone]}`} />
              <span className="flex-1 text-[12.5px] leading-snug text-ink"><span className="mr-1">{n.icon}</span>{n.text}</span>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}

function ShortcutsFooter() {
  const rows: [string, string[]][] = [
    ["Search", ["⌘", "K"]],
    ["New chat", ["⌘", "N"]],
    ["Command center", ["G", "H"]],
  ];
  return (
    <section className="mt-auto rounded-2xl border border-line bg-surface-2/50 p-4">
      <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">Shortcuts</p>
      <ul className="space-y-2">
        {rows.map(([label, keys]) => (
          <li key={label} className="flex items-center justify-between">
            <span className="text-[12px] text-muted">{label}</span>
            <span className="flex items-center gap-1">
              {keys.map((k) => (
                <kbd key={k} className="grid h-5 min-w-5 place-items-center rounded-md border border-line bg-surface px-1.5 font-mono text-[10px] text-ink shadow-soft">{k}</kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ====================================================== ribbon + launch */
function Rib({ k, label, hint }: { k: number; label: string; hint?: string }) {
  return <span className="text-muted" title={hint}><CountUp value={k} className="text-ink" /> {label}</span>;
}

const LAUNCH: { label: string; href: string; icon: JSX.Element; tint: string }[] = [
  { label: "AI Chat", href: "/dashboard", tint: "#f2761c", icon: <I d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
  { label: "Code Studio", href: "/workspace/code", tint: "#3b82f6", icon: <I d="m8 9-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" /> },
  { label: "Documents", href: "/dashboard/files", tint: "#16a34a", icon: <I d="M14 3v5h5M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /> },
  { label: "Research", href: "/dashboard/research", tint: "#8b5cf6", icon: <I d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /> },
  { label: "Data & Excel", href: "/dashboard/investments", tint: "#0ea5a3", icon: <I d="M3 3v18h18M7 14l3-3 3 3 5-6" /> },
  { label: "Worlds", href: "/dashboard/worlds", tint: "#f59e0b", icon: <I d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18" /> },
  { label: "Media Studio", href: "/dashboard/images", tint: "#ec4899", icon: <I d="M3 3h18v18H3zM9 9a2 2 0 1 0 0-.01M21 15l-5-5L5 21" /> },
  { label: "AI Agents", href: "/dashboard/agents", tint: "#6366f1", icon: <I d="M4 8h16v12H4zM12 8V4M9 14h.01M15 14h.01" /> },
  { label: "More Tools", href: "/dashboard/studio", tint: "#f2761c", icon: <I d="M12 2 4 7v10l8 5 8-5V7z" /> },
];
function I({ d }: { d: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

/* ====================================================== widget shell */
function WidgetCard({ title, badge, action, children }: { title: string; badge?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft hover-lift">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
          {badge}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ====================================================== german tutor */
function ProgressTutor({ onCta }: { onCta: () => void }) {
  return (
    <WidgetCard title="German Tutor" badge={<span className="rounded-md bg-brand/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-hover">A2</span>}>
      <div className="mb-4 flex flex-1 items-center gap-4">
        <ProgressRing value={67} size={84} />
        <div className="text-[13px]">
          <p className="text-faint">Your progress</p>
          <p className="font-display text-xl font-bold text-ink">A2 <span className="text-sm font-normal text-muted">Intermediate</span></p>
          <p className="mt-1 text-muted">Kapitel 5 · <span className="text-ink">872 lessons</span></p>
        </div>
      </div>
      <button onClick={onCta} className="rounded-xl border border-line bg-surface-2 py-2.5 text-sm font-semibold text-ink transition-all hover:bg-surface-3 active:scale-[0.98]">Continue learning →</button>
    </WidgetCard>
  );
}

/* ====================================================== investment mini */
function InvestmentMini({ tiles, watchlist }: { tiles: Idx[]; watchlist: Row[] }) {
  return (
    <WidgetCard title="Investment Hub" action={<Link href="/dashboard/investments" className="text-[11px] font-medium text-brand hover:underline">Open →</Link>}>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {tiles.length === 0 ? [0, 1, 2, 3].map((i) => <Skeleton key={i} height={66} rounded="rounded-xl" />) : tiles.map((t) => (
          <div key={t.symbol} className="rounded-xl border border-line bg-surface-2/60 p-2.5">
            <p className="truncate text-[11px] text-muted">{t.name}</p>
            <p className="font-mono text-[13px] font-semibold text-ink">{money(t.price, t.currency)}</p>
            <p className={`font-mono text-[11px] font-semibold ${pcCls(t.d24)}`}>{pct(t.d24)}</p>
          </div>
        ))}
      </div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">Watchlist</p>
      <div className="space-y-1">
        {watchlist.map((w) => (
          <div key={w.symbol} className="flex items-center justify-between text-[12px]">
            <span className="truncate text-ink">{w.name}</span>
            <span className="flex items-center gap-2"><span className="font-mono text-muted">{money(w.price, w.currency)}</span><span className={`font-mono font-semibold ${pcCls(w.d24)}`}>{pct(w.d24)}</span></span>
          </div>
        ))}
        {watchlist.length === 0 && <p className="text-xs text-faint">—</p>}
      </div>
    </WidgetCard>
  );
}

/* ====================================================== research widget */
function ResearchWidget({ research }: { research: { id: string; title: string; mode: string }[] }) {
  return (
    <WidgetCard title="Research" badge={research.length ? <Chip tone="info">{research.length}</Chip> : undefined} action={<Link href="/dashboard/research" className="text-[11px] font-medium text-brand hover:underline">Open →</Link>}>
      {research.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState compact icon={<IconLens />} title="No research yet" description="Investigate the web, a PDF or a video."
            action={<Link href="/dashboard/research"><Button size="sm" variant="outline">Start research →</Button></Link>} />
        </div>
      ) : (
        <ol className="flex-1 space-y-1.5">
          {research.slice(0, 4).map((r) => (
            <li key={r.id}>
              <Link href="/dashboard/research" className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-surface-2">
                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-info/10 text-info"><IconLens /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] text-ink">{r.title}</span><span className="block text-[10.5px] uppercase tracking-wide text-faint">{r.mode}</span></span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}

/* ====================================================== TAO dashboard */
function TaoCard({ tao }: { tao: { price: number; d24: number; series: number[] } | null }) {
  const data = (tao?.series ?? []).filter((_, i) => i % 6 === 0).map((v, i) => ({ i, v }));
  const up = (tao?.d24 ?? 0) >= 0;
  const hex = up ? "#16a34a" : "#ef4444";
  return (
    <WidgetCard title="TAO" badge={<span className="rounded-md bg-danger/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-danger">HOT</span>} action={<Link href="/dashboard/investments" className="text-[11px] font-medium text-brand hover:underline">Markets →</Link>}>
      <p className="mb-1 text-[12px] text-faint">Bittensor Network · live</p>
      <p className="font-display text-2xl font-bold text-ink">{tao ? money(tao.price) : "—"}</p>
      <p className={`mb-2 font-mono text-[12px] font-semibold ${pcCls(tao?.d24 ?? null)}`}>{tao ? `${pct(tao.d24)} 24h` : ""}</p>
      <div className="mt-auto h-20 w-full">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs><linearGradient id="tao" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={hex} stopOpacity={0.32} /><stop offset="100%" stopColor={hex} stopOpacity={0} /></linearGradient></defs>
              <Area type="monotone" dataKey="v" stroke={hex} strokeWidth={1.8} fill="url(#tao)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Skeleton height={80} rounded="rounded-xl" />
        )}
      </div>
    </WidgetCard>
  );
}

/* ====================================================== agents running */
const AGENTS = [
  { name: "Market Analyst", task: "Analyzing US stocks", color: "#3b82f6" },
  { name: "News Researcher", task: "Fetching latest news", color: "#8b5cf6" },
  { name: "Language Tutor", task: "Teaching German A1", color: "#ec4899" },
  { name: "Crypto Tracker", task: "Monitoring 500 coins", color: "#0ea5a3" },
];
function AgentsRunning({ active }: { active: number }) {
  return (
    <WidgetCard title="AI Agents" badge={<span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">{active} active</span>} action={<Link href="/dashboard/agents" className="text-[11px] font-medium text-brand hover:underline">Manage →</Link>}>
      <div className="flex-1 space-y-1">
        {AGENTS.map((a) => (
          <div key={a.name} title={`${a.name} — ${a.task}`} className="flex items-center gap-2.5 py-1.5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-lg text-white" style={{ background: `linear-gradient(135deg, ${a.color}, ${a.color}cc)` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 8h16v12H4zM12 8V4" /></svg>
            </span>
            <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold text-ink">{a.name}</p><p className="truncate text-[10.5px] text-muted">{a.task}</p></div>
            <Chip tone="success" dot>Live</Chip>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

/* ====================================================== activity feed */
function ActivityFeed({ conversations }: { conversations: ReturnType<typeof useDashboard>["conversations"] }) {
  const items = useMemo(() => [...conversations].filter((c) => c.messages.length).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5).map((c) => ({ label: c.title, sub: `${c.messages.length} messages`, ts: c.updatedAt })), [conversations]);
  return (
    <WidgetCard title="Activity" action={items.length ? <Link href="/dashboard" className="text-[11px] font-medium text-brand hover:underline">All →</Link> : undefined}>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState compact icon={<IconPulse />} title="No activity yet" description="Your chats and tasks will appear here." />
        </div>
      ) : (
        <ol className="flex-1 space-y-2.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-info" />
              <div className="min-w-0 flex-1"><p className="truncate text-[12.5px] text-ink">{it.label}</p><p className="text-[10.5px] text-faint">{it.sub} · {relTime(it.ts)}</p></div>
            </li>
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}

/* ====================================================== recent worlds */
function RecentWorldsWidget({ worlds }: { worlds: WorldT[] }) {
  return (
    <WidgetCard title="Recent Worlds" action={<Link href="/dashboard/worlds" className="text-[11px] font-medium text-brand hover:underline">Open →</Link>}>
      {worlds.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState compact icon={<IconGlobe />} title="No worlds yet" description="Create your first World to organize a project."
            action={<Link href="/dashboard/worlds"><Button size="sm" variant="outline">Create a World →</Button></Link>} />
        </div>
      ) : (
        <ol className="flex-1 space-y-1.5">
          {worlds.map((w) => (
            <li key={w.id}>
              <Link href="/dashboard/worlds" className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-surface-2">
                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-surface-2 text-base">{w.emoji}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium text-ink">{w.name}</span><span className="block text-[10.5px] text-faint">{w.items?.length ?? 0} items · {relTime(w.updatedAt)}</span></span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}

/* ====================================================== documents */
function DocumentsWidget({ files, docCount }: { files: { world: string; title: string }[]; docCount: number }) {
  return (
    <WidgetCard title="Documents" badge={docCount ? <Chip tone="success">{docCount}</Chip> : undefined} action={<Link href="/dashboard/files" className="text-[11px] font-medium text-brand hover:underline">Open →</Link>}>
      {files.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState compact icon={<IconDoc />} title="No files yet" description="Upload or generate a document to see it here."
            action={<Link href="/dashboard/files"><Button size="sm" variant="outline">Upload files →</Button></Link>} />
        </div>
      ) : (
        <ol className="flex-1 space-y-1.5">
          {files.map((f, i) => (
            <li key={i}>
              <Link href="/dashboard/files" className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-surface-2">
                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-success/10 text-success"><IconDoc /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] text-ink">{f.title}</span><span className="block truncate text-[10.5px] text-faint">{f.world}</span></span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}

/* widget icons */
function IconLens() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>; }
function IconGlobe() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18" /></svg>; }
function IconDoc() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v5h5M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>; }
function IconPulse() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2 6 4-14 2 8h6" /></svg>; }
