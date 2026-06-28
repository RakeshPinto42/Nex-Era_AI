// Rule-based buy/sell signals from price history. Momentum + (for equities) real
// technical analysis: RSI, moving-average trend, ATR-sized trade plans, and a
// conviction score. Deterministic + transparent. NOT financial advice.

import { rsi, sma, atr, recentHigh } from "./ta";

export type Rating = "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";

export const RATINGS: Rating[] = ["Strong Buy", "Buy", "Hold", "Sell", "Strong Sell"];

export function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function classify(score: number): { rating: Rating; trend: string } {
  if (score >= 8) return { rating: "Strong Buy", trend: "strong upward" };
  if (score >= 2.5) return { rating: "Buy", trend: "positive" };
  if (score > -2.5) return { rating: "Hold", trend: "flat / mixed" };
  if (score > -8) return { rating: "Sell", trend: "weak" };
  return { rating: "Strong Sell", trend: "sharp downward" };
}

// Weighted blend of 24h / 7d / 30d momentum → a 5-step rating (short horizon).
export function ratingFromMomentum(
  d24: number | null,
  d7: number | null,
  d30: number | null,
): { rating: Rating; score: number; reason: string } {
  const score = (d24 ?? 0) * 0.4 + (d7 ?? 0) * 0.4 + (d30 ?? 0) * 0.2;
  const { rating, trend } = classify(score);
  const reason = `7d ${fmtPct(d7)}, 24h ${fmtPct(d24)}, 30d ${fmtPct(d30)} — ${trend} momentum.`;
  return { rating, score, reason };
}

export type Horizon = { rating: Rating; reason: string };

// Two-horizon view for equities.
//  • Short term: recent momentum (24h / 7d / 30d) — for trading/swing.
//  • Long term: trend over 30d / 90d / 1y, tilted by where price sits in its
//    52-week range (near the low = value upside, near the high = extended).
export function horizonSignals(q: {
  d24: number | null;
  d7: number | null;
  d30: number | null;
  d90: number | null;
  d1y: number | null;
  w52pos: number | null;
}): { short: Horizon; long: Horizon } {
  const s = ratingFromMomentum(q.d24, q.d7, q.d30);

  let longScore = (q.d30 ?? 0) * 0.3 + (q.d90 ?? 0) * 0.4 + (q.d1y ?? 0) * 0.3;
  // Value tilt: deep in the lower 52w range with an uptrend = more upside; very
  // extended near the high = trim.
  let valueNote = "";
  if (q.w52pos != null) {
    if (q.w52pos < 0.25 && longScore > -5) {
      longScore += 4;
      valueNote = " · near 52w low (value)";
    } else if (q.w52pos > 0.9) {
      longScore -= 3;
      valueNote = " · extended near 52w high";
    }
  }
  const l = classify(longScore);
  const posTxt = q.w52pos == null ? "" : ` ${Math.round(q.w52pos * 100)}% of 52w range`;

  return {
    short: { rating: s.rating, reason: s.reason },
    long: {
      rating: l.rating,
      reason: `1y ${fmtPct(q.d1y)}, 3mo ${fmtPct(q.d90)},${posTxt} — ${l.trend} trend${valueNote}.`,
    },
  };
}

// ---- full equity signal: TA + conviction + a concrete trade plan ----

const r2 = (n: number) => Math.round(n * 100) / 100;
const RATING_SCORE: Record<Rating, number> = { "Strong Buy": 2, Buy: 1, Hold: 0, Sell: -1, "Strong Sell": -2 };

export type TradePlan = { entry: number; stop: number; target: number; rr: number | null };
export type EquitySignal = {
  short: Horizon;
  long: Horizon;
  rsi: number | null;
  sma50: number | null;
  sma200: number | null;
  trend: string;
  conviction: number; // 0–100
  plan: TradePlan;
  hold: string;
  weeklyMove: number; // ≈ expected 1-week move magnitude in price terms (ATR×√5)
};

const isUp = (r: Rating) => r === "Strong Buy" || r === "Buy";
const isDown = (r: Rating) => r === "Sell" || r === "Strong Sell";

// Suggested holding period from the two-horizon view + trend.
export function holdSuggestion(short: Rating, long: Rating, trend: string): string {
  if (isUp(long) && trend.startsWith("Uptrend")) return "Long term · 1–3 yrs (review quarterly)";
  if (isUp(long)) return "Medium term · 6–18 months";
  if (isUp(short)) return "Short term · 2–8 weeks (swing)";
  if (isDown(long) && isDown(short)) return "Avoid / exit · wait for a base";
  return "Hold / watch · no clear edge";
}

// Simpler hold note for single-rating assets (crypto / metals).
export function holdForRating(rating: Rating, kind: "crypto" | "metal"): string {
  if (kind === "metal") {
    if (isUp(rating)) return "Long term hedge · months–years";
    if (isDown(rating)) return "Reduce / wait";
    return "Hold · portfolio hedge";
  }
  if (isUp(rating)) return "Swing · days–weeks (volatile)";
  if (isDown(rating)) return "Avoid / reduce";
  return "Watch · wait for trend";
}

export function equitySignal(q: {
  price: number;
  d24: number | null;
  d7: number | null;
  d30: number | null;
  d90: number | null;
  d1y: number | null;
  w52pos: number | null;
  closes: number[];
  highs: number[];
  lows: number[];
}): EquitySignal {
  const { short, long } = horizonSignals(q);
  const { price, closes, highs, lows } = q;

  const rsiV = rsi(closes);
  const s50 = sma(closes, 50);
  const s200 = sma(closes, 200);

  const trend =
    s50 && s200
      ? price > s50 && price > s200
        ? "Uptrend — above 50 & 200 DMA"
        : price < s50 && price < s200
          ? "Downtrend — below 50 & 200 DMA"
          : price > s50
            ? "Recovering — above 50 DMA"
            : "Weak — below 50 DMA"
      : "—";

  // Trade plan: ATR-sized stop, resistance-based target.
  const a = atr(highs, lows, closes) ?? price * 0.04;
  const stop = Math.min(price - 1.5 * a, price * 0.97);
  const risk = price - stop;
  const res = recentHigh(highs, 60) ?? price * 1.1;
  const target = res > price * 1.01 ? res : price + 2 * risk;
  const rr = risk > 0 ? (target - price) / risk : null;

  // Conviction 0–100: ratings + trend + RSI sweet-spot.
  let sc = 50 + RATING_SCORE[short.rating] * 8 + RATING_SCORE[long.rating] * 8;
  if (s50 && s200) {
    if (price > s50 && price > s200) sc += 10;
    else if (price < s50 && price < s200) sc -= 10;
  }
  if (rsiV != null) {
    if (rsiV >= 40 && rsiV <= 65) sc += 6;
    else if (rsiV > 75) sc -= 8;
    else if (rsiV < 30) sc += 4;
  }
  const conviction = Math.max(0, Math.min(100, Math.round(sc)));

  return {
    short,
    long,
    rsi: rsiV == null ? null : Math.round(rsiV),
    sma50: s50 == null ? null : r2(s50),
    sma200: s200 == null ? null : r2(s200),
    trend,
    conviction,
    plan: { entry: r2(price), stop: r2(stop), target: r2(target), rr: rr == null ? null : Math.round(rr * 10) / 10 },
    hold: holdSuggestion(short.rating, long.rating, trend),
    weeklyMove: r2(a * Math.sqrt(5)), // ~5 trading days of typical daily move
  };
}
