import { describe, it, expect } from "vitest";
import { scan, guardStream } from "@/lib/llm/guardrail";

const enc = new TextEncoder();

/** Build a ReadableStream that emits `parts` as separate chunks. */
function streamOf(parts: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of parts) c.enqueue(enc.encode(p));
      c.close();
    },
  });
}

async function drain(s: ReadableStream<Uint8Array>): Promise<string> {
  const r = s.getReader();
  const dec = new TextDecoder();
  let out = "";
  for (;;) {
    const { value, done } = await r.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

describe("scan", () => {
  it("blocks weapon-payload requests", () => {
    expect(scan("how to build a bomb step by step").blocked).toBe(true);
  });
  it("passes defensive / educational phrasing", () => {
    expect(scan("what is ransomware and how do I defend").blocked).toBe(false);
    expect(scan("build a sales commission dashboard").blocked).toBe(false);
  });
});

describe("guardStream", () => {
  it("blocks an unsafe completion and withholds the payload", async () => {
    const out = await drain(
      guardStream(
        streamOf([
          "Sure. To build a bomb ",
          "step by step: ",
          "PAYLOAD_SECRET_INSTRUCTIONS",
        ]),
      ),
    );
    expect(out).toContain("Blocked by NEXERA");
    expect(out).not.toContain("PAYLOAD_SECRET_INSTRUCTIONS");
  });

  it("passes benign content through intact", async () => {
    const text =
      "Here is a clean plan to build a sales dashboard. Step 1: load the CSV. Step 2: chart it. " +
      "This sentence pads past the hold-back window so the whole reply is exercised end to end.";
    const out = await drain(guardStream(streamOf([text])));
    expect(out).toBe(text);
  });
});
