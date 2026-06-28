// Market Intelligence Tool — provider adapters.
//
// Each adapter fetches from ONE external source and returns a partial of the
// unified NormalizedMarketData schema. The gateway (index.ts) runs them with
// failover + enrichment. Keyless providers (Yahoo, CoinGecko, Google News RSS,
// SEC EDGAR) are always available; keyed providers activate only when their env
// var is set. Reuses the repo's existing Yahoo helpers — no duplicate provider
// integration.

import "server-only";
import { fetchQuotes, fetchFundamentals } from "@/lib/investments/yahoo";
import { rateGate } from "./cache";
import type { NormalizedMarketData, NewsImpact } from "@/lib/agents/stock-agent/market-data";

export type AssetKind = "equity" | "crypto";

export type ProviderPartial = Partial<
  Omit<NormalizedMarketData, "valuation" | "financials" | "growth" | "technicals" | "earnings">
> & {
  valuation?: Partial<NormalizedMarketData["valuation"]>;
  financials?: Partial<NormalizedMarketData["financials"]>;
  growth?: Partial<NormalizedMarketData["growth"]>;
  technicals?: Partial<NormalizedMarketData["technicals"]>;
  earnings?: Partial<NormalizedMarketData["earnings"]>;
};

export type Provider = {
  name: string;
  kinds: AssetKind[];
  enabled: () => boolean;
  fetch: (ticker: string, kind: AssetKind) => Promise<ProviderPartial | null>;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function jget(url: string, headers: Record<string, string> = {}, ms = 12_000): Promise<unknown> {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(ms),
  });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
const numv = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const parse = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
};

// ---- technicals from a close series ----

function sma(c: number[], n: number): number {
  const s = c.slice(-n);
  return s.length ? +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(2) : 0;
}
function rsi(c: number[], n = 14): number {
  if (c.length < n + 1) return 50;
  let gain = 0, loss = 0;
  for (let i = c.length - n; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  if (loss === 0) return 100;
  const rs = gain / n / (loss / n);
  return +(100 - 100 / (1 + rs)).toFixed(1);
}

// ---- Yahoo (keyless, reuses lib/investments/yahoo) ----

const yahoo: Provider = {
  name: "Yahoo",
  kinds: ["equity"],
  enabled: () => true,
  async fetch(ticker) {
    await rateGate("yahoo", 250);
    const [quotes, funds] = await Promise.all([fetchQuotes([ticker]), fetchFundamentals([ticker])]);
    const q = quotes.get(ticker);
    if (!q) return null;
    const f = funds.get(ticker);
    const c = q.closes;
    return {
      ticker,
      company: ticker,
      exchange: q.currency === "INR" ? "NSE" : "—",
      currency: q.currency,
      price: q.price,
      changePct: q.d24 ?? 0,
      marketCap: f?.mcap ?? 0,
      valuation: { peRatio: f?.pe ?? 0 },
      financials: {},
      growth: {},
      technicals: {
        sma50: sma(c, 50),
        sma200: sma(c, 200),
        rsi14: rsi(c, 14),
        high52w: +Math.max(...c).toFixed(2),
        low52w: +Math.min(...c).toFixed(2),
      },
      earnings: { lastEps: f?.eps ?? 0 },
      dataPoints: c.length,
    };
  },
};

// ---- CoinGecko (keyless) ----

const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin", XRP: "ripple",
  ADA: "cardano", DOGE: "dogecoin", AVAX: "avalanche-2", DOT: "polkadot", MATIC: "matic-network",
};

const coingecko: Provider = {
  name: "CoinGecko",
  kinds: ["crypto"],
  enabled: () => true,
  async fetch(ticker) {
    await rateGate("coingecko", 1500);
    const sym = ticker.replace(/-?USDT?$/i, "").toUpperCase();
    let id = COIN_IDS[sym];
    if (!id) {
      try {
        const s = (await jget(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(sym)}`)) as {
          coins?: { id: string; symbol: string }[];
        };
        id = s.coins?.find((c) => c.symbol.toUpperCase() === sym)?.id ?? s.coins?.[0]?.id ?? "";
      } catch {
        id = "";
      }
    }
    if (!id) return null;
    const rows = (await jget(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}&sparkline=true&price_change_percentage=24h`,
    )) as Array<{
      symbol: string; name: string; current_price: number; market_cap: number;
      price_change_percentage_24h?: number; sparkline_in_7d?: { price?: number[] };
      high_24h?: number; low_24h?: number;
    }>;
    const r = rows?.[0];
    if (!r) return null;
    const c = r.sparkline_in_7d?.price ?? [];
    return {
      ticker: sym,
      company: r.name,
      exchange: "Crypto",
      sector: "Crypto",
      industry: "Digital Asset",
      currency: "USD",
      price: r.current_price,
      changePct: r.price_change_percentage_24h ?? 0,
      marketCap: r.market_cap ?? 0,
      technicals: c.length
        ? { sma50: sma(c, 50), sma200: sma(c, c.length), rsi14: rsi(c, 14), high52w: +Math.max(...c).toFixed(2), low52w: +Math.min(...c).toFixed(2) }
        : undefined,
      dataPoints: c.length,
    };
  },
};

// ---- Financial Modeling Prep (free key) ----

const fmp: Provider = {
  name: "FMP",
  kinds: ["equity"],
  enabled: () => !!process.env.FMP_API_KEY,
  async fetch(ticker) {
    await rateGate("fmp", 350);
    const key = process.env.FMP_API_KEY!;
    const [profileArr, ratiosArr] = await Promise.all([
      jget(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${key}`).catch(() => null),
      jget(`https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}?apikey=${key}`).catch(() => null),
    ]);
    const p = Array.isArray(profileArr) ? (profileArr[0] as Record<string, unknown>) : null;
    const ra = Array.isArray(ratiosArr) ? (ratiosArr[0] as Record<string, unknown>) : null;
    if (!p && !ra) return null;
    return {
      company: p ? String(p.companyName ?? "") : undefined,
      exchange: p ? String(p.exchangeShortName ?? "") : undefined,
      sector: p ? String(p.sector ?? "") : undefined,
      industry: p ? String(p.industry ?? "") : undefined,
      marketCap: p ? numv(p.mktCap) : undefined,
      valuation: {
        peRatio: ra ? numv(ra.peRatioTTM) : undefined,
        priceToSales: ra ? numv(ra.priceToSalesRatioTTM) : undefined,
      } as ProviderPartial["valuation"],
      financials: {
        grossMarginPct: ra ? (numv(ra.grossProfitMarginTTM) ?? 0) * 100 : undefined,
        netMarginPct: ra ? (numv(ra.netProfitMarginTTM) ?? 0) * 100 : undefined,
        debtToEquity: ra ? numv(ra.debtEquityRatioTTM) : undefined,
      } as ProviderPartial["financials"],
    };
  },
};

// ---- Alpha Vantage (free key) ----

const alphaVantage: Provider = {
  name: "AlphaVantage",
  kinds: ["equity"],
  enabled: () => !!process.env.ALPHAVANTAGE_API_KEY,
  async fetch(ticker) {
    await rateGate("alphavantage", 1500);
    const key = process.env.ALPHAVANTAGE_API_KEY!;
    const d = (await jget(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${key}`)) as Record<string, unknown>;
    if (!d || !d.Symbol) return null;
    return {
      company: String(d.Name ?? ""),
      exchange: String(d.Exchange ?? ""),
      sector: String(d.Sector ?? ""),
      industry: String(d.Industry ?? ""),
      marketCap: parse(d.MarketCapitalization),
      valuation: {
        peRatio: parse(d.PERatio),
        pegRatio: parse(d.PEGRatio),
        priceToSales: parse(d.PriceToSalesRatioTTM),
        evToEbitda: parse(d.EVToEBITDA),
      } as ProviderPartial["valuation"],
      financials: {
        revenue: parse(d.RevenueTTM),
        netMarginPct: (parse(d.ProfitMargin) ?? 0) * 100,
      } as ProviderPartial["financials"],
      earnings: { lastEps: parse(d.EPS) } as ProviderPartial["earnings"],
    };
  },
};

// ---- Finnhub (free key) ----

const finnhub: Provider = {
  name: "Finnhub",
  kinds: ["equity"],
  enabled: () => !!process.env.FINNHUB_API_KEY,
  async fetch(ticker) {
    await rateGate("finnhub", 1100);
    const key = process.env.FINNHUB_API_KEY!;
    const [prof, metric] = await Promise.all([
      jget(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${key}`).catch(() => null),
      jget(`https://finnhub.io/api/v1/stock/metric?symbol=${ticker}&metric=all&token=${key}`).catch(() => null),
    ]);
    const p = prof as Record<string, unknown> | null;
    const m = (metric as { metric?: Record<string, unknown> } | null)?.metric ?? null;
    if (!p && !m) return null;
    return {
      company: p ? String(p.name ?? "") : undefined,
      exchange: p ? String(p.exchange ?? "") : undefined,
      industry: p ? String(p.finnhubIndustry ?? "") : undefined,
      marketCap: p ? numv(p.marketCapitalization) : undefined,
      valuation: { peRatio: m ? numv(m.peTTM) : undefined, priceToSales: m ? numv(m.psTTM) : undefined } as ProviderPartial["valuation"],
      financials: { netMarginPct: m ? numv(m.netProfitMarginTTM) : undefined } as ProviderPartial["financials"],
      technicals: m ? ({ high52w: numv(m["52WeekHigh"]), low52w: numv(m["52WeekLow"]) } as ProviderPartial["technicals"]) : undefined,
    };
  },
};

// ---- SEC EDGAR (keyless, best-effort revenue) ----

let cikMap: Record<string, string> | null = null;
const secEdgar: Provider = {
  name: "SEC",
  kinds: ["equity"],
  enabled: () => true,
  async fetch(ticker) {
    await rateGate("sec", 400);
    try {
      if (!cikMap) {
        const raw = (await jget("https://www.sec.gov/files/company_tickers.json")) as Record<string, { ticker: string; cik_str: number }>;
        cikMap = {};
        for (const v of Object.values(raw)) cikMap[v.ticker.toUpperCase()] = String(v.cik_str).padStart(10, "0");
      }
      const cik = cikMap[ticker.toUpperCase()];
      if (!cik) return null;
      const facts = (await jget(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/Revenues.json`)) as {
        units?: { USD?: { val: number; end: string }[] };
      };
      const usd = facts.units?.USD;
      const latest = usd && usd.length ? usd[usd.length - 1] : null;
      if (!latest) return null;
      return { financials: { revenue: latest.val } as ProviderPartial["financials"] };
    } catch {
      return null;
    }
  },
};

// ---- Google News RSS (keyless) ----

function clean(s: string): string {
  return s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
}
const POS = /(beat|surge|jump|rise|gain|record|upgrade|growth|profit|strong)/i;
const NEG = /(miss|fall|drop|plunge|cut|downgrade|loss|weak|lawsuit|probe|decline)/i;

export async function fetchNews(query: string): Promise<NewsImpact[]> {
  try {
    await rateGate("news", 300);
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return [];
    const xml = await r.text();
    const items = xml.split("<item>").slice(1, 6);
    return items.map((it) => {
      const title = clean((it.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim());
      const date = (it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();
      const source = clean((it.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "").trim()) || "Google News";
      const sentiment: NewsImpact["sentiment"] = POS.test(title) ? "positive" : NEG.test(title) ? "negative" : "neutral";
      return { title, source, date: date ? new Date(date).toISOString().slice(0, 10) : "", sentiment };
    }).filter((n) => n.title);
  } catch {
    return [];
  }
}

/** Provider chains by asset kind, in priority/failover order. */
export const EQUITY_PROVIDERS: Provider[] = [yahoo, fmp, alphaVantage, finnhub, secEdgar];
export const CRYPTO_PROVIDERS: Provider[] = [coingecko];
