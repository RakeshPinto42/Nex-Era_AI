import { sessionFromRequest } from "@/lib/auth/session";
import { ratingFromMomentum, holdForRating, type Rating } from "@/lib/investments/signals";
import { downsample } from "@/lib/investments/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live crypto buy/sell signals. Prices + momentum come from CoinGecko's keyless
// markets endpoint (no API key, no charge); the rating is computed locally from
// 24h/7d/30d momentum. Includes tokenized gold (PAX Gold) so metals get a live
// reference too.

type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap_rank: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  sparkline_in_7d?: { price?: number[] };
};

export type CryptoSignal = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: number;
  d24: number | null;
  d7: number | null;
  d30: number | null;
  rating: Rating;
  reason: string;
  rank: number;
  hold: string;
  series: number[];
  weeklyMove: number;
};

// Expected ~1-week move from the 7-day hourly sparkline: stdev of hourly returns
// projected across the window × price.
function weeklyVolMove(raw: number[], price: number): number {
  if (raw.length < 3) return price * 0.05;
  const rets: number[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = (raw[i] - raw[i - 1]) / raw[i - 1];
    if (Number.isFinite(r)) rets.push(r);
  }
  if (!rets.length) return price * 0.05;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const v = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.round(price * Math.sqrt(v) * Math.sqrt(rets.length) * 100) / 100;
}

// Top 100 coins by market cap (stablecoins filtered out below).
const URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h,7d,30d";

// Pegged stablecoins carry no buy/sell signal — drop them from the list.
const STABLE = new Set([
  "tether", "usd-coin", "dai", "first-digital-usd", "true-usd", "usdd", "frax",
  "paypal-usd", "ethena-usde", "usds", "binance-peg-busd", "gho", "crvusd",
]);

export async function GET(req: Request) {
  const session = await sessionFromRequest(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let coins: Coin[];
  try {
    const res = await fetch(URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return Response.json({ error: `market data unavailable (${res.status})` }, { status: 502 });
    }
    coins = (await res.json()) as Coin[];
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }

  const items: CryptoSignal[] = coins.filter((c) => !STABLE.has(c.id)).map((c) => {
    const d24 = c.price_change_percentage_24h_in_currency ?? null;
    const d7 = c.price_change_percentage_7d_in_currency ?? null;
    const d30 = c.price_change_percentage_30d_in_currency ?? null;
    const { rating, reason } = ratingFromMomentum(d24, d7, d30);
    const spark = c.sparkline_in_7d?.price ?? [];
    return {
      id: c.id,
      name: c.name,
      symbol: c.symbol.toUpperCase(),
      image: c.image,
      price: c.current_price,
      d24,
      d7,
      d30,
      rating,
      reason,
      rank: c.market_cap_rank,
      hold: holdForRating(rating, "crypto"),
      series: spark.length ? downsample(spark) : [],
      weeklyMove: weeklyVolMove(spark, c.current_price),
    };
  });

  return Response.json({ asOf: new Date().toISOString(), items });
}
