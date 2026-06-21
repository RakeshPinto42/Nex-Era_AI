import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRate,
  recordFail,
  recordSuccess,
  _reset,
  MAX_FAILS,
} from "@/lib/auth/rate-limit";

const KEY = "1.2.3.4:admin";

describe("login rate limit", () => {
  beforeEach(() => _reset());

  it("allows attempts under the limit", () => {
    for (let i = 0; i < MAX_FAILS - 1; i++) recordFail(KEY);
    expect(checkRate(KEY).limited).toBe(false);
  });

  it("locks after MAX_FAILS failures", () => {
    let last = { limited: false } as ReturnType<typeof recordFail>;
    for (let i = 0; i < MAX_FAILS; i++) last = recordFail(KEY);
    expect(last.limited).toBe(true);
    const gate = checkRate(KEY);
    expect(gate.limited).toBe(true);
    expect(gate.retryAfterSec).toBeGreaterThan(0);
  });

  it("clears the bucket on success", () => {
    for (let i = 0; i < MAX_FAILS; i++) recordFail(KEY);
    recordSuccess(KEY);
    expect(checkRate(KEY).limited).toBe(false);
  });

  it("isolates keys", () => {
    for (let i = 0; i < MAX_FAILS; i++) recordFail(KEY);
    expect(checkRate("9.9.9.9:guest1").limited).toBe(false);
  });
});
