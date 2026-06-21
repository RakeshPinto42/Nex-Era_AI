// Competitor Intelligence — a competitive-quote database. Per competitor: price
// position vs us, competitive pressure (deal presence), activity, threat level.

import { uid } from "@/lib/utils";
import type { Recommendation, RiskLevel } from "./types";

export type Quote = {
  competitor: string;
  product: string;
  category: string;
  region: string;
  customer: string;
  quotedPrice: number;
  ourPrice: number;
  date: string; // ISO
  outcome: "Won" | "Lost"; // from our perspective
};

export type CompetitorProfile = {
  competitor: string;
  quotes: number;
  winRateVsUs: number; // % of these deals WE won
  pricePositionPct: number; // avg (theirs − ours)/ours
  activityScore: number; // recent-quote intensity 0-100
  threat: RiskLevel;
};

export type CompetitorIntelResult = {
  profiles: CompetitorProfile[];
  totalQuotes: number;
  recommendations: Recommendation[];
};

export function computeCompetitorIntel(quotes: Quote[] = COMPETITOR_QUOTES): CompetitorIntelResult {
  const byComp = new Map<string, Quote[]>();
  for (const q of quotes) byComp.set(q.competitor, [...(byComp.get(q.competitor) ?? []), q]);

  const maxN = Math.max(1, ...[...byComp.values()].map((q) => q.length));
  const profiles: CompetitorProfile[] = [...byComp.entries()].map(([competitor, qs]) => {
    const won = qs.filter((q) => q.outcome === "Won").length;
    const winRateVsUs = Math.round((won / qs.length) * 100);
    const pricePositionPct = Math.round((qs.reduce((s, q) => s + (q.quotedPrice - q.ourPrice) / q.ourPrice, 0) / qs.length) * 1000) / 10;
    const activityScore = Math.round((qs.length / maxN) * 100);
    // Threat: high activity + they beat us often + they undercut.
    const threatScore = activityScore * 0.4 + (100 - winRateVsUs) * 0.4 + (pricePositionPct < 0 ? 20 : 0);
    const threat: RiskLevel = threatScore >= 65 ? "High" : threatScore >= 45 ? "Medium" : "Low";
    return { competitor, quotes: qs.length, winRateVsUs, pricePositionPct, activityScore, threat };
  }).sort((a, b) => threatRank(b.threat) - threatRank(a.threat) || b.activityScore - a.activityScore);

  const recommendations: Recommendation[] = [];
  for (const p of profiles) {
    if (p.threat === "High") {
      recommendations.push({
        id: uid(),
        module: "competitor-intelligence",
        title: `Counter ${p.competitor} — ${p.threat} threat (${100 - p.winRateVsUs}% loss rate)`,
        rationale: `${p.quotes} quotes, prices ${p.pricePositionPct < 0 ? `${Math.abs(p.pricePositionPct)}% below us` : `${p.pricePositionPct}% above us`}. Deploy targeted defensive pricing on overlap accounts.`,
        risk: "High",
        priority: 55,
      });
    }
  }

  return { profiles, totalQuotes: quotes.length, recommendations };
}

const threatRank = (t: RiskLevel) => ({ Low: 0, Medium: 1, High: 2 })[t];

export const COMPETITOR_QUOTES: Quote[] = [
  { competitor: "CleanCo", product: "Tunnel System", category: "Tunnel", region: "Texas", customer: "Sparkle Wash", quotedPrice: 95000, ourPrice: 84000, date: "2026-05-12", outcome: "Lost" },
  { competitor: "CleanCo", product: "Tunnel System", category: "Tunnel", region: "Southeast", customer: "BrightCar", quotedPrice: 88000, ourPrice: 84000, date: "2026-05-28", outcome: "Won" },
  { competitor: "CleanCo", product: "Dryer", category: "Dryer", region: "West", customer: "ShineCo", quotedPrice: 8600, ourPrice: 9200, date: "2026-06-02", outcome: "Lost" },
  { competitor: "CleanCo", product: "Tunnel System", category: "Tunnel", region: "Midwest", customer: "AutoSpa", quotedPrice: 72000, ourPrice: 84000, date: "2026-06-09", outcome: "Lost" },
  { competitor: "HydroMax", product: "Water Reclaim", category: "Reclaim", region: "Southeast", customer: "EcoWash", quotedPrice: 17200, ourPrice: 17800, date: "2026-05-19", outcome: "Won" },
  { competitor: "HydroMax", product: "Service Contract", category: "Service", region: "Northeast", customer: "CityWash", quotedPrice: 3100, ourPrice: 2380, date: "2026-06-01", outcome: "Won" },
  { competitor: "HydroMax", product: "Water Reclaim", category: "Reclaim", region: "West", customer: "PureCar", quotedPrice: 16800, ourPrice: 17800, date: "2026-06-14", outcome: "Lost" },
  { competitor: "ChemPro", product: "Chemical Pack", category: "Chemical", region: "Texas", customer: "Sudsy", quotedPrice: 1340, ourPrice: 1020, date: "2026-05-22", outcome: "Won" },
  { competitor: "ChemPro", product: "Chemical Pack", category: "Chemical", region: "Midwest", customer: "FoamKing", quotedPrice: 1290, ourPrice: 1020, date: "2026-06-08", outcome: "Won" },
  { competitor: "AquaJet", product: "Tunnel System", category: "Tunnel", region: "Texas", customer: "JetWash", quotedPrice: 79000, ourPrice: 84000, date: "2026-06-11", outcome: "Lost" },
  { competitor: "AquaJet", product: "Dryer", category: "Dryer", region: "Southeast", customer: "QuickDry", quotedPrice: 7900, ourPrice: 9200, date: "2026-06-16", outcome: "Lost" },
];
