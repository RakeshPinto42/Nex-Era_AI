// Finance Agent — FP&A reasoning (Phase 5).
//
// Reuses the shared extraction pipeline (extractFile) and the AI Router
// (completeWithFallback) to turn structured financial data into structured
// insights. No forecasting/budgeting engine, no ledger, no accounting logic,
// no calculations beyond high-level analysis. Falls back to a deterministic
// structural summary when no model is configured.

import "server-only";
import { extractFile } from "@/lib/llm/extract";
import { completeWithFallback, type ChatMsg } from "@/lib/llm/infer";
import type { FinanceInsights, VarianceDriver, KpiRecommendation } from "./types";

const SYSTEM = `You are the Finance Agent — the FP&A intelligence layer for an analytics platform.
You reason over structured financial data (statements, Excel, CSV) and prepare HIGH-LEVEL insights for other agents.
You DO NOT compute forecasts, budgets, journal entries, or precise figures. You summarize, spot trends/anomalies, explain likely variance drivers, and recommend KPIs and next steps.

Return ONLY a JSON object (no prose, no code fences) with exactly these keys:
{
  "financialSummary": string,
  "detectedMetrics": string[],
  "trends": string[],
  "anomalies": string[],
  "varianceDrivers": [{ "driver": string, "impact": string, "direction": "up"|"down"|"flat" }],
  "kpiRecommendations": [{ "name": string, "rationale": string }],
  "suggestedCommentary": string,
  "suggestedDashboard": string
}
Keep arrays concise (max 6 items each). Be specific to the data provided.`;

function stripJson(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  return first !== -1 && last !== -1 ? s.slice(first, last + 1) : s;
}

// ---- deterministic fallback (no model configured) ----

function fallbackInsights(text: string, sources: string[]): FinanceInsights {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const header = lines.find((l) => (l.match(/[,\t]/g)?.length ?? 0) >= 1) ?? "";
  const cols = header.split(/[,\t]/).map((c) => c.trim()).filter(Boolean);
  const numericCols = cols.filter((c) => /rev|cost|margin|profit|amount|price|units|qty|budget|actual|total|\$|%/i.test(c));
  const rows = Math.max(0, lines.length - 1);

  return {
    financialSummary: `${sources.join(", ") || "Dataset"}: ${rows} row(s) across ${cols.length} column(s)${cols.length ? ` (${cols.slice(0, 8).join(", ")})` : ""}. Structural summary only — no model configured for deeper reasoning.`,
    detectedMetrics: numericCols.length ? numericCols : cols.slice(0, 6),
    trends: [],
    anomalies: [],
    varianceDrivers: [],
    kpiRecommendations: numericCols.slice(0, 3).map((c) => ({ name: c, rationale: "Detected as a candidate metric column." })),
    suggestedCommentary: "Attach a model provider to generate narrative commentary.",
    suggestedDashboard: numericCols.length ? `KPI cards for ${numericCols.slice(0, 4).join(", ")}.` : "Tabular overview.",
    suggestedNextAgents: ["commentary", "analytics"],
    confidence: 0.3,
    mode: "fallback",
    sources,
  };
}

function coerce(parsed: Record<string, unknown>, sources: string[]): FinanceInsights {
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).slice(0, 6) : []);
  const drivers: VarianceDriver[] = Array.isArray(parsed.varianceDrivers)
    ? (parsed.varianceDrivers as Record<string, unknown>[]).slice(0, 6).map((d) => ({
        driver: String(d.driver ?? ""),
        impact: String(d.impact ?? ""),
        direction: (["up", "down", "flat"].includes(String(d.direction)) ? d.direction : "flat") as VarianceDriver["direction"],
      }))
    : [];
  const kpis: KpiRecommendation[] = Array.isArray(parsed.kpiRecommendations)
    ? (parsed.kpiRecommendations as Record<string, unknown>[]).slice(0, 6).map((k) => ({
        name: String(k.name ?? ""),
        rationale: String(k.rationale ?? ""),
      }))
    : [];

  return {
    financialSummary: String(parsed.financialSummary ?? "No summary produced."),
    detectedMetrics: arr(parsed.detectedMetrics),
    trends: arr(parsed.trends),
    anomalies: arr(parsed.anomalies),
    varianceDrivers: drivers,
    kpiRecommendations: kpis,
    suggestedCommentary: String(parsed.suggestedCommentary ?? ""),
    suggestedDashboard: String(parsed.suggestedDashboard ?? ""),
    suggestedNextAgents: ["commentary", "analytics"],
    confidence: 0.8,
    mode: "ai",
    sources,
  };
}

/** Extract financial text from files and reason over it → structured insights. */
export async function analyzeFinance(files: File[]): Promise<FinanceInsights> {
  const extracted = await Promise.all(
    files.map(async (f) => {
      try {
        const { text } = await extractFile(f);
        return { name: f.name, text };
      } catch {
        return { name: f.name, text: "" };
      }
    }),
  );

  const sources = extracted.map((e) => e.name);
  const combined = extracted
    .map((e) => `# File: ${e.name}\n${e.text}`)
    .join("\n\n")
    .slice(0, 18_000);

  if (!combined.trim()) return fallbackInsights("", sources);

  const messages: ChatMsg[] = [{ role: "user", content: combined }];
  let routed: { text: string } | null = null;
  try {
    routed = await completeWithFallback(SYSTEM, messages, undefined, { maxTokens: 1400 });
  } catch {
    routed = null;
  }

  if (!routed) return fallbackInsights(combined, sources);

  try {
    const parsed = JSON.parse(stripJson(routed.text)) as Record<string, unknown>;
    return coerce(parsed, sources);
  } catch {
    return fallbackInsights(combined, sources);
  }
}
