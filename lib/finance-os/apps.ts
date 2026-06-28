// Finance OS — the FROZEN set of five flagship applications + the Executive
// Dashboard. This registry replaces the legacy Ledger module list in the nav.
// Legacy modules in `modules.ts` are kept (archived) for Phase-2 reuse but are
// NO LONGER shown in navigation. See FINANCE_OS_ROADMAP.md.

import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  Tags,
  GitCompareArrows,
  PenLine,
  type LucideIcon,
} from "lucide-react";

export type FinanceApp = {
  slug: string;            // route segment under /ledger ("" = Executive Dashboard)
  name: string;            // display name
  short: string;           // sidebar / breadcrumb short label
  desc: string;            // one-line description
  href: string;            // full route
  icon: LucideIcon;
  accent: string;          // identity color (orange primary; blue/violet for analytics/technical)
  phase: 2;                // implemented in Phase 2 (Phase 1 = placeholder landing)
};

export const FINANCE_APPS: FinanceApp[] = [
  { slug: "", name: "Executive Dashboard", short: "Dashboard", desc: "Recent projects, reports, AI alerts, finance KPIs and shortcuts into the five studios.", href: "/ledger", icon: LayoutDashboard, accent: "#f2761c", phase: 2 },
  { slug: "commission", name: "Commission Studio", short: "Commission", desc: "Design plans, run calculations, manage quotas & disputes, publish payee statements.", href: "/ledger/commission", icon: Wallet, accent: "#f2761c", phase: 2 },
  { slug: "analytics", name: "Analytics Studio", short: "Analytics", desc: "AI-powered Excel + Power BI workspace — profile, KPI, dashboard, DAX, learn, export.", href: "/ledger/analytics", icon: BarChart3, accent: "#3b82f6", phase: 2 },
  { slug: "pricing", name: "Pricing Studio", short: "Pricing", desc: "Price waterfall, margin analysis, scenarios, AI guidance and approval workflow.", href: "/ledger/pricing", icon: Tags, accent: "#fb8c6a", phase: 2 },
  { slug: "variance", name: "Variance Studio", short: "Variance", desc: "Budget vs forecast vs actuals — auto-variance, drivers, waterfalls and commentary.", href: "/ledger/variance", icon: GitCompareArrows, accent: "#8b5cf6", phase: 2 },
  { slug: "commentary", name: "Commentary AI", short: "Commentary", desc: "Finance-grade narrative — monthly, quarterly, board and variance commentary.", href: "/ledger/commentary", icon: PenLine, accent: "#16a34a", phase: 2 },
];

export function appForPath(pathname: string): FinanceApp {
  // Longest-prefix match so /ledger/commission/... resolves to Commission.
  const match = [...FINANCE_APPS]
    .filter((a) => a.href === "/ledger" ? pathname === "/ledger" : pathname.startsWith(a.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match ?? FINANCE_APPS[0];
}
