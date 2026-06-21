import { describe, it, expect } from "vitest";
import { INTENTS, INTENT_ORDER, sampleIntent } from "@/lib/brand/intent";

describe("intent palette", () => {
  it("has 5 intents in a stable order", () => {
    expect(INTENT_ORDER).toHaveLength(5);
    expect(Object.keys(INTENTS)).toHaveLength(5);
  });

  it("every intent has a valid hex + rgb", () => {
    for (const key of INTENT_ORDER) {
      const it = INTENTS[key];
      expect(it.hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(it.rgb).toMatch(/^\d{1,3},\d{1,3},\d{1,3}$/);
      expect(it.label.length).toBeGreaterThan(0);
    }
  });

  it("sampleIntent always returns a known intent", () => {
    for (let i = 0; i < 200; i++) {
      expect(INTENT_ORDER).toContain(sampleIntent());
    }
  });
});
