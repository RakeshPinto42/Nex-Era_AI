/**
 * Multi-Agent Consensus — types (Investment Hub Phase 7).
 *
 * When an opportunity clears a confidence threshold, Hermes orchestrates PRIVATE
 * specialists (never user-facing). Each returns score / confidence / evidence /
 * concerns. Hermes synthesizes a conviction view that explains agreement AND
 * disagreement — never a blind average. No advice.
 */

export type SpecialistId =
  | "fundamental"
  | "technical"
  | "valuation"
  | "news"
  | "macro"
  | "risk"
  | "portfolio";

export type SpecialistVerdict = {
  id: SpecialistId;
  name: string;
  score: number; // 0..100 (higher = more constructive)
  confidence: number; // 0..1
  evidence: string[];
  concerns: string[];
};

export type Disagreement = {
  between: [string, string];
  spread: number;
  explanation: string;
};

export type ConsensusResult = {
  ticker: string;
  company: string;
  gated: boolean; // true = below threshold, specialists not run
  baseConfidence: number;
  threshold: number;
  overallConviction: number; // 0..100, confidence-weighted (not blind avg)
  overallConfidence: number; // 0..1
  dispersion: number; // stdev of specialist scores
  verdicts: SpecialistVerdict[];
  agreement: string[];
  disagreements: Disagreement[];
  keyRisks: string[];
  supportingEvidence: string[];
  researchSummary: string;
  summaryMode: "ai" | "deterministic";
  fromMock: boolean;
};
