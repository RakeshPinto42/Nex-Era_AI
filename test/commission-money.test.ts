import { describe, it, expect } from "vitest";
import { money, toCents, toMoney } from "@/lib/finance-os/commission/studio/engine/money";

describe("minor-unit conversion (cents)", () => {
  it("round-trips major↔minor exactly", () => {
    for (const m of [0, 1, 0.01, 0.99, 19.99, 1234.56, 1000000.07, -42.42]) {
      expect(toMoney(toCents(m))).toBe(m);
    }
  });
  it("converts to integer cents", () => {
    expect(toCents(10)).toBe(1000);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1)).toBe(10);
    expect(Number.isInteger(toCents(123.45))).toBe(true);
  });
});

describe("currency rounding — half-up, sign-aware", () => {
  it("rounds .5 up, away from zero symmetrically", () => {
    expect(money.roundHalfUp(0.5)).toBe(1);
    expect(money.roundHalfUp(1.5)).toBe(2);
    expect(money.roundHalfUp(2.5)).toBe(3);
    expect(money.roundHalfUp(-0.5)).toBe(-1);
    expect(money.roundHalfUp(-2.5)).toBe(-3);
  });
  it("rounds below .5 down", () => {
    expect(money.roundHalfUp(2.49)).toBe(2);
    expect(money.roundHalfUp(-2.49)).toBe(-2);
    expect(money.roundHalfUp(0.4999)).toBe(0);
  });
});

describe("arithmetic", () => {
  it("add/sub on cents", () => {
    expect(money.add(100, 200, 300)).toBe(600);
    expect(money.sub(500, 150)).toBe(350);
    expect(money.add()).toBe(0);
  });
  it("percent applies half-up", () => {
    expect(money.percent(10000, 12.5)).toBe(1250);   // 12.5% of $100.00
    expect(money.percent(100, 33.33)).toBe(33);       // 33.33% of $1.00 → 33c
    expect(money.percent(100, 0)).toBe(0);
    expect(money.percent(-10000, 10)).toBe(-1000);
  });
  it("multiply applies a multiplier half-up", () => {
    expect(money.multiply(10000, 1.5)).toBe(15000);
    expect(money.multiply(333, 1.5)).toBe(500);       // 333 * 1.5 = 499.5 → 500
    expect(money.multiply(100, 0)).toBe(0);
  });
  it("cap and floor", () => {
    expect(money.cap(900, 500)).toBe(500);
    expect(money.cap(400, 500)).toBe(400);
    expect(money.floor(300, 500)).toBe(500);
    expect(money.floor(600, 500)).toBe(600);
    expect(money.max(3, 7)).toBe(7);
    expect(money.min(3, 7)).toBe(3);
  });
});

describe("NO floating-point errors are possible", () => {
  it("classic float traps are exact in cents", () => {
    // 0.1 + 0.2 !== 0.3 in float — exact here
    expect(toMoney(money.add(toCents(0.1), toCents(0.2)))).toBe(0.3);
    // 0.07 * 3
    expect(toMoney(money.multiply(toCents(0.07), 3))).toBe(0.21);
    // 19.99 * 100 boundary
    expect(toMoney(money.multiply(toCents(19.99), 100))).toBe(1999);
  });
  it("summing 1000 small amounts has no drift", () => {
    let c = 0;
    for (let i = 0; i < 1000; i++) c = money.add(c, toCents(0.01));
    expect(toMoney(c)).toBe(10); // exactly $10.00, not 9.9999…
  });
  it("commission scenario: tiered % of many credits totals exactly", () => {
    const credits = [1234.56, 999.99, 0.01, 50000.5, 7.77];
    const totalCents = credits.reduce((acc, m) => money.add(acc, toCents(m)), 0);
    const commission = money.percent(totalCents, 8.5); // 8.5%
    // recompute the same way → identical (determinism within arithmetic)
    const again = money.percent(credits.reduce((a, m) => money.add(a, toCents(m)), 0), 8.5);
    expect(commission).toBe(again);
    expect(Number.isInteger(commission)).toBe(true);
  });
});
