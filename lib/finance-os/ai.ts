// AI-assist seam — SECONDARY by design. AI never performs the core calculations.
// It only helps with: column mapping, rule extraction, validation explanations,
// and variance/executive commentary. To preserve privacy, callers must pass ONLY
// column headers and aggregate summaries here — never raw transactional rows.

export type AiTask = "mapping" | "rule-extraction" | "explain-exceptions" | "commentary";

export async function aiAssist(task: AiTask, payload: unknown): Promise<string> {
  const res = await fetch("/api/finance-os/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, payload }),
  });
  if (!res.ok) throw new Error(`AI assist failed (${res.status})`);
  const data = (await res.json()) as { text?: string; error?: string };
  if (data.error) throw new Error(data.error);
  return data.text ?? "";
}

/** Suggest field→header mapping. Send only headers + the field specs. */
export function suggestMapping(headers: string[], fields: { key: string; label: string }[]) {
  return aiAssist("mapping", { headers, fields });
}

/** Draft management/exec commentary from a numeric summary (no row-level data). */
export function writeCommentary(kind: string, summary: Record<string, unknown>) {
  return aiAssist("commentary", { kind, summary });
}
