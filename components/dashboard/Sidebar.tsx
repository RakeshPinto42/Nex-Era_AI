"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useDashboard, type Conversation } from "./store";

type Me = { username: string; role: "admin" | "guest"; displayName?: string; title?: string; avatar?: string } | null;

type NavItem = { label: string; href: string; icon: () => JSX.Element; adminOnly?: boolean };

// Grouped navigation. Finance OS is a first-class Workspace alongside
// Router / Workspace / Code — not a secondary feature.
const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Home",
    items: [
      { label: "Command Center", href: "/dashboard/home", icon: IconHome },
      { label: "Worlds", href: "/dashboard/worlds", icon: IconWorlds },
    ],
  },
  {
    label: "Workspaces",
    items: [
      { label: "AI Studio", href: "/dashboard/studio", icon: IconStudio },
      { label: "Router", href: "/dashboard/router", icon: IconRouter },
      { label: "Workspace Intel", href: "/dashboard/workspace", icon: IconWorkspace },
      { label: "Workspace", href: "/workspace", icon: IconWorkspace },
      { label: "Code Folder", href: "/workspace/code", icon: IconCode },
      { label: "Finance OS", href: "/ledger", icon: IconFinance },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { label: "Research", href: "/dashboard/research", icon: IconResearch },
      { label: "Knowledge Layer", href: "/dashboard/knowledge", icon: IconResearch },
    ],
  },
  { label: "Automation", items: [{ label: "Agents", href: "/dashboard/agents", icon: IconAgents }] },
  {
    label: "Markets",
    items: [
      { label: "Investment Hub", href: "/dashboard/investments/overview", icon: IconInvest },
      { label: "Markets", href: "/dashboard/investments", icon: IconInvest },
      { label: "Live Terminal", href: "/dashboard/investments/terminal", icon: IconInvest },
      { label: "Market Scanner", href: "/dashboard/investments/scanner", icon: IconInvest },
      { label: "Opportunity Engine", href: "/dashboard/investments/opportunities", icon: IconInvest },
      { label: "Consensus", href: "/dashboard/investments/consensus", icon: IconInvest },
      { label: "Portfolio Intelligence", href: "/dashboard/investments/portfolio", icon: IconInvest },
      { label: "Strategy Center", href: "/dashboard/investments/strategy", icon: IconInvest },
      { label: "Broker Center", href: "/dashboard/investments/broker", icon: IconInvest },
    ],
  },
  {
    label: "Data",
    items: [
      { label: "Files", href: "/dashboard/files", icon: IconFiles },
      { label: "Images", href: "/dashboard/images", icon: IconImage },
      { label: "Videos", href: "/dashboard/videos", icon: IconVideo },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Providers", href: "/admin", icon: IconKey, adminOnly: true },
      { label: "Settings", href: "/dashboard/settings", icon: IconSettings },
    ],
  },
];

export default function Sidebar({
  variant = "desktop",
  onNavigate,
}: {
  variant?: "desktop" | "drawer";
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const router = useRouter();
  const { createConversation } = useDashboard();

  const [me, setMe] = useState<Me>(null);
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

  const newChat = () => {
    createConversation();
    if (path !== "/dashboard") router.push("/dashboard");
    onNavigate?.();
  };

  const isActive = (href: string) =>
    href === "/dashboard" || href === "/workspace" ? path === href : path.startsWith(href);

  return (
    <aside
      className={`h-full w-[256px] flex-none flex-col border-r border-line bg-surface/80 backdrop-blur-xl ${
        variant === "desktop" ? "hidden lg:flex" : "flex"
      }`}
    >
      <nav aria-label="Primary" className="flex flex-col gap-0.5 px-3 pb-2 pt-4">
        {/* Chat workspace entry */}
        <button
          type="button"
          onClick={newChat}
          className="group mb-3 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-brand to-violet px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition-all duration-200 hover:shadow-md hover:shadow-brand/30 hover:brightness-[1.04] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <IconPlus />
          New Chat
        </button>

        {SECTIONS.map((section) => {
          const visible = section.items.filter((it) => !it.adminOnly || me?.role === "admin");
          if (!visible.length) return null;
          return (
            <div key={section.label} className="mt-2 first:mt-0">
              <p className="px-3 pb-1 pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                {section.label}
              </p>
              {visible.map((it) => {
                const active = isActive(it.href);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                      active
                        ? "text-white"
                        : "text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={`sidebar-active-${variant}`}
                        className="absolute inset-0 rounded-xl bg-brand shadow-sm shadow-brand/30"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5 transition-transform group-hover:translate-x-0.5">
                      <Icon />
                      {it.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <ChatHistory
        active={path === "/dashboard"}
        onOpen={() => {
          if (path !== "/dashboard") router.push("/dashboard");
          onNavigate?.();
        }}
      />

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-gradient-to-br from-navy to-ice text-xs font-bold uppercase text-white">
            {me?.avatar ?? (me ? me.username.slice(0, 2) : "··")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {me?.displayName ?? me?.username ?? "…"}
            </p>
            <p className="truncate text-xs text-faint">
              {me?.title ?? me?.role ?? ""}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="grid h-8 w-8 flex-none place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

function groupByDate(convos: Conversation[]) {
  const sorted = [...convos].sort((a, b) => b.updatedAt - a.updatedAt);
  const n = new Date();
  const startToday = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  const startYesterday = startToday - 86_400_000;
  const buckets = [
    { label: "Today", items: [] as Conversation[] },
    { label: "Yesterday", items: [] as Conversation[] },
    { label: "Earlier", items: [] as Conversation[] },
  ];
  for (const c of sorted) {
    if (c.updatedAt >= startToday) buckets[0].items.push(c);
    else if (c.updatedAt >= startYesterday) buckets[1].items.push(c);
    else buckets[2].items.push(c);
  }
  return buckets.filter((b) => b.items.length);
}

function ChatHistory({
  active,
  onOpen,
}: {
  active: boolean;
  onOpen: (id: string) => void;
}) {
  const { conversations, activeId, selectConversation, deleteConversation } =
    useDashboard();

  if (conversations.length === 0) {
    return (
      <div className="flex-1 px-5 py-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
          No chats yet
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-1">
      {groupByDate(conversations).map((g) => (
        <div key={g.label} className="mb-2">
          <p className="px-2 pb-1 pt-1 font-mono text-[10px] uppercase tracking-wider text-faint">
            {g.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {g.items.map((c) => {
              const isActive = active && c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={`group/item relative flex items-center rounded-lg transition-colors ${
                    isActive ? "bg-brand/10" : "hover:bg-surface-2"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full bg-brand" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      selectConversation(c.id);
                      onOpen(c.id);
                    }}
                    title={c.title}
                    className={`min-w-0 flex-1 truncate px-2.5 py-1.5 text-left text-sm ${
                      isActive ? "font-medium text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteConversation(c.id)}
                    aria-label="Delete chat"
                    className="mr-1 grid h-6 w-6 flex-none place-items-center rounded text-faint opacity-0 transition-opacity hover:text-danger group-hover/item:opacity-100"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const sw = {
  strokeWidth: 1.8,
  stroke: "currentColor",
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconWorlds() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <path d="M12 3v18" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <path d="M3 11.5 12 4l9 7.5M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
function IconStudio() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <path d="M12 2 4 7v10l8 5 8-5V7z" />
      <path d="m4 7 8 5 8-5M12 22V12" />
    </svg>
  );
}
function IconRouter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 4v5M12 15v5M4 12h5M15 12h5" />
    </svg>
  );
}
function IconKey() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="m10 13 9-9M15 4l3 3M13 6l3 3" />
    </svg>
  );
}
function IconWorkspace() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 4v5" />
    </svg>
  );
}
function IconCode() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <path d="m8 9-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" />
    </svg>
  );
}
function IconResearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
    </svg>
  );
}
function IconAgents() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M12 8V4M9 14h.01M15 14h.01" />
    </svg>
  );
}
function IconFiles() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <path d="M14 3v5h5M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function IconVideo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m22 8-6 4 6 4z" />
    </svg>
  );
}
function IconFinance() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <path d="M3 3v18h18M7 14l3-3 3 3 5-6" />
    </svg>
  );
}
function IconInvest() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <path d="M3 17l5-5 4 4 8-8M21 8v5h-5" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.61.78 1.05 1.51 1.05H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
