// Commentary Agent — narrative generation (Phase 6).
//
// Consumes FinanceInsights (never re-analyzes files) and writes executive
// commentary via the AI Router. No calculations, no KPI invention. Every
// section traces back to the supplied insights; when data is missing the
// section is marked uncertain. Deterministic fallback when no model configured.

import "server-only";
import { completeWithFallback, type ChatMsg } from "@/lib/llm/infer";
import type { FinanceInsights } from "@/lib/agents/finance-agent/types";
import {
  SECTION_DEFS,
  OUTPUT_FORMATS,
  type CommentaryOutput,
  type CommentarySection,
  type CommentaryRequest,
} from "./types";

function systemPrompt(req: CommentaryRequest): string {
  return `You are the Commentary Agent — the executive narrative engine for Finance OS.
You receive FinanceInsights (already computed by the Finance Agent) and WRITE commentary. You do NOT analyze data, compute KPIs, or invent numbers.

Audience: ${req.audience}. Tone: ${req.tone}. Output format: ${req.format}.
Calibrate depth + language to that audience and tone.

STRICT RULES:
- Use ONLY facts present in the provided insights. Never invent figures, KPIs, or conclusions.
- Every section must reference the insight items it draws on (KPI names, variance drivers, trends).
- If a section has no supporting data in the insights, set "uncertain": true and say the data was not available.

Return ONLY a JSON object (no prose, no code fences):
{ "sections": [ { "key": string, "title": string, "body": string, "references": string[], "uncertain": boolean } ] }
Produce one entry for each of these section keys: ${SECTION_DEFS.map((s) => s.key).join(", ")}.`;
}

function insightsToText(i: FinanceInsights): string {
  return [
    `Financial summary: ${i.financialSummary}`,
    `Detected metrics: ${i.detectedMetrics.join(", ") || "none"}`,
    `Trends: ${i.trends.join("; ") || "none"}`,
    `Anomalies: ${i.anomalies.join("; ") || "none"}`,
    `Variance drivers: ${i.varianceDrivers.map((d) => `${d.driver} (${d.direction}: ${d.impact})`).join("; ") || "none"}`,
    `KPI recommendations: ${i.kpiRecommendations.map((k) => `${k.name} — ${k.rationale}`).join("; ") || "none"}`,
    `Suggested dashboard: ${i.suggestedDashboard || "none"}`,
    `Insights confidence: ${Math.round(i.confidence * 100)}% (${i.mode})`,
  ].join("\n");
}

function stripJson(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  return a !== -1 && b !== -1 ? s.slice(a, b + 1) : s;
}

// ---- deterministic fallback ----

function fallbackSections(i: FinanceInsights): CommentarySection[] {
  const driverNames = i.varianceDrivers.map((d) => d.driver);
  const kpiNames = i.kpiRecommendations.map((k) => k.name);
  const mk = (key: string, title: string, body: string, references: string[], uncertain = false): CommentarySection => ({
    key, title, body, references, uncertain,
  });

  return SECTION_DEFS.map(({ key, title }) => {
    switch (key) {
      case "executive_summary":
        return mk(key, title, i.financialSummary, [i.mode === "ai" ? "financialSummary" : "financialSummary (structural)"]);
      case "revenue":
      case "expense":
      case "gross_margin":
      case "operating_margin":
        return i.trends.length || driverNames.length
          ? mk(key, title, `Drawing on reported trends and variance drivers: ${[...i.trends, ...i.varianceDrivers.map((d) => `${d.driver} ${d.direction}`)].slice(0, 3).join("; ")}.`, [...driverNames].slice(0, 3))
          : mk(key, title, "Supporting data was not available in the provided insights.", [], true);
      case "ebitda":
      case "cash_flow":
      case "working_capital":
        return mk(key, title, "Not available in the provided insights.", [], true);
      case "risks":
        return i.anomalies.length
          ? mk(key, title, `Watch items flagged as anomalies: ${i.anomalies.join("; ")}.`, ["anomalies"])
          : mk(key, title, "No anomalies were flagged in the provided insights.", [], true);
      case "opportunities":
        return driverNames.length
          ? mk(key, title, `Positive drivers worth pressing: ${i.varianceDrivers.filter((d) => d.direction === "up").map((d) => d.driver).join(", ") || "see variance drivers"}.`, driverNames)
          : mk(key, title, "No clear opportunities identified from the provided insights.", [], true);
      case "actions":
        return kpiNames.length
          ? mk(key, title, `Recommended focus: track ${kpiNames.join(", ")}.`, kpiNames)
          : mk(key, title, "No specific actions could be derived from the provided insights.", [], true);
      case "takeaways":
        return mk(key, title, i.financialSummary, ["financialSummary"]);
      case "next_focus":
        return mk(key, title, i.suggestedDashboard ? `Stand up: ${i.suggestedDashboard}` : "Establish a recurring KPI dashboard.", i.suggestedDashboard ? ["suggestedDashboard"] : [], !i.suggestedDashboard);
      default:
        return mk(key, title, "Not available.", [], true);
    }
  });
}

function suggestedFormatsFor(req: CommentaryRequest): CommentaryOutput["suggestedExportFormats"] {
  const set = new Set<string>([req.format, "PDF Export"]);
  if (req.audience === "Board of Directors") set.add("Board Pack");
  if (req.audience === "Chief Executive Officer") set.add("Executive Email");
  return OUTPUT_FORMATS.filter((f) => set.has(f));
}

/** Generate commentary from Finance Agent insights. Never re-analyzes files. */
export async function generateCommentary(
  insights: FinanceInsights,
  req: CommentaryRequest,
): Promise<CommentaryOutput> {
  const referencedKpis = insights.kpiRecommendations.map((k) => k.name).concat(insights.detectedMetrics);
  const referencedDrivers = insights.varianceDrivers.map((d) => d.driver);
  const base = {
    audience: req.audience,
    tone: req.tone,
    format: req.format,
    referencedKpis: [...new Set(referencedKpis)],
    referencedDrivers,
    suggestedExportFormats: suggestedFormatsFor(req),
    suggestedNextWorkflow: `Hand off to the Export Tool to render the ${req.format}.`,
  };

  const messages: ChatMsg[] = [{ role: "user", content: insightsToText(insights) }];
  let routed: { text: string } | null = null;
  try {
    routed = await completeWithFallback(systemPrompt(req), messages, undefined, { maxTokens: 1800 });
  } catch {
    routed = null;
  }

  if (routed) {
    try {
      const parsed = JSON.parse(stripJson(routed.text)) as { sections?: unknown };
      if (Array.isArray(parsed.sections) && parsed.sections.length) {
        const sections: CommentarySection[] = (parsed.sections as Record<string, unknown>[]).map((s) => ({
          key: String(s.key ?? ""),
          title: String(s.title ?? ""),
          body: String(s.body ?? ""),
          references: Array.isArray(s.references) ? s.references.map(String) : [],
          uncertain: Boolean(s.uncertain),
        }));
        const conf = Math.min(0.9, insights.confidence + 0.05);
        return {
          ...base,
          sections,
          confidence: conf,
          mode: "ai",
          uncertaintyNote: insights.confidence < 0.4 ? "Underlying insights had low confidence — treat figures as indicative." : undefined,
        };
      }
    } catch {
      /* fall through to deterministic */
    }
  }

  return {
    ...base,
    sections: fallbackSections(insights),
    confidence: Math.min(0.6, insights.confidence),
    mode: "fallback",
    uncertaintyNote: "Generated without a configured model — narrative restates the provided insights only.",
  };
}
