/**
 * Commentary Agent — types (Phase 6).
 *
 * The executive narrative engine for Finance OS. CONSUMES FinanceInsights from
 * the Finance Agent and writes executive-quality narrative. It does NOT analyze
 * data, calculate KPIs, or re-read files. Finance Agent thinks; Commentary
 * Agent writes.
 */

export type AudienceProfile =
  | "Board of Directors"
  | "Chief Executive Officer"
  | "Chief Financial Officer"
  | "Finance Director"
  | "Business Partner"
  | "Operations Manager"
  | "Regional Manager";

export const AUDIENCE_PROFILES: AudienceProfile[] = [
  "Board of Directors",
  "Chief Executive Officer",
  "Chief Financial Officer",
  "Finance Director",
  "Business Partner",
  "Operations Manager",
  "Regional Manager",
];

export type CommentaryTone =
  | "Professional"
  | "Executive"
  | "Concise"
  | "Detailed"
  | "Analytical"
  | "Investor"
  | "Board Ready";

export const COMMENTARY_TONES: CommentaryTone[] = [
  "Professional",
  "Executive",
  "Concise",
  "Detailed",
  "Analytical",
  "Investor",
  "Board Ready",
];

export type OutputFormat =
  | "Monthly Business Review"
  | "Quarterly Business Review"
  | "Board Pack"
  | "Management Report"
  | "PowerPoint Speaker Notes"
  | "Executive Email"
  | "Microsoft Teams Summary"
  | "Slack Summary"
  | "PDF Export";

export const OUTPUT_FORMATS: OutputFormat[] = [
  "Monthly Business Review",
  "Quarterly Business Review",
  "Board Pack",
  "Management Report",
  "PowerPoint Speaker Notes",
  "Executive Email",
  "Microsoft Teams Summary",
  "Slack Summary",
  "PDF Export",
];

/** Canonical, independently-reusable commentary sections. */
export const SECTION_DEFS: { key: string; title: string }[] = [
  { key: "executive_summary", title: "Executive Summary" },
  { key: "revenue", title: "Revenue Commentary" },
  { key: "expense", title: "Expense Commentary" },
  { key: "gross_margin", title: "Gross Margin Commentary" },
  { key: "operating_margin", title: "Operating Margin Commentary" },
  { key: "ebitda", title: "EBITDA Commentary" },
  { key: "cash_flow", title: "Cash Flow Commentary" },
  { key: "working_capital", title: "Working Capital Commentary" },
  { key: "risks", title: "Business Risks" },
  { key: "opportunities", title: "Business Opportunities" },
  { key: "actions", title: "Recommended Actions" },
  { key: "takeaways", title: "Management Takeaways" },
  { key: "next_focus", title: "Next Month Focus Areas" },
];

export type CommentarySection = {
  key: string;
  title: string;
  body: string;
  /** Insight fields this paragraph traces back to (KPI / driver / trend names). */
  references: string[];
  /** True when the section lacked supporting insight data. */
  uncertain: boolean;
};

export type CommentaryRequest = {
  audience: AudienceProfile;
  tone: CommentaryTone;
  format: OutputFormat;
};

export type CommentaryOutput = {
  audience: AudienceProfile;
  tone: CommentaryTone;
  format: OutputFormat;
  sections: CommentarySection[];
  referencedKpis: string[];
  referencedDrivers: string[];
  suggestedExportFormats: OutputFormat[];
  suggestedNextWorkflow: string;
  confidence: number;
  mode: "ai" | "fallback";
  /** Set when overall confidence is low or insights were thin. */
  uncertaintyNote?: string;
};
