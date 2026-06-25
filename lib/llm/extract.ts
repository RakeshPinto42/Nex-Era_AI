// Server-side document text extraction. Turns an uploaded file into plain text
// the (text-only) chat/code models can read. PDF/DOCX use dedicated libs,
// spreadsheets reuse `xlsx`, text/code is decoded directly.

import "server-only";
import * as XLSX from "xlsx";

const MAX_CHARS = 24_000;

export type ExtractResult = { kind: string; text: string; truncated: boolean };

const TEXT_EXT = new Set([
  "txt", "md", "markdown", "csv", "tsv", "json", "log", "xml", "yaml", "yml",
  "html", "htm", "rtf",
]);
const CODE_EXT = new Set([
  "js", "jsx", "ts", "tsx", "py", "java", "c", "h", "cpp", "cc", "cs", "go",
  "rs", "rb", "php", "swift", "kt", "sh", "bash", "sql", "css", "scss", "vue",
  "toml", "ini", "env", "dockerfile", "gradle",
]);

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}
function tidy(text: string): string {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function cap(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_CHARS) return { text, truncated: false };
  return { text: text.slice(0, MAX_CHARS), truncated: true };
}

export async function extractFile(file: File): Promise<ExtractResult> {
  const e = ext(file.name);
  const buf = Buffer.from(await file.arrayBuffer());

  if (e === "pdf" || file.type === "application/pdf") {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      const out = await parser.getText();
      await parser.destroy();
      const clean = tidy(out.text || "");
      if (!clean) {
        return {
          kind: "pdf",
          text: "[This PDF has no extractable text — likely scanned/image-based; needs OCR.]",
          truncated: false,
        };
      }
      const { text, truncated } = cap(clean);
      return { kind: "pdf", text, truncated };
    } catch (err) {
      return { kind: "pdf", text: `[Could not read PDF: ${(err as Error).message}]`, truncated: false };
    }
  }

  if (e === "docx") {
    try {
      const mammoth = (await import("mammoth")).default;
      const out = await mammoth.extractRawText({ buffer: buf });
      const { text, truncated } = cap(tidy(out.value || ""));
      return { kind: "docx", text, truncated };
    } catch (err) {
      return { kind: "docx", text: `[Could not read Word file: ${(err as Error).message}]`, truncated: false };
    }
  }

  if (e === "xlsx" || e === "xls") {
    try {
      const wb = XLSX.read(buf, { type: "buffer" });
      const parts = wb.SheetNames.map((name) => {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
        return wb.SheetNames.length > 1 ? `# Sheet: ${name}\n${csv}` : csv;
      });
      const { text, truncated } = cap(tidy(parts.join("\n\n")));
      return { kind: "spreadsheet", text, truncated };
    } catch (err) {
      return { kind: "spreadsheet", text: `[Could not read spreadsheet: ${(err as Error).message}]`, truncated: false };
    }
  }

  if (TEXT_EXT.has(e) || CODE_EXT.has(e) || file.type.startsWith("text/")) {
    const { text, truncated } = cap(tidy(buf.toString("utf8")));
    return { kind: "text", text, truncated };
  }

  return { kind: "unsupported", text: "", truncated: false };
}
