// Multi-Agent Consensus — Hermes-orchestrated synthesis (Phase 7).
//
// Gated by a confidence threshold. Runs the private specialists, then
// synthesizes conviction WITHOUT blindly averaging: confidence-weighted score,
// dispersion-aware confidence, explicit agreement + disagreement (with reasons),
// aggregated risks/evidence, and a research summary (AI Router, best-effort).

import "server-only";
import { marketIntelligenceTool } from "@/lib/investments/market-intelligence";
import { completeWithFallback, type ChatMsg } from "@/lib/llm/infer";
import { runSpecialists, SPECIALIST_WEIGHT } from "./specialists";
import type { ConsensusResult, Disagreement, SpecialistVerdict } from "./types";

function baseConfidenceOf(completeness: number, isMock: boolean): number {
  return Math.max(0, Math.min(0.95, 0.45 + completeness * 0.45 - (isMock ? 0.15 : 0)));
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

function clusters(verdicts: SpecialistVerdict[]): string[] {
  const bull = verdicts.filter((v) => v.score >= 60).map((v) => v.name.replace(" Specialist", ""));
  const bear = verdicts.filter((v) => v.score <= 40).map((v) => v.name.replace(" Specialist", ""));
  const neutral = verdicts.filter((v) => v.score > 40 && v.score < 60).map((v) => v.name.replace(" Specialist", ""));
  const out: string[] = [];
  if (bull.length) out.push(`Constructive: ${bull.join(", ")}`);
  if (bear.length) out.push(`Cautious: ${bear.join(", ")}`);
  if (neutral.length) out.push(`Neutral: ${neutral.join(", ")}`);
  return out;
}

function disagreementsOf(verdicts: SpecialistVerdict[]): Disagreement[] {
  const sorted = [...verdicts].sort((a, b) => b.score - a.score);
  const out: Disagreement[] = [];
  const pairs: [SpecialistVerdict, SpecialistVerdict][] = [[sorted[0], sorted[sorted.length - 1]]];
  if (sorted.length >= 4) pairs.push([sorted[1], sorted[sorted.length - 2]]);
  for (const [hi, lo] of pairs) {
    const spread = +(hi.score - lo.score).toFixed(0);
    if (spread < 25) continue;
    const hiName = hi.name.replace(" Specialist", "");
    const loName = lo.name.replace(" Specialist", "");
    const hiWhy = hi.evidence[0] ?? "supportive signals";
    const loWhy = lo.concerns[0] ?? lo.evidence[0] ?? "cautionary signals";
    out.push({
      between: [hiName, loName],
      spread,
      explanation: `${hiName} is constructive (${Math.round(hi.score)}) on ${hiWhy.toLowerCase()}, while ${loName} is cautious (${Math.round(lo.score)}) on ${loWhy.toLowerCase()}.`,
    });
  }
  return out;
}

function aggregateConcerns(verdicts: SpecialistVerdict[]): string[] {
  const seen = new Map<string, number>();
  for (const v of verdicts) for (const c of v.concerns) seen.set(c, (seen.get(c) ?? 0) + 1);
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 5);
}

async function aiSummary(ticker: string, structured: string): Promise<{ text: string; mode: "ai" | "deterministic" }> {
  const system =
    "You are Hermes synthesizing private investment specialists into a brief research summary. Use ONLY the provided specialist outputs. No advice, no price targets. 3-4 sentences. Explain where they agree and disagree.";
  const messages: ChatMsg[] = [{ role: "user", content: `Ticker ${ticker}\n${structured}` }];
  try {
    const r = await completeWithFallback(system, messages, undefined, { maxTokens: 500 });
    if (r) return { text: r.text.trim(), mode: "ai" };
  } catch {
    /* fall through */
  }
  return { text: "", mode: "deterministic" };
}

export async function runConsensus(rawTicker: string, threshold = 0.6, holdings: string[] = []): Promise<ConsensusResult> {
  const d = await marketIntelligenceTool.getNormalized(rawTicker);

  const completeness =
    [d.financials.netMarginPct, d.financials.debtToEquity, d.financials.revenueGrowthPct, d.valuation.peRatio, d.technicals.sma200].filter((v) => v !== 0).length / 5;
  const baseConfidence = +baseConfidenceOf(completeness, d.isMock).toFixed(2);

  const shell = {
    ticker: d.ticker,
    company: d.company,
    baseConfidence,
    threshold,
    fromMock: d.isMock,
  };

  // Gate: specialists only run above the configurable threshold.
  if (baseConfidence < threshold) {
    return {
      ...shell,
      gated: true,
      overallConviction: 0,
      overallConfidence: baseConfidence,
      dispersion: 0,
      verdicts: [],
      agreement: [],
      disagreements: [],
      keyRisks: [],
      supportingEvidence: [],
      researchSummary: `Below the ${Math.round(threshold * 100)}% confidence threshold (data confidence ${Math.round(baseConfidence * 100)}%). Specialist consensus not triggered.`,
      summaryMode: "deterministic",
    };
  }

  const verdicts = runSpecialists(d, holdings);

  // Confidence-weighted conviction — NOT a blind average.
  let num = 0;
  let den = 0;
  for (const v of verdicts) {
    const w = SPECIALIST_WEIGHT[v.id] * v.confidence;
    num += v.score * w;
    den += w;
  }
  const overallConviction = +(den ? num / den : 0).toFixed(1);
  const dispersion = +stdev(verdicts.map((v) => v.score)).toFixed(1);
  const meanConf = verdicts.reduce((a, b) => a + b.confidence, 0) / verdicts.length;
  const overallConfidence = +Math.max(0, meanConf * (1 - Math.min(0.5, dispersion / 100))).toFixed(2);

  const agreement = clusters(verdicts);
  const disagreements = disagreementsOf(verdicts);
  const keyRisks = aggregateConcerns(verdicts);
  const supportingEvidence = verdicts
    .filter((v) => v.score >= 55)
    .flatMap((v) => v.evidence.slice(0, 2))
    .slice(0, 6);

  const structured = verdicts
    .map((v) => `${v.name}: score ${Math.round(v.score)}, confidence ${Math.round(v.confidence * 100)}%, evidence [${v.evidence.join("; ")}], concerns [${v.concerns.join("; ")}]`)
    .join("\n");
  const ai = await aiSummary(d.ticker, structured);
  const researchSummary =
    ai.text ||
    `Confidence-weighted conviction ${overallConviction}/100 across ${verdicts.length} specialists (dispersion ${dispersion}). ${agreement.join("; ")}. ${disagreements[0]?.explanation ?? "Specialists are broadly aligned."}`;

  return {
    ...shell,
    gated: false,
    overallConviction,
    overallConfidence,
    dispersion,
    verdicts,
    agreement,
    disagreements,
    keyRisks,
    supportingEvidence,
    researchSummary,
    summaryMode: ai.mode,
  };
}
