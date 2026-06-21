// The NEXERA Ledger modules, grouped into sidebar sections. Commercial Intelligence
// is the flagship (it replaced the standalone Pricing Engine and now hosts Deal Desk
// as a sub-module). All modules are built.

export type ModuleGroup =
  | "Revenue & Incentives"
  | "Commercial Intelligence"
  | "Planning & Performance"
  | "Profitability"
  | "Controls & Reporting";

export const MODULE_GROUPS: ModuleGroup[] = [
  "Revenue & Incentives",
  "Commercial Intelligence",
  "Planning & Performance",
  "Profitability",
  "Controls & Reporting",
];

export type ModuleDef = {
  slug: string;
  name: string;
  short: string;
  desc: string;
  href: string | null; // null = not built yet
  group: ModuleGroup;
};

export const MODULES: ModuleDef[] = [
  { slug: "commission", name: "Commission Hub", short: "Commission", desc: "Dynamic plans, calculations, statements, audit.", href: "/ledger/commission", group: "Revenue & Incentives" },

  { slug: "commercial-intelligence", name: "Commercial Intelligence", short: "Commercial Intel", desc: "Compare products, optimize pricing, maximize margins and improve commercial performance.", href: "/ledger/commercial-intelligence", group: "Commercial Intelligence" },

  { slug: "forecast", name: "Forecast Studio", short: "Forecast", desc: "Revenue & margin forecast vs budget.", href: "/ledger/forecast", group: "Planning & Performance" },
  { slug: "revenue-bridge", name: "Revenue Bridge Builder", short: "Rev Bridge", desc: "Volume/price/mix/FX bridges + commentary.", href: "/ledger/revenue-bridge", group: "Planning & Performance" },
  { slug: "variance", name: "Variance Explorer", short: "Variance", desc: "Budget vs forecast vs actual, drill-down.", href: "/ledger/variance", group: "Planning & Performance" },

  { slug: "margin", name: "Margin Analysis", short: "Margin", desc: "Gross profit & margin % by product/segment.", href: "/ledger/margin", group: "Profitability" },
  { slug: "profitability", name: "Customer Profitability", short: "Profitability", desc: "Rank customers by true profit.", href: "/ledger/profitability", group: "Profitability" },

  { slug: "rev-rec", name: "Revenue Recognition Validator", short: "Rev Rec", desc: "Control checks + risk score.", href: "/ledger/rev-rec", group: "Controls & Reporting" },
  { slug: "statements", name: "Sales Statement Factory", short: "Statements", desc: "Mass-generate employee statements.", href: "/ledger/statements", group: "Controls & Reporting" },
  { slug: "exec-pack", name: "Executive Pack Generator", short: "Exec Pack", desc: "One-click management reporting.", href: "/ledger/exec-pack", group: "Controls & Reporting" },
];
