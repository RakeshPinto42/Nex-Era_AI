import { describe, it, expect } from "vitest";
import { route } from "@/lib/router/router";

describe("router.route", () => {
  it("returns a coherent result for a prompt", () => {
    const r = route("Refactor this React component and fix the bug");
    expect(r.selected).toBeTruthy();
    expect(r.ranked.length).toBeGreaterThan(0);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    // ranked is sorted by score desc
    for (let i = 1; i < r.ranked.length; i++) {
      expect(r.ranked[i - 1].score).toBeGreaterThanOrEqual(r.ranked[i].score);
    }
  });

  it("honors a forced intent", () => {
    const r = route("hello there", { forceIntent: "coding" });
    expect(r.intent).toBe("coding");
    // selected model must actually support the routed intent
    expect(r.selected.capability["coding"]).not.toBeUndefined();
  });

  it("fails over when the top model is unavailable", () => {
    const base = route("write some code");
    const topId = base.ranked[0].model.id;
    const r = route("write some code", { availability: { [topId]: false } });
    expect(r.selected.id).not.toBe(topId);
    expect(r.usedFallback).toBe(true);
  });
});
