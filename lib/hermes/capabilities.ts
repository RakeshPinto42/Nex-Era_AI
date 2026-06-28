/**
 * Hermes — AI capability vocabulary (Phase 2).
 *
 * Hermes NEVER chooses models. It only declares which capability a step needs;
 * the existing AI Router decides which configured model satisfies it. This file
 * defines the capability vocabulary + the request shape. No Router changes, no
 * model selection, no API calls.
 */

export type AICapability =
  | "financial_reasoning"
  | "coding"
  | "research"
  | "translation"
  | "vision"
  | "planning"
  | "structured_output"
  | "tool_use"
  | "long_context";

export const AI_CAPABILITIES: AICapability[] = [
  "financial_reasoning",
  "coding",
  "research",
  "translation",
  "vision",
  "planning",
  "structured_output",
  "tool_use",
  "long_context",
];

export const AI_CAPABILITY_META: Record<AICapability, { label: string; desc: string }> = {
  financial_reasoning: { label: "Financial reasoning", desc: "Quantitative finance + accounting reasoning." },
  coding: { label: "Coding", desc: "Write, refactor and reason about code." },
  research: { label: "Research", desc: "Search, read and synthesize sources." },
  translation: { label: "Translation", desc: "Translate + language tutoring." },
  vision: { label: "Vision", desc: "Understand images and visual input." },
  planning: { label: "Planning", desc: "Decompose goals into ordered steps." },
  structured_output: { label: "Structured output", desc: "Emit schema-constrained results." },
  tool_use: { label: "Tool use", desc: "Invoke tools to act in the world." },
  long_context: { label: "Long context", desc: "Reason over large inputs." },
};

/**
 * A capability request Hermes hands to the AI Router. The Router maps it to a
 * configured model — Hermes never names a model. Declaration only in Phase 2.
 */
export type CapabilityRequest = {
  capability: AICapability;
  reason: string;
};
