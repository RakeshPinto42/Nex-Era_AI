// Multi-Agent Consensus — PRIVATE specialists (Phase 7).
//
// Each specialist reasons over one lens of the normalized market data and
// returns a score/confidence with evidence + concerns. Internal only — never
// exposed as user-facing agents. Deterministic, data-grounded.

import type { NormalizedMarketData } from "@/lib/agents/stock-agent/market-data";
import type { SpecialistVerdict, SpecialistId } from "./types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const has = (...v: number[]) => v.some((x) => x !== 0);

function fundamental(d: NormalizedMarketData): SpecialistVerdict {
  const f = d.financials;
  const present = has(f.grossMarginPct, f.netMarginPct, f.debtToEquity, f.revenueGrowthPct);
  const score = clamp(
    50 + f.netMarginPct * 1.5 + f.grossMarginPct * 0.2 - (f.debtToEquity > 1.5 ? (f.debtToEquity - 1.5) * 15 : 0) + f.revenueGrowthPct,
  );
  const evidence: string[] = [];
  if (f.netMarginPct) evidence.push(`Net margin ${f.netMarginPct.toFixed(1)}%`);
  if (f.grossMarginPct) evidence.push(`Gross margin ${f.grossMarginPct.toFixed(1)}%`);
  if (f.revenueGrowthPct) evidence.push(`Revenue growth ${f.revenueGrowthPct.toFixed(1)}%`);
  const concerns: string[] = [];
  if (f.debtToEquity > 1.5) concerns.push(`High leverage (D/E ${f.debtToEquity})`);
  if (f.netMarginPct && f.netMarginPct < 5) concerns.push("Thin margins");
  if (!present) concerns.push("Limited fundamental data");
  return { id: "fundamental", name: "Fundamental Specialist", score, confidence: present ? 0.8 : 0.4, evidence, concerns };
}

function technical(d: NormalizedMarketData): SpecialistVerdict {
  const t = d.technicals;
  const present = t.sma200 !== 0;
  const rs = t.sma200 ? (d.price / t.sma200 - 1) * 100 : 0;
  const score = clamp(50 + rs * 1.5 - (t.rsi14 > 75 || t.rsi14 < 25 ? 12 : 0));
  const evidence: string[] = [];
  if (present) evidence.push(`${rs >= 0 ? "Above" : "Below"} 200-day SMA (${rs.toFixed(1)}%)`);
  evidence.push(`RSI(14) ${t.rsi14}`);
  const concerns: string[] = [];
  if (rs < 0) concerns.push("Downtrend vs long-term average");
  if (t.rsi14 > 75) concerns.push("Overbought");
  if (t.rsi14 < 25) concerns.push("Oversold / falling knife risk");
  return { id: "technical", name: "Technical Specialist", score, confidence: present ? 0.75 : 0.4, evidence, concerns };
}

function valuation(d: NormalizedMarketData): SpecialistVerdict {
  const v = d.valuation;
  const present = v.peRatio > 0;
  const score = present ? clamp(100 - v.peRatio * 2.2 - v.priceToSales * 1.5) : 50;
  const evidence: string[] = [];
  if (present) evidence.push(`P/E ${v.peRatio}`);
  if (v.priceToSales) evidence.push(`P/S ${v.priceToSales}`);
  if (v.evToEbitda) evidence.push(`EV/EBITDA ${v.evToEbitda}`);
  const concerns: string[] = [];
  if (present && v.peRatio > 30) concerns.push("Rich earnings multiple");
  if (!present) concerns.push("No earnings multiple available");
  return { id: "valuation", name: "Valuation Specialist", score, confidence: present ? 0.8 : 0.35, evidence, concerns };
}

function news(d: NormalizedMarketData): SpecialistVerdict {
  const pos = d.news.filter((n) => n.sentiment === "positive").length;
  const neg = d.news.filter((n) => n.sentiment === "negative").length;
  const score = clamp(50 + (pos - neg) * 15);
  const evidence = d.news.slice(0, 3).map((n) => `${n.title} (${n.sentiment})`);
  const concerns: string[] = [];
  if (neg > pos) concerns.push("Negative headline skew");
  if (d.news.length === 0) concerns.push("No recent news");
  return { id: "news", name: "News Specialist", score, confidence: d.news.length ? 0.6 : 0.3, evidence, concerns };
}

function macro(d: NormalizedMarketData): SpecialistVerdict {
  // No macro feed yet — reason from sector posture + volatility.
  const cyclical = /energy|financial|consumer cyclical|materials/i.test(d.sector);
  const defensive = /health|utilit|staple|consumer defensive/i.test(d.sector);
  const score = clamp(50 + (defensive ? 8 : 0) - (cyclical ? 8 : 0) - Math.abs(d.changePct));
  const evidence = [`Sector: ${d.sector}`];
  const concerns: string[] = [];
  if (cyclical) concerns.push("Cyclical sector — macro-sensitive");
  concerns.push("Macro data feed not yet integrated");
  return { id: "macro", name: "Macro Specialist", score, confidence: 0.4, evidence, concerns };
}

function risk(d: NormalizedMarketData): SpecialistVerdict {
  const riskScore =
    (d.financials.debtToEquity > 0 ? d.financials.debtToEquity * 20 : 10) +
    (d.technicals.rsi14 > 70 || d.technicals.rsi14 < 30 ? 20 : 0) +
    Math.abs(d.changePct) * 1.5 +
    (d.marketCap > 0 && d.marketCap < 2e9 ? 15 : 0);
  const score = clamp(100 - riskScore); // higher score = lower risk
  const evidence = [`Leverage D/E ${d.financials.debtToEquity}`, `Daily move ${d.changePct.toFixed(1)}%`];
  const concerns: string[] = [];
  if (d.financials.debtToEquity > 1.5) concerns.push("Balance-sheet leverage");
  if (Math.abs(d.changePct) >= 5) concerns.push("Elevated volatility");
  if (d.marketCap > 0 && d.marketCap < 2e9) concerns.push("Small-cap liquidity risk");
  return { id: "risk", name: "Risk Specialist", score, confidence: 0.7, evidence, concerns };
}

function portfolio(d: NormalizedMarketData, holdings: string[]): SpecialistVerdict {
  const held = holdings.map((h) => h.toUpperCase());
  const owns = held.includes(d.ticker.toUpperCase());
  // Diversification benefit is higher if the sector/name isn't already held.
  const score = clamp(owns ? 40 : 65);
  const evidence = [owns ? "Already held — adds concentration" : "Adds a new position"];
  const concerns: string[] = [];
  if (owns) concerns.push("Increases concentration in an existing holding");
  if (held.length === 0) concerns.push("No portfolio context provided");
  return { id: "portfolio", name: "Portfolio Specialist", score, confidence: held.length ? 0.6 : 0.35, evidence, concerns };
}

export const SPECIALIST_WEIGHT: Record<SpecialistId, number> = {
  fundamental: 0.22, valuation: 0.18, technical: 0.15, risk: 0.15, news: 0.12, macro: 0.1, portfolio: 0.08,
};

export function runSpecialists(d: NormalizedMarketData, holdings: string[] = []): SpecialistVerdict[] {
  return [fundamental(d), technical(d), valuation(d), news(d), macro(d), risk(d), portfolio(d, holdings)];
}
