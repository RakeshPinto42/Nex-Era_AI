// FP&A module catalog. Each module maps to a real, browser-computed finance
// tool (or is marked "coming soon"). Drives the nav, the [module] route, and the
// copilot context.

export type GroupKey = "commercial" | "corporate" | "controllership";

// Real tools the modules render (see components/finance/*Tool.tsx).
export type ToolKey = "variance" | "commission" | "forecast" | "margin";

export type ModuleConfig = {
  slug: string;
  name: string;
  group: GroupKey;
  blurb: string;
  /** Which real tool this module runs. null = coming soon. */
  tool: ToolKey | null;
  prompts: string[];
};

export const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "commercial", label: "Commercial Finance" },
  { key: "corporate", label: "Corporate FP&A" },
  { key: "controllership", label: "Controllership" },
];

export const MODULES: ModuleConfig[] = [
  // ---------------- Commercial Finance ----------------
  {
    slug: "commission-management",
    name: "Commission Management",
    group: "commercial",
    blurb: "Tiered commission payouts per rep, with optional quota accelerators.",
    tool: "commission",
    prompts: [
      "Who are my top 3 reps by commission?",
      "What's the blended commission rate?",
      "How much does the accelerator add over quota?",
    ],
  },
  {
    slug: "margin-analysis",
    name: "Margin Analysis",
    group: "commercial",
    blurb: "Gross profit and margin % by product or segment.",
    tool: "margin",
    prompts: [
      "Which segment has the lowest margin?",
      "What's our blended gross margin?",
      "Where is most of the gross profit concentrated?",
    ],
  },
  {
    slug: "customer-profitability",
    name: "Customer Profitability",
    group: "commercial",
    blurb: "Revenue, cost and contribution margin by customer or account.",
    tool: "margin",
    prompts: [
      "Which customers are unprofitable?",
      "Rank accounts by contribution margin",
      "What share of profit comes from the top accounts?",
    ],
  },
  {
    slug: "revenue-forecasting",
    name: "Revenue Forecasting",
    group: "commercial",
    blurb: "Project bookings/revenue forward by trend or compound growth.",
    tool: "forecast",
    prompts: [
      "What's next quarter's projected revenue?",
      "What growth rate does the trend imply?",
      "Forecast the next 6 periods",
    ],
  },
  {
    slug: "pricing-models",
    name: "Pricing Models",
    group: "commercial",
    blurb: "Price realization, discount leakage and elasticity modeling.",
    tool: null,
    prompts: [],
  },
  {
    slug: "deal-desk",
    name: "Deal Desk",
    group: "commercial",
    blurb: "Approvals, margin guardrails and non-standard term review.",
    tool: null,
    prompts: [],
  },

  // ---------------- Corporate FP&A ----------------
  {
    slug: "variance-analysis",
    name: "Variance Analysis",
    group: "corporate",
    blurb: "Actual vs budget/plan by line item, favorable/unfavorable.",
    tool: "variance",
    prompts: [
      "What's the largest unfavorable variance?",
      "Are we over or under plan overall?",
      "Which lines beat budget?",
    ],
  },
  {
    slug: "budgeting",
    name: "Budgeting",
    group: "corporate",
    blurb: "Budget vs actual tracking across cost centers.",
    tool: "variance",
    prompts: [
      "Which cost centers are over budget?",
      "What's total budget variance?",
      "Show the biggest overspends",
    ],
  },
  {
    slug: "forecasting",
    name: "Forecasting",
    group: "corporate",
    blurb: "Driver-based and trend projections for any series.",
    tool: "forecast",
    prompts: [
      "Project the next 12 periods",
      "Compare linear trend vs compound growth",
      "What's the implied CAGR?",
    ],
  },
  {
    slug: "cash-flow-planning",
    name: "Cash Flow Planning",
    group: "corporate",
    blurb: "Direct/indirect cash flow and runway modeling.",
    tool: null,
    prompts: [],
  },
  {
    slug: "headcount-planning",
    name: "Headcount Planning",
    group: "corporate",
    blurb: "Workforce cost, ramp and fully-loaded cost modeling.",
    tool: null,
    prompts: [],
  },
  {
    slug: "executive-reporting",
    name: "Executive Reporting",
    group: "corporate",
    blurb: "Board-ready KPI packs and narrative summaries.",
    tool: null,
    prompts: [],
  },

  // ---------------- Controllership ----------------
  {
    slug: "revenue-recognition",
    name: "Revenue Recognition",
    group: "controllership",
    blurb: "ASC 606 schedules and deferred revenue roll-forward.",
    tool: null,
    prompts: [],
  },
  {
    slug: "accruals",
    name: "Accruals",
    group: "controllership",
    blurb: "Accrual schedules and reversal tracking.",
    tool: null,
    prompts: [],
  },
  {
    slug: "reclasses",
    name: "Reclasses",
    group: "controllership",
    blurb: "Reclassification entries and audit trail.",
    tool: null,
    prompts: [],
  },
  {
    slug: "journal-analysis",
    name: "Journal Analysis",
    group: "controllership",
    blurb: "Journal entry anomaly detection and review.",
    tool: null,
    prompts: [],
  },
  {
    slug: "month-end-close",
    name: "Month-End Close",
    group: "controllership",
    blurb: "Close checklist, task status and critical path.",
    tool: null,
    prompts: [],
  },
];

export const MODULE_BY_SLUG: Record<string, ModuleConfig> = Object.fromEntries(
  MODULES.map((m) => [m.slug, m]),
);

export function modulesByGroup(group: GroupKey): ModuleConfig[] {
  return MODULES.filter((m) => m.group === group);
}

export const TOOL_LABEL: Record<ToolKey, string> = {
  variance: "Variance Analysis",
  commission: "Commission Calculator",
  forecast: "Forecasting",
  margin: "Margin Analysis",
};
