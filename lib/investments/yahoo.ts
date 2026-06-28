// Keyless live quotes via Yahoo Finance's `spark` endpoint — which takes MANY
// symbols per request, so we can cover 100+ stocks in a few calls instead of one
// request per ticker. Returns daily closes (no OHLC); ATR is approximated from
// close-to-close moves downstream. NSE tickers carry `.NS` (INR); commodity
// futures like GC=F are USD. No API key, no charge.

import "server-only";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type Quote = {
  price: number;
  currency: string;
  d24: number | null;
  d7: number | null;
  d30: number | null;
  d90: number | null;
  d1y: number | null;
  w52pos: number | null;
  closes: number[];
  highs: number[];
  lows: number[];
  series: number[];
};

export function downsample(arr: number[], n = 50): number[] {
  if (arr.length <= n) return arr.slice();
  const out: number[] = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

const pct = (now: number, then: number | undefined | null): number | null =>
  then && then !== 0 ? ((now - then) / then) * 100 : null;

function buildQuote(symbol: string, closesRaw: (number | null)[], prevClose?: number): Quote | null {
  const closes = closesRaw.filter((c): c is number => typeof c === "number" && Number.isFinite(c));
  if (closes.length < 2) return null;
  const price = closes[closes.length - 1];
  const len = closes.length;
  const back = (n: number) => closes[Math.max(0, len - 1 - n)];
  const hi = Math.max(...closes);
  const lo = Math.min(...closes);
  const currency = symbol.endsWith(".NS") || symbol.endsWith(".BO") ? "INR" : "USD";
  return {
    price,
    currency,
    d24: pct(price, prevClose ?? back(1)),
    d7: pct(price, back(5)),
    d30: pct(price, back(21)),
    d90: pct(price, back(63)),
    d1y: pct(price, closes[0]),
    w52pos: hi > lo ? (price - lo) / (hi - lo) : null,
    closes,
    highs: closes, // spark gives no high/low; ATR uses close-to-close moves
    lows: closes,
    series: downsample(closes),
  };
}

type SparkResp = Record<string, { close?: (number | null)[]; chartPreviousClose?: number } | undefined>;

// ---- fundamentals (P/E, dividend yield, market cap…) via crumb-authed v7 quote ----

export type Fundamental = { pe?: number; pb?: number; mcap?: number; divYield?: number; eps?: number; fwdPe?: number; epsFwd?: number };

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

let authCache: { cookie: string; crumb: string; ts: number } | null = null;

// Yahoo requires a cookie + crumb for the v7 quote endpoint. Cached ~30 min.
async function getYahooAuth(): Promise<{ cookie: string; crumb: string } | null> {
  if (authCache && Date.now() - authCache.ts < 30 * 60_000) return authCache;
  try {
    const r1 = await fetch("https://fc.yahoo.com/", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10_000),
    });
    const setCookies = (r1.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    const raw = setCookies.length ? setCookies : [r1.headers.get("set-cookie") ?? ""];
    const cookie = raw
      .filter(Boolean)
      .map((c) => c.split(";")[0].trim())
      .join("; ");
    if (!cookie) return null;
    const r2 = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": UA, Cookie: cookie },
      signal: AbortSignal.timeout(10_000),
    });
    const crumb = (await r2.text()).trim();
    if (!crumb || crumb.length > 24 || crumb.includes("<")) return null;
    authCache = { cookie, crumb, ts: Date.now() };
    return authCache;
  } catch {
    return null;
  }
}

type QuoteResult = {
  symbol?: string;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  marketCap?: number;
  dividendYield?: number;
  epsTrailingTwelveMonths?: number;
  epsForward?: number;
};

export async function fetchFundamentals(symbols: string[], chunkSize = 50): Promise<Map<string, Fundamental>> {
  const out = new Map<string, Fundamental>();
  const auth = await getYahooAuth();
  if (!auth) return out;

  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += chunkSize) chunks.push(symbols.slice(i, i + chunkSize));

  await Promise.all(
    chunks.map(async (ch) => {
      try {
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ch.map(encodeURIComponent).join(",")}&crumb=${encodeURIComponent(auth.crumb)}`;
        const res = await fetch(url, { headers: { "User-Agent": UA, Cookie: auth.cookie }, signal: AbortSignal.timeout(15_000) });
        if (!res.ok) return;
        const data = (await res.json()) as { quoteResponse?: { result?: QuoteResult[] } };
        for (const q of data.quoteResponse?.result ?? []) {
          if (!q.symbol) continue;
          out.set(q.symbol, {
            pe: num(q.trailingPE),
            pb: num(q.priceToBook),
            mcap: num(q.marketCap),
            divYield: num(q.dividendYield),
            eps: num(q.epsTrailingTwelveMonths),
            fwdPe: num(q.forwardPE),
            epsFwd: num(q.epsForward),
          });
        }
      } catch {
        /* fundamentals are best-effort */
      }
    }),
  );
  return out;
}

// Fetch one batch via spark. On failure (Yahoo 400s big batches or a single bad
// symbol), split the chunk and retry so good tickers survive a poison one.
async function fetchChunk(symbols: string[]): Promise<[string, Quote][]> {
  if (symbols.length === 0) return [];
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${symbols.map(encodeURIComponent).join(",")}&range=1y&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return splitRetry(symbols);
    const data = (await res.json()) as SparkResp;
    const out: [string, Quote][] = [];
    for (const sym of symbols) {
      const r = data?.[sym];
      if (!r || !Array.isArray(r.close)) continue;
      const q = buildQuote(sym, r.close, typeof r.chartPreviousClose === "number" ? r.chartPreviousClose : undefined);
      if (q) out.push([sym, q]);
    }
    return out;
  } catch {
    return splitRetry(symbols);
  }
}

function splitRetry(symbols: string[]): Promise<[string, Quote][]> {
  if (symbols.length <= 1) return Promise.resolve([]); // single symbol failed → drop it
  const mid = Math.floor(symbols.length / 2);
  return Promise.all([fetchChunk(symbols.slice(0, mid)), fetchChunk(symbols.slice(mid))]).then(([a, b]) => [...a, ...b]);
}

// Batch-fetch many symbols (chunks of `chunkSize`) in parallel. Yahoo's spark
// endpoint rejects large batches (HTTP 400 over ~20 symbols), so keep chunks small.
export async function fetchQuotes(symbols: string[], chunkSize = 12): Promise<Map<string, Quote>> {
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += chunkSize) chunks.push(symbols.slice(i, i + chunkSize));
  const results = await Promise.all(chunks.map((ch) => fetchChunk(ch)));
  return new Map(results.flat());
}
