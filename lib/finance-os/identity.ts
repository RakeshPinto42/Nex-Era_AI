// Per-module visual identity. Each module owns an accent color + icon + kicker so
// the user knows which module they entered at a glance (color + icon + layout),
// without reading the title. Colors are applied via inline styles (hex), so they
// are safe from Tailwind purge.

import {
  Calculator,
  ClipboardCheck,
  Coins,
  FileText,
  Layers,
  Presentation,
  Radar,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

export type Identity = {
  accent: string; // primary hex
  accentDark: string; // gradient end
  icon: LucideIcon;
  kicker: string; // short descriptor shown in the hero
};

export const IDENTITY: Record<string, Identity> = {
  commission: { accent: "#4f46e5", accentDark: "#3730a3", icon: Coins, kicker: "Plan management · runs · statements" },
  "commercial-intelligence": { accent: "#1e40af", accentDark: "#172554", icon: Radar, kicker: "Commercial strategy command center" },
  pricing: { accent: "#0d9488", accentDark: "#0f766e", icon: Calculator, kicker: "Calculator & scenario workspace" },
  "deal-desk": { accent: "#d97706", accentDark: "#b45309", icon: ClipboardCheck, kicker: "Approval queue & workflow" },
  forecast: { accent: "#7c3aed", accentDark: "#6d28d9", icon: TrendingUp, kicker: "Planning & versioning" },
  margin: { accent: "#e11d48", accentDark: "#be123c", icon: Layers, kicker: "P&L analysis workspace" },
  profitability: { accent: "#059669", accentDark: "#047857", icon: Users, kicker: "Customer profit ranking" },
  "revenue-bridge": { accent: "#0891b2", accentDark: "#0e7490", icon: Waypoints, kicker: "Driver decomposition" },
  variance: { accent: "#ea580c", accentDark: "#c2410c", icon: Scale, kicker: "Budget vs actual" },
  "rev-rec": { accent: "#0284c7", accentDark: "#0369a1", icon: ShieldCheck, kicker: "Revenue controls" },
  statements: { accent: "#c026d3", accentDark: "#a21caf", icon: FileText, kicker: "Batch statement factory" },
  "exec-pack": { accent: "#1d4ed8", accentDark: "#1e40af", icon: Presentation, kicker: "Management reporting" },
};

/** accent hex + 2-digit alpha → #RRGGBBAA (modern browsers). */
export const tint = (slug: string, alpha = "14") => `${IDENTITY[slug]?.accent ?? "#3b82f6"}${alpha}`;
export const accentOf = (slug: string) => IDENTITY[slug]?.accent ?? "#3b82f6";
