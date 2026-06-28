/**
 * File Agent — types (Phase 3).
 *
 * The File Agent is the universal document-understanding agent: read-only,
 * metadata-only. It prepares structured context other agents consume. No
 * editing, no business reasoning, no AI commentary.
 */

export type DocumentCategory =
  | "Financial Statement"
  | "Invoice"
  | "Budget"
  | "Forecast"
  | "Pricing Sheet"
  | "Commission Report"
  | "Presentation"
  | "Research Paper"
  | "Meeting Notes"
  | "Contract"
  | "Resume"
  | "General Document";

/** Supported upload formats (reusing the existing extraction pipeline). */
export const SUPPORTED_FORMATS: { ext: string; label: string }[] = [
  { ext: "pdf", label: "PDF" },
  { ext: "xlsx", label: "Excel" },
  { ext: "csv", label: "CSV" },
  { ext: "docx", label: "Word" },
  { ext: "pptx", label: "PowerPoint" },
  { ext: "md", label: "Markdown" },
  { ext: "txt", label: "Text" },
  { ext: "json", label: "JSON" },
  { ext: "png", label: "Image" },
  { ext: "jpg", label: "Image" },
];

export const SUPPORTED_EXTS = new Set(SUPPORTED_FORMATS.map((f) => f.ext));

/** Per-file structural understanding — metadata only. */
export type FileUnderstanding = {
  name: string;
  ext: string;
  mime: string;
  /** Extraction kind from the shared pipeline (pdf/docx/spreadsheet/text/image/unsupported). */
  kind: string;
  sizeBytes: number;
  pages: number | null;
  sheets: number | null;
  encoding: string;
  language: string | null;
  hasTables: boolean;
  hasHeaders: boolean;
  category: DocumentCategory;
  /** One-line structural description. */
  structure: string;
  /** 0..1 confidence in the classification. */
  confidence: number;
  chars: number;
  truncated: boolean;
  error?: string;
};

/** A structural relationship between processed files. */
export type FileRelationship = {
  label: string;
  files: string[];
};

/**
 * The reusable context the File Agent returns. Hermes / other agents consume
 * this — it never decides what happens next.
 */
export type FileAgentContext = {
  selectedFiles: string[];
  detectedTypes: string[];
  understandings: FileUnderstanding[];
  relationships: FileRelationship[];
  /** Agent Registry ids suggested as next steps (Hermes decides). */
  suggestedAgents: string[];
  summary: string;
};
