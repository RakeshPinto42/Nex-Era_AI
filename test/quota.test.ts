import { describe, it, expect, beforeEach } from "vitest";
import { consumeQuota, _reset, GUEST_LIMITS } from "@/lib/auth/quota";
import { SAMPLES } from "@/lib/finance/samples";

describe("usage quota", () => {
  beforeEach(() => _reset());

  it("admins are unlimited", () => {
    for (let i = 0; i < 1000; i++) {
      expect(consumeQuota("boss", "admin", "video").ok).toBe(true);
    }
  });

  it("guests are capped per action", () => {
    const limit = GUEST_LIMITS.video;
    for (let i = 0; i < limit; i++) {
      expect(consumeQuota("g1", "guest", "video").ok).toBe(true);
    }
    const over = consumeQuota("g1", "guest", "video");
    expect(over.ok).toBe(false);
    expect(over.remaining).toBe(0);
    expect(over.retryAfterSec).toBeGreaterThan(0);
  });

  it("isolates users and actions", () => {
    for (let i = 0; i < GUEST_LIMITS.video; i++) consumeQuota("g1", "guest", "video");
    expect(consumeQuota("g2", "guest", "video").ok).toBe(true); // different user
    expect(consumeQuota("g1", "guest", "image").ok).toBe(true); // different action
  });
});

describe("sample datasets", () => {
  it("every sample builds a rectangular non-empty table", () => {
    for (const s of SAMPLES) {
      const ds = s.build();
      expect(ds.columns.length).toBeGreaterThan(0);
      expect(ds.rows.length).toBeGreaterThan(0);
      for (const row of ds.rows) expect(row).toHaveLength(ds.columns.length);
    }
  });
});
