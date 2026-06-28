import { sessionFromRequest } from "@/lib/auth/session";
import {
  ratingFromMomentum,
  equitySignal,
  holdForRating,
  type Horizon,
  type Rating,
  type TradePlan,
} from "@/lib/investments/signals";
import { fetchQuotes, fetchFundamentals } from "@/lib/investments/yahoo";
import { atr } from "@/lib/investments/ta";
import {
  GROWTH_STOCKS,
  DIVIDEND_STOCKS,
  PENNY_STOCKS,
  METALS,
  ALL_STOCKS,
  US_STOCKS,
  ETFS,
  MUTUAL_FUNDS,
  INDICES,
  type StockDef,
} from "@/lib/investments/watchlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Live signals from Yahoo Finance (keyless). Equities get BOTH a short-term and a
// long-term rating; metals get a single momentum rating. Real prices, transparent
// momentum rule — no AI guessing here (the AI "why" is a separate on-demand call).

export type StockSignal = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  currency: string;
  d24: number | null;
  d7: number | null;
  d30: number | null;
  d90: number | null;
  d1y: number | null;
  short: Horizon;
  long: Horizon;
  rsi: number | null;
  sma50: number | null;
  sma200: number | null;
  trend: string;
  conviction: number;
  plan: TradePlan;
  hold: string;
  series: number[];
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  divYield: number | null;
  eps: number | null;
  quality: number | null; // 0–100 fundamental/growth score
  fwdGrowth: number | null; // forward EPS growth %
  forwardPE: number | null;
  weeklyMove: number; // expected ~1-week move in price terms
};

// Fundamental/growth quality 0–100 from forward earnings growth, PEG, P/B.
// Separate from momentum Conviction — "is the business cheap & growing?"
function qualityScore(
  pe: number | undefined,
  pb: number | undefined,
  eps: number | undefined,
  epsFwd: number | undefined,
  fwdPe: number | undefined,
): { score: number | null; g: number | null } {
  if (eps == null && epsFwd == null && pe == null) return { score: null, g: null };
  let s = 50;
  let g: number | null = null;
  if (eps && eps !== 0 && epsFwd != null) {
    g = (epsFwd - eps) / Math.abs(eps);
    if (g > 0.2) s += 18;
    else if (g > 0.1) s += 10;
    else if (g > 0) s += 4;
    else s -= 12;
  }
  if (pe && pe > 0 && g != null && g > 0) {
    const peg = pe / (g * 100);
    if (peg < 1) s += 12;
    else if (peg < 1.5) s += 6;
    else if (peg > 3) s -= 8;
  }
  if (fwdPe && pe && fwdPe < pe) s += 6;
  if (pb && pb > 0) {
    if (pb < 3) s += 4;
    else if (pb > 10) s -= 4;
  }
  return { score: Math.max(0, Math.min(100, Math.round(s))), g };
}

export type MetalSignal = {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  d24: number | null;
  d7: number | null;
  d30: number | null;
  rating: Rating;
  reason: string;
  hold: string;
  series: number[];
  weeklyMove: number;
};

export async function GET(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const equityDefs = [...ALL_STOCKS, ...US_STOCKS, ...ETFS, ...MUTUAL_FUNDS];
  const symbols = [
    ...equityDefs.map((s) => s.symbol),
    ...METALS.map((m) => m.symbol),
    ...INDICES.map((i) => i.symbol),
  ];
  const [quotes, funds] = await Promise.all([
    fetchQuotes(symbols),
    // Fundamentals matter for stocks; ETFs/MFs mostly lack them (handled as null).
    fetchFundamentals([...ALL_STOCKS, ...US_STOCKS].map((s) => s.symbol)),
  ]);

  const stock = (def: StockDef): StockSignal | null => {
    const q = quotes.get(def.symbol);
    if (!q) return null;
    const sig = equitySignal(q);
    const f = funds.get(def.symbol);

    // Valuation + anti-chase tweak: cheap P/E lifts conviction, very rich P/E or an
    // overextended 30-day run (chasing) trims it. Keeps long-term calls sane.
    let conviction = sig.conviction;
    if (f?.pe && f.pe > 0) {
      if (f.pe < 22) conviction += 4;
      else if (f.pe > 55) conviction -= 5;
    }
    if ((q.d30 ?? 0) > 35) conviction -= 4;
    conviction = Math.max(0, Math.min(100, conviction));

    const ql = qualityScore(f?.pe, f?.pb, f?.eps, f?.epsFwd, f?.fwdPe);

    return {
      symbol: def.symbol,
      name: def.name,
      sector: def.sector,
      price: q.price,
      currency: q.currency,
      d24: q.d24,
      d7: q.d7,
      d30: q.d30,
      d90: q.d90,
      d1y: q.d1y,
      short: sig.short,
      long: sig.long,
      rsi: sig.rsi,
      sma50: sig.sma50,
      sma200: sig.sma200,
      trend: sig.trend,
      conviction,
      plan: sig.plan,
      hold: sig.hold,
      series: q.series,
      pe: f?.pe ?? null,
      pb: f?.pb ?? null,
      marketCap: f?.mcap ?? null,
      divYield: f?.divYield ?? null,
      eps: f?.eps ?? null,
      quality: ql.score,
      fwdGrowth: ql.g == null ? null : Math.round(ql.g * 1000) / 10,
      forwardPE: f?.fwdPe ?? null,
      weeklyMove: sig.weeklyMove,
    };
  };

  const metal = (def: { symbol: string; name: string }): MetalSignal | null => {
    const q = quotes.get(def.symbol);
    if (!q) return null;
    const { rating, reason } = ratingFromMomentum(q.d24, q.d7, q.d30);
    return {
      symbol: def.symbol,
      name: def.name,
      price: q.price,
      currency: q.currency,
      d24: q.d24,
      d7: q.d7,
      d30: q.d30,
      rating,
      reason,
      hold: holdForRating(rating, "metal"),
      series: q.series,
      weeklyMove: Math.round(((atr(q.highs, q.lows, q.closes) ?? q.price * 0.04) * Math.sqrt(5)) * 100) / 100,
    };
  };

  const index = (def: { symbol: string; name: string; currency: string }) => {
    const q = quotes.get(def.symbol);
    if (!q) return null;
    return {
      symbol: def.symbol,
      name: def.name,
      currency: def.currency, // Yahoo can't infer ^NSEI as INR — use the curated value.
      price: q.price,
      d24: q.d24,
      d7: q.d7,
      d30: q.d30,
      d1y: q.d1y,
      series: q.series,
    };
  };

  const nn = <T,>(x: T | null): x is T => x !== null;
  const growth = GROWTH_STOCKS.map(stock).filter(nn);
  const dividend = DIVIDEND_STOCKS.map(stock).filter(nn);
  const penny = PENNY_STOCKS.map(stock).filter(nn);
  const us = US_STOCKS.map(stock).filter(nn);
  const etf = ETFS.map(stock).filter(nn);
  const mf = MUTUAL_FUNDS.map(stock).filter(nn);
  const metals = METALS.map(metal).filter(nn);
  const indices = INDICES.map(index).filter(nn);

  if (!growth.length && !dividend.length && !penny.length && !metals.length && !us.length) {
    return Response.json({ error: "market data unavailable right now — try again shortly" }, { status: 502 });
  }

  return Response.json({ asOf: new Date().toISOString(), growth, dividend, penny, us, etf, mf, metals, indices });
}
