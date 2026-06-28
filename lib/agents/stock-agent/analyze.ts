// Stock Agent — investment research reasoning (Investment Hub Phase 1).
//
// Reasons over NORMALIZED market data (from the Market Intelligence Tool) using
// the AI Router. Never calls market providers, never predicts prices, never
// recommends buy/sell. Deterministic fallback derives insights from the data
// when no model is configured.

import "server-only";
import { completeWithFallback, type ChatMsg } from "@/lib/llm/infer";
import type { NormalizedMarketData } from "./market-data";
import type { InvestmentInsights } from "./types";

const SYSTEM = `You are the Investment Intelligence Agent — an enterprise, evidence-based investment RESEARCH engine.
You reason over NORMALIZED market data provided to you. You produce structured research, NOT advice.

STRICT RULES:
- NEVER recommend buying or selling. NEVER predict prices. NEVER execute trades.
- Use ONLY the supplied data. Every conclusion must trace back to it. Do not invent figures.
- Present balanced bull/bear/base cases.

Return ONLY a JSON object (no prose, no code fences) with these string keys:
companySummary, businessQuality, economicMoat, financialHealth, growth, profitability,
valuation, technicalOutlook, newsSummary, bullCase, bearCase, baseCase, investmentThesis
and these string[] keys: catalysts, risks.`;

function stripJson(raw: string): string {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  return a !== -1 && b !== -1 ? s.slice(a, b + 1) : s;
}

function reviewDate(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function shell(d: NormalizedMarketData): Pick<
  InvestmentInsights,
  "ticker" | "company" | "exchange" | "sector" | "industry" | "dataFreshness" | "suggestedNextAgents" | "fromMockData"
> {
  return {
    ticker: d.ticker,
    company: d.company,
    exchange: d.exchange,
    sector: d.sector,
    industry: d.industry,
    dataFreshness: `${d.freshness} · as of ${d.asOf.slice(0, 10)} · ${d.dataPoints} data points${d.isMock ? " · MOCK" : ""}`,
    suggestedNextAgents: ["commentary", "research"],
    fromMockData: d.isMock,
  };
}

// ---- deterministic fallback ----

function fallback(d: NormalizedMarketData): InvestmentInsights {
  const f = d.financials;
  const trend = d.technicals.sma50 >= d.technicals.sma200 ? "above" : "below";
  const cap = `$${(d.marketCap / 1e9).toFixed(1)}B`;
  return {
    ...shell(d),
    companySummary: `${d.company} (${d.ticker}) trades on ${d.exchange} in the ${d.sector} sector (${d.industry}), market cap ${cap}.`,
    businessQuality: `Gross margin ${f.grossMarginPct}% and net margin ${f.netMarginPct}% per supplied data.`,
    economicMoat: `Not assessable beyond supplied margins (${f.grossMarginPct}% gross).`,
    financialHealth: `Total debt $${(f.totalDebt / 1e9).toFixed(1)}B, debt/equity ${f.debtToEquity}, free cash flow $${(f.freeCashFlow / 1e9).toFixed(1)}B.`,
    growth: `Revenue growth ${f.revenueGrowthPct}%, 3y revenue CAGR ${d.growth.revenueCagr3yPct}%, EPS growth ${d.growth.epsGrowthPct}%.`,
    profitability: `Net margin ${f.netMarginPct}% on revenue $${(f.revenue / 1e9).toFixed(1)}B.`,
    valuation: `P/E ${d.valuation.peRatio}, PEG ${d.valuation.pegRatio}, P/S ${d.valuation.priceToSales}, EV/EBITDA ${d.valuation.evToEbitda}.`,
    technicalOutlook: `Price ${d.price} is ${trend} the 200-day SMA (${d.technicals.sma200}); RSI(14) ${d.technicals.rsi14}; 52w range ${d.technicals.low52w}–${d.technicals.high52w}.`,
    newsSummary: d.news.map((n) => `${n.title} (${n.sentiment})`).join("; "),
    catalysts: [`Next earnings ${d.earnings.nextDate}`, ...d.news.filter((n) => n.sentiment === "positive").map((n) => n.title)].slice(0, 5),
    risks: [
      f.debtToEquity > 1.5 ? "Elevated leverage (debt/equity > 1.5)." : "Leverage within supplied range.",
      d.technicals.rsi14 > 70 ? "RSI suggests overbought." : d.technicals.rsi14 < 30 ? "RSI suggests oversold." : "Momentum neutral.",
      ...d.news.filter((n) => n.sentiment === "negative").map((n) => n.title),
    ].slice(0, 5),
    bullCase: `If revenue growth (${f.revenueGrowthPct}%) and margins (${f.netMarginPct}%) hold, the supplied valuation may be supported.`,
    bearCase: `If growth decelerates or leverage (${f.debtToEquity}) pressures cash flow, the valuation looks stretched.`,
    baseCase: `Mixed: ${trend === "above" ? "constructive" : "cautious"} technicals against ${d.valuation.peRatio} P/E.`,
    investmentThesis: `Research-only view of ${d.ticker} based on supplied normalized data; no recommendation.`,
    confidence: d.isMock ? 0.35 : 0.55,
    suggestedHoldingPeriod: "Review-driven (not advice)",
    suggestedReviewDate: reviewDate(30),
    mode: "fallback",
  };
}

function coerce(p: Record<string, unknown>, d: NormalizedMarketData): InvestmentInsights {
  const s = (k: string) => String(p[k] ?? "");
  const a = (k: string) => (Array.isArray(p[k]) ? (p[k] as unknown[]).map(String).slice(0, 6) : []);
  return {
    ...shell(d),
    companySummary: s("companySummary"),
    businessQuality: s("businessQuality"),
    economicMoat: s("economicMoat"),
    financialHealth: s("financialHealth"),
    growth: s("growth"),
    profitability: s("profitability"),
    valuation: s("valuation"),
    technicalOutlook: s("technicalOutlook"),
    newsSummary: s("newsSummary"),
    catalysts: a("catalysts"),
    risks: a("risks"),
    bullCase: s("bullCase"),
    bearCase: s("bearCase"),
    baseCase: s("baseCase"),
    investmentThesis: s("investmentThesis"),
    confidence: d.isMock ? 0.5 : 0.75,
    suggestedHoldingPeriod: "Review-driven (not advice)",
    suggestedReviewDate: reviewDate(30),
    mode: "ai",
  };
}

/** Reason over normalized market data → structured Investment Insights. */
export async function analyzeStock(data: NormalizedMarketData): Promise<InvestmentInsights> {
  const messages: ChatMsg[] = [{ role: "user", content: JSON.stringify(data) }];
  let routed: { text: string } | null = null;
  try {
    routed = await completeWithFallback(SYSTEM, messages, undefined, { maxTokens: 1800 });
  } catch {
    routed = null;
  }
  if (!routed) return fallback(data);
  try {
    return coerce(JSON.parse(stripJson(routed.text)) as Record<string, unknown>, data);
  } catch {
    return fallback(data);
  }
}
