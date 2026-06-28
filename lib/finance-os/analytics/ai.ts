// Analytics Studio — AI seam. SECONDARY by design: the profile, KPIs, DAX and
// dashboard are produced deterministically; the model only enriches narrative
// (KPI rationale, deeper DAX explanation, Power BI teaching, dashboard review).
// Routes through the shared NEXERA Router (/api/run) and degrades gracefully —
// if no provider is configured it simply returns "" and the UI keeps working.

import type { Kpi, Profile } from "./types";

export async function runModel(system: string, user: string): Promise<string> {
  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) return "";
    if (res.headers.get("X-Run-Mode") === "limit") return "";
    const text = (await res.text()).trim();
    // The stub/fallback can echo a placeholder; treat the limit warning as empty.
    if (!text || text.startsWith("⚠")) return "";
    return text;
  } catch {
    return "";
  }
}

const SYSTEM =
  "You are the Power BI & Excel analytics tutor inside NEXERA Finance OS. Be precise, concise and practical. Never invent numbers — reason only about the schema you are given.";

function schemaBlock(profile: Profile): string {
  const cols = profile.tables
    .flatMap((t) => t.columns.map((c) => `${t.name}.${c.name} [${c.type}/${c.role}]`))
    .slice(0, 60)
    .join(", ");
  return `Workbook schema: ${cols}. Dominant currency: ${profile.currency ?? "unknown"}.`;
}

export function kpiRefinePrompt(profile: Profile, kind: string, kpis: Kpi[]): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: `${schemaBlock(profile)}\nThe user is building a ${kind} dashboard. Current KPIs: ${kpis.map((k) => k.label).join(", ")}.\nIn 3-5 short bullets, recommend the most decision-useful KPIs for this dashboard and say briefly why each matters. Do not output DAX.`,
  };
}

export function daxExplainPrompt(profile: Profile, kpi: Kpi): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: `${schemaBlock(profile)}\nExplain this Power BI measure to an analyst in 2-3 sentences — what it computes, the DAX function choice, and one gotcha:\n${kpi.dax}`,
  };
}

export function teachPrompt(profile: Profile, kind: string): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: `${schemaBlock(profile)}\nTeach me, in 4-5 short steps, how to build this ${kind} dashboard in Power BI from this workbook — model relationships, key measures, and the visuals to use. Keep it actionable.`,
  };
}

export function reviewPrompt(description: string): { system: string; user: string } {
  return {
    system: SYSTEM,
    user: `Review this existing dashboard and give a short, structured critique (Strengths / Issues / Fixes) covering chart choice, KPI clarity, layout, performance and accessibility:\n\n${description}`,
  };
}
