// Runtime output guardrail. The system prompt steers the model; this enforces.
// Open-source models can ignore a system prompt, so completions are scanned
// server-side before they reach the user. Implementation streams with a small
// hold-back buffer: the trailing window (where an unsafe phrase is still forming)
// is never released until the accumulated text passes the scan. On a hit, the
// held tail is dropped and a refusal replaces the remainder of the stream.

const encoder = new TextEncoder();

// Hard-block categories. Patterns target the harmful *payload* (synthesis,
// instructions, targeting) rather than mere mention of a topic, to keep false
// positives low — "what is ransomware" passes, "write ransomware that…" blocks.
const BLOCK: { category: string; re: RegExp }[] = [
  {
    category: "weapons/mass-harm",
    re: /\b(synthesi[sz]e|manufactur|make|build|construct|assemble)\b[^.?!]{0,80}\b(bioweapon|biological weapon|nerve agent|sarin|vx|chemical weapon|explosive|bomb|ied|pipe bomb|grenade|napalm|ricin|anthrax)\b/i,
  },
  {
    category: "weapons/mass-harm",
    re: /\b(bomb|explosive|ied)\b[^.?!]{0,40}\b(recipe|instructions?|how to (make|build)|step[-\s]?by[-\s]?step)\b/i,
  },
  {
    category: "malware",
    re: /\b(write|create|generate|build|code)\b[^.?!]{0,60}\b(ransomware|keylogger|rootkit|botnet|trojan|computer virus|worm|spyware|credential stealer|infostealer)\b/i,
  },
  {
    category: "malware",
    re: /\b(exploit|payload|backdoor)\b[^.?!]{0,60}\b(undetectable|evade (av|antivirus|edr)|bypass (av|antivirus|edr|defender))\b/i,
  },
  {
    category: "illicit-drugs",
    re: /\b(synthesi[sz]e|manufactur|cook|produce|make)\b[^.?!]{0,40}\b(methamphetamine|crystal meth|fentanyl|heroin|cocaine|mdma)\b/i,
  },
  {
    category: "child-safety",
    re: /\b(child|minor|underage|teen|preteen|infant)\b[^.?!]{0,40}\b(sexual|porn|explicit|nude|nudes|cp)\b/i,
  },
  {
    category: "self-harm",
    re: /\b(how to|best way to|easiest way to|method to)\b[^.?!]{0,40}\b(kill myself|commit suicide|end my life|hang myself|overdose)\b/i,
  },
];

export type ScanResult = { blocked: boolean; category?: string };

/** Scan accumulated text for hard-block content. */
export function scan(text: string): ScanResult {
  for (const { category, re } of BLOCK) {
    if (re.test(text)) return { blocked: true, category };
  }
  return { blocked: false };
}

function refusal(category?: string): string {
  return `\n\n⛔ **Blocked by NEXERA's safety filter${category ? ` (${category})` : ""}.** This response was stopped because it appeared to violate NEXERA's use policy. I can help with software, data, finance, research and authorized security work instead.`;
}

// Characters of trailing context held back from the client until the next scan
// proves them safe. Large enough to contain a forming unsafe phrase.
const HOLD = 280;

/**
 * Wrap a text stream with the output guardrail. Safe content streams through
 * (minus a short trailing hold-back); a block halts the stream and emits a
 * refusal in place of the unreleased remainder.
 */
export function guardStream(
  inner: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = inner.getReader();
      const decoder = new TextDecoder();
      let buf = ""; // full accumulated completion
      let emitted = 0; // chars already sent to the client
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const hit = scan(buf);
          if (hit.blocked) {
            // Drop the unreleased tail entirely; replace with a refusal.
            controller.enqueue(encoder.encode(refusal(hit.category)));
            await reader.cancel().catch(() => {});
            controller.close();
            return;
          }

          // Release everything except the trailing hold-back window.
          const safeEnd = buf.length - HOLD;
          if (safeEnd > emitted) {
            controller.enqueue(encoder.encode(buf.slice(emitted, safeEnd)));
            emitted = safeEnd;
          }
        }

        // Stream ended — final scan, then flush whatever's left.
        const hit = scan(buf);
        if (hit.blocked) {
          controller.enqueue(encoder.encode(refusal(hit.category)));
        } else if (buf.length > emitted) {
          controller.enqueue(encoder.encode(buf.slice(emitted)));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n[guardrail error: ${(err as Error)?.message ?? "stream failed"}]`),
        );
      } finally {
        controller.close();
      }
    },
  });
}
