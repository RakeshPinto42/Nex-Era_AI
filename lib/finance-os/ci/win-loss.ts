// Win/Loss Analytics — why we win and lose. Win/loss rates, loss drivers,
// competitor head-to-head and price sensitivity (the maximum premium we can
// sustain over a competitor before win-rate collapses). Pure, browser-only.

import { uid } from "@/lib/utils";
import type { Recommendation } from "./types";

export type ClosedDeal = {
  competitor: string;
  customer: string;
  product: string;
  region: string;
  pricePremiumPct: number; // our price vs competitor, % (positive = we're pricier)
  reason: string;
  outcome: "Won" | "Lost";
};

export type PremiumBand = { label: string; lo: number; hi: number; total: number; won: number; winRate: number };

export type WinLossResult = {
  total: number;
  winRate: number;
  lossRate: number;
  lossDrivers: { reason: string; count: number }[];
  competitors: { competitor: string; total: number; winRate: number }[];
  premiumBands: PremiumBand[];
  maxSustainablePremiumPct: number; // highest band still winning >50%
  recommendations: Recommendation[];
};

const BANDS: { label: string; lo: number; hi: number }[] = [
  { label: "≤0% (cheaper)", lo: -Infinity, hi: 0 },
  { label: "0–5%", lo: 0, hi: 5 },
  { label: "5–10%", lo: 5, hi: 10 },
  { label: "10–15%", lo: 10, hi: 15 },
  { label: ">15%", lo: 15, hi: Infinity },
];

export function computeWinLoss(deals: ClosedDeal[] = CLOSED_DEALS): WinLossResult {
  const total = deals.length;
  const won = deals.filter((d) => d.outcome === "Won").length;
  const winRate = total ? Math.round((won / total) * 100) : 0;

  const lossDrivers = tally(deals.filter((d) => d.outcome === "Lost").map((d) => d.reason)).sort((a, b) => b.count - a.count);

  const competitors = [...new Set(deals.map((d) => d.competitor))]
    .map((competitor) => {
      const ds = deals.filter((d) => d.competitor === competitor);
      const w = ds.filter((d) => d.outcome === "Won").length;
      return { competitor, total: ds.length, winRate: Math.round((w / ds.length) * 100) };
    })
    .sort((a, b) => a.winRate - b.winRate);

  const premiumBands: PremiumBand[] = BANDS.map((b) => {
    const ds = deals.filter((d) => d.pricePremiumPct >= b.lo && d.pricePremiumPct < b.hi);
    const w = ds.filter((d) => d.outcome === "Won").length;
    return { label: b.label, lo: b.lo, hi: b.hi, total: ds.length, won: w, winRate: ds.length ? Math.round((w / ds.length) * 100) : 0 };
  });

  // Highest premium band that still wins >50%.
  const sustaining = premiumBands.filter((b) => b.total > 0 && b.winRate > 50);
  const maxBand = sustaining[sustaining.length - 1];
  const maxSustainablePremiumPct = maxBand ? (Number.isFinite(maxBand.hi) ? maxBand.hi : maxBand.lo) : 0;

  const recommendations: Recommendation[] = [];
  if (lossDrivers[0]) {
    recommendations.push({
      id: uid(),
      module: "win-loss",
      title: `Attack top loss driver: ${lossDrivers[0].reason} (${lossDrivers[0].count} losses)`,
      rationale: `Most common reason we lose. ${lossDrivers[0].reason === "Price" ? "Tighten discount authority and lead with value." : "Build a targeted play for this objection."}`,
      risk: "Medium",
      priority: 48,
    });
  }
  if (maxBand) {
    recommendations.push({
      id: uid(),
      module: "win-loss",
      title: `Hold premium ≤ ${Number.isFinite(maxBand.hi) ? maxBand.hi + "%" : maxBand.label} vs competitors`,
      rationale: `Win-rate stays above 50% up to this premium; beyond it we lose. Set guardrails for sales.`,
      risk: "Low",
      priority: 40,
    });
  }
  const weakest = competitors[0];
  if (weakest && weakest.winRate < 50) {
    recommendations.push({
      id: uid(),
      module: "win-loss",
      title: `Build a counter-play for ${weakest.competitor} (${weakest.winRate}% win rate)`,
      rationale: `We lose more than we win against them — our weakest competitor matchup.`,
      risk: "Medium",
      priority: 38,
    });
  }

  return { total, winRate, lossRate: 100 - winRate, lossDrivers, competitors, premiumBands, maxSustainablePremiumPct, recommendations };
}

function tally(items: string[]): { reason: string; count: number }[] {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return [...m.entries()].map(([reason, count]) => ({ reason, count }));
}

export const CLOSED_DEALS: ClosedDeal[] = [
  { competitor: "CleanCo", customer: "Sparkle Wash", product: "Tunnel", region: "Texas", pricePremiumPct: -12, reason: "Price", outcome: "Lost" },
  { competitor: "CleanCo", customer: "BrightCar", product: "Tunnel", region: "Southeast", pricePremiumPct: 4, reason: "Won on features", outcome: "Won" },
  { competitor: "CleanCo", customer: "AutoSpa", product: "Tunnel", region: "Midwest", pricePremiumPct: 16, reason: "Price", outcome: "Lost" },
  { competitor: "CleanCo", customer: "MetroWash", product: "Dryer", region: "West", pricePremiumPct: 7, reason: "Won on service", outcome: "Won" },
  { competitor: "HydroMax", customer: "EcoWash", product: "Reclaim", region: "Southeast", pricePremiumPct: 3, reason: "Won on features", outcome: "Won" },
  { competitor: "HydroMax", customer: "PureCar", product: "Reclaim", region: "West", pricePremiumPct: 6, reason: "Relationship", outcome: "Won" },
  { competitor: "HydroMax", customer: "CityWash", product: "Service", region: "Northeast", pricePremiumPct: -23, reason: "Price", outcome: "Won" },
  { competitor: "ChemPro", customer: "Sudsy", product: "Chemical", region: "Texas", pricePremiumPct: 9, reason: "Lead time", outcome: "Lost" },
  { competitor: "ChemPro", customer: "FoamKing", product: "Chemical", region: "Midwest", pricePremiumPct: 11, reason: "Price", outcome: "Lost" },
  { competitor: "AquaJet", customer: "JetWash", product: "Tunnel", region: "Texas", pricePremiumPct: 6, reason: "Won on features", outcome: "Won" },
  { competitor: "AquaJet", customer: "QuickDry", product: "Dryer", region: "Southeast", pricePremiumPct: 14, reason: "Price", outcome: "Lost" },
  { competitor: "AquaJet", customer: "RapidWash", product: "Tunnel", region: "West", pricePremiumPct: 2, reason: "Won on price", outcome: "Won" },
];
