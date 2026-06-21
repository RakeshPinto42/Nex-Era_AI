// Builds the grounding context the copilot sees for a given module.
// Pure string assembly so it can be reused server-side and token-counted.

import { MODULE_BY_SLUG, GROUPS } from "./modules";

export function moduleContext(slug: string | null): string {
  const m = slug ? MODULE_BY_SLUG[slug] : null;
  if (!m) {
    return [
      "VIEW: FP&A Tools home.",
      "The user is browsing the finance tools directory (Variance, Commission, Forecasting, Margin and more).",
    ].join("\n");
  }

  const group = GROUPS.find((g) => g.key === m.group)?.label ?? m.group;
  return [
    `VIEW: ${m.name} (${group}).`,
    m.blurb,
    m.tool
      ? `This is a LIVE tool that computes on the user's own CSV entirely in their browser. Their raw data is NOT sent to you — only their questions. If they ask about a specific figure you don't have, ask them to paste the number or the on-screen computed summary.`
      : "This module is coming soon (not yet built).",
  ].join("\n");
}

export const SYSTEM_INSTRUCTIONS = `You are NEXERA Ledger, the finance assistant embedded in the NEXERA Ledger workspace, used by FP&A Managers, Finance Directors, Controllers, CFOs, Commercial Finance Managers and Pricing Analysts.

Rules:
- Ground every answer in the data provided for the user's current view. Cite specific KPI values and table figures when relevant.
- Be precise and concise — these are senior finance professionals. Lead with the answer, then the driver, then a recommended action.
- Use finance conventions: pp for percentage points, $ in K/M, variance as favorable/unfavorable.
- When asked to model a scenario, state your assumptions and show the resulting delta.
- Never invent figures that contradict the provided data. If something isn't in the data, say so and state what input you'd need.
- Keep responses under ~150 words unless asked to elaborate. Use short markdown: **bold** for headers, bullets for lists.`;
