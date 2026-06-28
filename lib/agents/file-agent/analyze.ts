// File Agent — read-only structural analysis (Phase 3).
//
// Reuses the existing extraction pipeline (lib/llm/extract). Derives metadata
// only: type, size, sheets, language, tables/headers, classification, structure,
// confidence. NO editing, NO business reasoning, NO AI commentary.

import "server-only";
import { extractFile } from "@/lib/llm/extract";
import type {
  FileUnderstanding,
  FileAgentContext,
  FileRelationship,
  DocumentCategory,
} from "./types";

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

const BINARY_KINDS = new Set(["pdf", "docx", "spreadsheet", "image"]);

// Classification signals — keyword → category. First strong hit wins; pattern
// matching only (no reasoning about the numbers).
const CATEGORY_SIGNALS: { category: DocumentCategory; terms: string[] }[] = [
  { category: "Invoice", terms: ["invoice", "bill to", "invoice no", "amount due"] },
  { category: "Commission Report", terms: ["commission", "payout", "quota attainment"] },
  { category: "Financial Statement", terms: ["balance sheet", "income statement", "cash flow", "statement of operations", "gross profit"] },
  { category: "Budget", terms: ["budget", "budgeted", "opex", "capex"] },
  { category: "Forecast", terms: ["forecast", "projection", "projected", "run rate"] },
  { category: "Pricing Sheet", terms: ["price list", "pricing", "unit price", "rate card", "list price"] },
  { category: "Research Paper", terms: ["abstract", "references", "et al", "doi", "we propose"] },
  { category: "Meeting Notes", terms: ["agenda", "attendees", "minutes", "action items", "meeting notes"] },
  { category: "Contract", terms: ["agreement", "terms and conditions", "hereby", "the parties", "governing law"] },
  { category: "Resume", terms: ["curriculum vitae", "work experience", "professional experience", "skills", "education"] },
];

// Category → suggested next agents (Agent Registry ids). Hermes decides.
const SUGGESTED_BY_CATEGORY: Record<DocumentCategory, string[]> = {
  "Financial Statement": ["finance", "analytics", "commentary"],
  Invoice: ["finance", "analytics"],
  Budget: ["finance", "analytics", "commentary"],
  Forecast: ["finance", "analytics", "commentary"],
  "Pricing Sheet": ["finance", "analytics"],
  "Commission Report": ["finance", "analytics", "commentary"],
  Presentation: ["research", "commentary"],
  "Research Paper": ["research", "knowledge"],
  "Meeting Notes": ["knowledge", "memory"],
  Contract: ["research", "knowledge"],
  Resume: ["knowledge"],
  "General Document": ["knowledge", "research"],
};

const EN_STOPWORDS = ["the", "and", "of", "to", "in", "for", "with", "is", "this"];

function guessLanguage(text: string): string | null {
  if (!text.trim()) return null;
  const lower = ` ${text.toLowerCase()} `;
  const hits = EN_STOPWORDS.filter((w) => lower.includes(` ${w} `)).length;
  return hits >= 3 ? "en" : "unknown";
}

function detectTables(kind: string, ext: string, text: string): boolean {
  if (kind === "spreadsheet" || ext === "csv" || ext === "tsv") return true;
  const lines = text.split("\n").slice(0, 30);
  const delimited = lines.filter((l) => (l.match(/[,\t|]/g)?.length ?? 0) >= 2);
  return delimited.length >= 5;
}

function detectHeaders(text: string, hasTables: boolean): boolean {
  if (!hasTables) return false;
  const first = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  const cells = first.split(/[,\t|]/).map((c) => c.trim());
  if (cells.length < 2) return false;
  // header row = mostly non-numeric cells
  const nonNumeric = cells.filter((c) => c && isNaN(Number(c))).length;
  return nonNumeric >= Math.ceil(cells.length / 2);
}

function countSheets(kind: string, text: string): number | null {
  if (kind !== "spreadsheet") return null;
  const markers = (text.match(/^# Sheet:/gm)?.length ?? 0);
  return markers > 0 ? markers : 1;
}

function classify(
  name: string,
  ext: string,
  kind: string,
  text: string,
): { category: DocumentCategory; confidence: number } {
  if (ext === "pptx" || kind === "presentation") {
    return { category: "Presentation", confidence: 0.8 };
  }
  const hay = `${name.toLowerCase()} ${text.toLowerCase()}`;
  let best: DocumentCategory = "General Document";
  let bestHits = 0;
  for (const sig of CATEGORY_SIGNALS) {
    const hits = sig.terms.filter((t) => hay.includes(t)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = sig.category;
    }
  }
  if (bestHits === 0) return { category: "General Document", confidence: text.trim() ? 0.4 : 0.2 };
  return { category: best, confidence: Math.min(0.95, 0.55 + bestHits * 0.15) };
}

function describeStructure(u: Omit<FileUnderstanding, "structure">): string {
  const bits: string[] = [];
  if (u.sheets) bits.push(`${u.sheets} sheet${u.sheets > 1 ? "s" : ""}`);
  if (u.hasTables) bits.push(u.hasHeaders ? "tabular w/ headers" : "tabular");
  if (u.kind === "image") bits.push("image (metadata only)");
  else if (u.chars > 0) bits.push(`${u.chars.toLocaleString()} chars`);
  if (u.truncated) bits.push("truncated");
  return bits.join(" · ") || "no extractable content";
}

/** Analyze one uploaded file → structural understanding (metadata only). */
export async function analyzeFile(file: File): Promise<FileUnderstanding> {
  const ext = extOf(file.name);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext) || file.type.startsWith("image/");

  let kind = "unsupported";
  let text = "";
  let truncated = false;
  let error: string | undefined;

  if (isImage) {
    kind = "image"; // metadata only for now — no extraction
  } else {
    try {
      const res = await extractFile(file);
      kind = res.kind;
      text = res.text;
      truncated = res.truncated;
    } catch (e) {
      error = (e as Error).message;
    }
  }

  const hasTables = detectTables(kind, ext, text);
  const hasHeaders = detectHeaders(text, hasTables);
  const sheets = countSheets(kind, text);
  const { category, confidence } = classify(file.name, ext, kind, text);

  const base = {
    name: file.name,
    ext,
    mime: file.type || "application/octet-stream",
    kind,
    sizeBytes: file.size,
    pages: null as number | null, // not derivable without re-parsing; reused pipeline returns text only
    sheets,
    encoding: isImage ? "binary" : BINARY_KINDS.has(kind) ? "binary" : "utf-8",
    language: isImage ? null : guessLanguage(text),
    hasTables,
    hasHeaders,
    category,
    confidence,
    chars: text.length,
    truncated,
    error,
  };

  return { ...base, structure: describeStructure(base) };
}

function buildRelationships(items: FileUnderstanding[]): FileRelationship[] {
  const rels: FileRelationship[] = [];
  const byCategory = new Map<string, string[]>();
  for (const u of items) {
    const arr = byCategory.get(u.category) ?? [];
    arr.push(u.name);
    byCategory.set(u.category, arr);
  }
  for (const [cat, files] of byCategory) {
    if (files.length > 1) rels.push({ label: `Share category: ${cat}`, files });
  }
  return rels;
}

/** Analyze a batch and assemble the reusable File Agent context. */
export async function analyzeBatch(files: File[]): Promise<FileAgentContext> {
  const understandings = await Promise.all(files.map((f) => analyzeFile(f)));

  const detectedTypes = [...new Set(understandings.map((u) => u.kind))];
  const relationships = buildRelationships(understandings);

  const suggested = new Set<string>();
  for (const u of understandings) {
    for (const a of SUGGESTED_BY_CATEGORY[u.category] ?? []) suggested.add(a);
  }

  const cats = [...new Set(understandings.map((u) => u.category))];
  return {
    selectedFiles: understandings.map((u) => u.name),
    detectedTypes,
    understandings,
    relationships,
    suggestedAgents: [...suggested],
    summary: `${understandings.length} file(s): ${cats.join(", ")}.`,
  };
}
