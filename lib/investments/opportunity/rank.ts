// Opportunity Ranking Engine — scoring (Phase 6).
//
// Builds factor sub-scores from normalized market data (Market Intelligence
// Tool), composites them into a CONVICTION score (not price), explains the
// ranking, and buckets opportunities into categories. Deterministic, no advice.

import "server-only";
import { marketIntelligenceTool } from "@/lib/investments/market-intelligence";
import { symbolsFor } from "@/lib/investments/scanner/universe";
import type { NormalizedMarketData } from "@/lib/agents/stock-agent/market-data";
import type { MarketKey } from "@/lib/investments/scanner/types";
import type { FactorScores, Opportunity, RankCategory, OpportunityResult } from "./types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function factorsOf(d: NormalizedMarketData): FactorScores {
  const f = d.financials;
  const rs = d.technicals.sma200 ? (d.price / d.technicals.sma200 - 1) * 100 : 0;
  const pos = d.news.filter((n) => n.sentiment === "positive").length;
  const neg = d.news.filter((n) => n.sentiment === "negative").length;

  const businessQuality = f.grossMarginPct === 0 && f.netMarginPct === 0 ? 50 : clamp(f.netMarginPct * 3 + f.grossMarginPct * 0.4);
  const financialHealth =
    f.debtToEquity === 0 && f.freeCashFlow === 0
      ? 50
      : clamp((f.debtToEquity > 0 ? 100 - f.debtToEquity * 35 : 60) + (f.freeCashFlow > 0 ? 10 : f.freeCashFlow < 0 ? -15 : 0));
  const growth =
    f.revenueGrowthPct === 0 && d.growth.epsGrowthPct === 0 && d.growth.revenueCagr3yPct === 0
      ? 50
      : clamp(50 + ((f.revenueGrowthPct + d.growth.epsGrowthPct + d.growth.revenueCagr3yPct) / 3) * 2);
  const valuation = d.valuation.peRatio <= 0 ? 50 : clamp(100 - d.valuation.peRatio * 2.2 - d.valuation.priceToSales * 1.5);
  const technical = d.technicals.sma200 === 0 ? 50 : clamp(50 + rs * 1.5 - (d.technicals.rsi14 > 75 || d.technicals.rsi14 < 25 ? 10 : 0));
  const newsImpact = clamp(50 + (pos - neg) * 15);
  const risk = clamp(
    (d.financials.debtToEquity > 0 ? d.financials.debtToEquity * 20 : 10) +
      (d.technicals.rsi14 > 70 || d.technicals.rsi14 < 30 ? 20 : 0) +
      Math.abs(d.changePct) * 1.5 +
      (d.marketCap > 0 && d.marketCap < 2e9 ? 15 : 0),
  );

  return { businessQuality, financialHealth, growth, valuation, technical, newsImpact, risk };
}

function convictionOf(s: FactorScores): number {
  const positives =
    s.businessQuality * 0.2 +
    s.financialHealth * 0.18 +
    s.growth * 0.18 +
    s.valuation * 0.18 +
    s.technical * 0.13 +
    s.newsImpact * 0.13;
  return +clamp(positives - s.risk * 0.25).toFixed(1);
}

const FACTOR_LABEL: Record<keyof FactorScores, string> = {
  businessQuality: "business quality",
  financialHealth: "financial health",
  growth: "growth",
  valuation: "valuation",
  technical: "technical trend",
  newsImpact: "news impact",
  risk: "risk",
};

function reasonOf(s: FactorScores): string {
  const ranked = (Object.keys(s) as (keyof FactorScores)[])
    .filter((k) => k !== "risk")
    .sort((a, b) => s[b] - s[a]);
  const top = ranked.slice(0, 2).map((k) => `${FACTOR_LABEL[k]} (${Math.round(s[k])})`);
  const riskNote = s.risk >= 60 ? `; elevated risk (${Math.round(s.risk)})` : "";
  return `Ranked on ${top.join(" and ")}${riskNote}.`;
}

function catalystsOf(d: NormalizedMarketData, s: FactorScores): string[] {
  const out: string[] = [];
  if (d.earnings.nextDate) {
    const days = (+new Date(d.earnings.nextDate) - Date.now()) / 86400000;
    if (days >= 0 && days <= 14) out.push(`Earnings ${d.earnings.nextDate}`);
  }
  if (d.news.some((n) => n.sentiment === "positive")) out.push("Positive news flow");
  if (s.valuation >= 65 && s.growth >= 60) out.push("Growth at a reasonable price");
  if (s.technical >= 65) out.push("Constructive trend");
  return out.slice(0, 4);
}

function completeness(d: NormalizedMarketData): number {
  const checks = [
    d.financials.netMarginPct, d.financials.debtToEquity, d.financials.revenueGrowthPct,
    d.valuation.peRatio, d.technicals.sma200,
  ].filter((v) => v !== 0).length;
  return checks / 5;
}

export async function rankOpportunities(markets: MarketKey[]): Promise<OpportunityResult> {
  const targets = symbolsFor(markets);
  let mockData = false;

  const ops: Opportunity[] = [];
  const rows = await Promise.all(
    targets.map(async ({ market, symbol }) => {
      try {
        return { market, d: await marketIntelligenceTool.getNormalized(symbol) };
      } catch {
        return null;
      }
    }),
  );

  for (const row of rows) {
    if (!row) continue;
    const { market, d } = row;
    if (d.isMock) mockData = true;
    const factors = factorsOf(d);
    const conviction = convictionOf(factors);
    ops.push({
      ticker: d.ticker, company: d.company, sector: d.sector, market, currency: d.currency,
      price: d.price, changePct: d.changePct, marketCap: d.marketCap,
      factors, conviction,
      confidence: +clamp(0.45 + completeness(d) * 0.45 - (d.isMock ? 0.15 : 0), 0, 0.95).toFixed(2),
      catalysts: catalystsOf(d, factors),
      reason: reasonOf(factors),
      fromMock: d.isMock,
    });
  }

  ops.sort((a, b) => b.conviction - a.conviction);

  const byFactor = (k: keyof FactorScores, n = 6) => [...ops].sort((a, b) => b.factors[k] - a.factors[k]).slice(0, n);

  const allCategories: RankCategory[] = [
    { key: "todays_top", title: "Today's Top Opportunities", emoji: "🏆", items: ops.slice(0, 6) },
    { key: "best_value", title: "Best Value", emoji: "💎", items: byFactor("valuation") },
    { key: "highest_growth", title: "Highest Growth", emoji: "🌱", items: byFactor("growth") },
    { key: "momentum", title: "Momentum", emoji: "🚀", items: byFactor("technical") },
    {
      key: "turnarounds", title: "Turnarounds", emoji: "🔄",
      items: ops.filter((o) => {
        const lowBase = o.factors.valuation >= 55 || o.factors.technical < 45;
        return lowBase && o.changePct > 0;
      }).slice(0, 6),
    },
    { key: "dividend", title: "Dividend", emoji: "💰", items: ops.filter((o) => o.marketCap >= 50e9 && Math.abs(o.changePct) < 1.5).slice(0, 6) },
    { key: "small_cap", title: "Small Cap", emoji: "🐣", items: ops.filter((o) => o.marketCap > 0 && o.marketCap < 10e9).sort((a, b) => b.conviction - a.conviction).slice(0, 6) },
    { key: "large_cap", title: "Large Cap", emoji: "🏛", items: ops.filter((o) => o.marketCap >= 100e9).sort((a, b) => b.conviction - a.conviction).slice(0, 6) },
    { key: "ai_picks", title: "AI Picks", emoji: "🤖", items: [...ops].sort((a, b) => b.conviction * b.confidence - a.conviction * a.confidence).slice(0, 6) },
  ];
  const categories = allCategories.filter((c) => c.items.length > 0);

  return { asOf: new Date().toISOString(), scanned: ops.length, categories, mockData };
}
