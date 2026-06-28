// Deterministic money math. The engine computes in INTEGER MINOR UNITS (cents)
// to avoid floating-point drift, so identical inputs always yield identical
// payouts. Round half-up, sign-aware. Convert to/from the model's `Money`
// (major-unit number) only at the boundary.

import type { Money } from "../model";

export type Cents = number; // integer

const EPS = 1e-9;

export function toCents(m: Money): Cents {
  return Math.round((m + Math.sign(m) * EPS) * 100);
}
export function toMoney(c: Cents): Money {
  return Math.round(c) / 100;
}

// half-up, symmetric around zero → deterministic
function roundHalfUp(x: number): Cents {
  return Math.sign(x) * Math.floor(Math.abs(x) + 0.5 + EPS);
}

export const money = {
  toCents,
  toMoney,
  add: (...cs: Cents[]): Cents => cs.reduce((a, b) => a + b, 0),
  sub: (a: Cents, b: Cents): Cents => a - b,
  /** apply a percentage (e.g. 12.5 → 12.5%) to a cents amount */
  percent: (c: Cents, pct: number): Cents => roundHalfUp((c * pct) / 100),
  /** apply a multiplier (e.g. 1.5×) */
  multiply: (c: Cents, mult: number): Cents => roundHalfUp(c * mult),
  /** clamp to a maximum (cap) */
  cap: (c: Cents, capCents: Cents): Cents => (c > capCents ? capCents : c),
  /** floor to a minimum (guarantee) */
  floor: (c: Cents, minCents: Cents): Cents => (c < minCents ? minCents : c),
  max: (a: Cents, b: Cents): Cents => (a > b ? a : b),
  min: (a: Cents, b: Cents): Cents => (a < b ? a : b),
  roundHalfUp,
};
