// Market Position — where we stand vs competitors. Market/revenue ranking,
// competitive position (share × growth), opportunity share. Pure, browser-only.

import { uid } from "@/lib/utils";
import type { Recommendation } from "./types";

export type MarketPlayer = { name: string; us?: boolean; revenue: number; growthPct: number; winRate: number };
export type ShareTrendPoint = { month: string; us: number; leader: number };

export const MARKET_PLAYERS: MarketPlayer[] = [
  { name: "NEXERA (Us)", us: true, revenue: 42_000_000, growthPct: 12, winRate: 46 },
  { name: "CleanCo", revenue: 61_000_000, growthPct: 6, winRate: 52 },
  { name: "HydroMax", revenue: 38_000_000, growthPct: 9, winRate: 41 },
  { name: "ChemPro", revenue: 19_000_000, growthPct: 3, winRate: 34 },
  { name: "AquaJet", revenue: 12_000_000, growthPct: 18, winRate: 38 },
];

export const SHARE_TREND: ShareTrendPoint[] = [
  { month: "Jan", us: 22.1, leader: 35.0 },
  { month: "Feb", us: 22.8, leader: 34.6 },
  { month: "Mar", us: 23.4, leader: 34.1 },
  { month: "Apr", us: 24.0, leader: 33.8 },
  { month: "May", us: 24.6, leader: 33.2 },
  { month: "Jun", us: 25.3, leader: 32.7 },
];

const OUR_OPPORTUNITY_SHARE = 31; // % of total open pipeline value

export type RankedPlayer = MarketPlayer & { sharePct: number; rank: number };

export type MarketPositionResult = {
  players: RankedPlayer[];
  ourShare: number;
  ourRank: number;
  leader: RankedPlayer;
  opportunityShare: number;
  recommendations: Recommendation[];
};

export function computeMarketPosition(players: MarketPlayer[] = MARKET_PLAYERS): MarketPositionResult {
  const total = players.reduce((s, p) => s + p.revenue, 0);
  const ranked = [...players]
    .map((p) => ({ ...p, sharePct: total ? (p.revenue / total) * 100 : 0, rank: 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  const us = ranked.find((p) => p.us)!;
  const leader = ranked[0];
  const avgGrowth = players.reduce((s, p) => s + p.growthPct, 0) / players.length;

  const recommendations: Recommendation[] = [];
  if (us.growthPct > avgGrowth) {
    recommendations.push({
      id: uid(),
      module: "market-position",
      title: `Press share advantage — growing ${us.growthPct}% vs ${avgGrowth.toFixed(0)}% market`,
      rationale: `Share up to ${us.sharePct.toFixed(1)}% (#${us.rank}). Reinvest in fastest-growing segments to close on ${leader.name}.`,
      revenueImpact: Math.round((leader.revenue - us.revenue) * 0.15),
      risk: "Medium",
      priority: 60,
    });
  }
  const fastRival = ranked.filter((p) => !p.us).sort((a, b) => b.growthPct - a.growthPct)[0];
  if (fastRival && fastRival.growthPct > us.growthPct) {
    recommendations.push({
      id: uid(),
      module: "market-position",
      title: `Defend against ${fastRival.name} (+${fastRival.growthPct}% growth)`,
      rationale: `Fastest-growing rival is taking share. Tighten competitive pricing where they overlap us.`,
      risk: "Medium",
      priority: 45,
    });
  }

  return { players: ranked, ourShare: us.sharePct, ourRank: us.rank, leader, opportunityShare: OUR_OPPORTUNITY_SHARE, recommendations };
}
