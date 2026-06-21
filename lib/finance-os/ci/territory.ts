// Territory Intelligence — regional revenue, margin, win-rate, coverage and growth
// potential. Recommends where to invest, expand and add sales coverage.

import { uid } from "@/lib/utils";
import type { Recommendation, RiskLevel } from "./types";

export type Territory = {
  region: string;
  revenue: number;
  marginPct: number;
  winRate: number; // %
  pipeline: number;
  reps: number;
  marketSize: number; // addressable revenue in region
};

export type TerritoryRow = Territory & {
  coveragePct: number; // revenue / marketSize
  whiteSpace: number; // marketSize − revenue
  growthPotential: RiskLevel; // High/Medium/Low
};

export type TerritoryResult = {
  rows: TerritoryRow[];
  totalWhiteSpace: number;
  recommendations: Recommendation[];
};

export function computeTerritory(territories: Territory[] = TERRITORIES): TerritoryResult {
  const rows: TerritoryRow[] = territories.map((t) => {
    const coveragePct = t.marketSize ? Math.round((t.revenue / t.marketSize) * 1000) / 10 : 0;
    const whiteSpace = Math.max(0, t.marketSize - t.revenue);
    const potential = whiteSpace / Math.max(1, t.marketSize);
    const growthPotential: RiskLevel = potential > 0.6 ? "High" : potential > 0.4 ? "Medium" : "Low";
    return { ...t, coveragePct, whiteSpace, growthPotential };
  });

  const totalWhiteSpace = rows.reduce((s, r) => s + r.whiteSpace, 0);

  const recommendations: Recommendation[] = [];
  // Invest: big white space + healthy win rate.
  const invest = [...rows].filter((r) => r.growthPotential === "High" && r.winRate >= 40).sort((a, b) => b.whiteSpace - a.whiteSpace)[0];
  if (invest) {
    recommendations.push({
      id: uid(),
      module: "territory-intelligence",
      title: `Expand coverage in ${invest.region} — ${invest.coveragePct}% penetrated`,
      rationale: `$${fmt(invest.whiteSpace)} white space with a ${invest.winRate}% win rate. Highest-ROI place to add reps.`,
      revenueImpact: Math.round(invest.whiteSpace * 0.2),
      marginGain: Math.round(invest.whiteSpace * 0.2 * (invest.marginPct / 100)),
      risk: "Medium",
      priority: 52,
    });
  }
  // Under-covered: low coverage, few reps.
  const thin = [...rows].filter((r) => r.coveragePct < 25 && r.reps <= 2).sort((a, b) => a.coveragePct - b.coveragePct)[0];
  if (thin && thin.region !== invest?.region) {
    recommendations.push({
      id: uid(),
      module: "territory-intelligence",
      title: `Add sales coverage in ${thin.region} (${thin.reps} reps, ${thin.coveragePct}% covered)`,
      rationale: `Under-resourced for its $${fmt(thin.marketSize)} market.`,
      risk: "Medium",
      priority: 36,
    });
  }

  return { rows, totalWhiteSpace, recommendations };
}

const fmt = (n: number) => Math.round(n).toLocaleString();

export const TERRITORIES: Territory[] = [
  { region: "Texas", revenue: 9_200_000, marginPct: 31, winRate: 48, pipeline: 3_400_000, reps: 4, marketSize: 24_000_000 },
  { region: "Southeast", revenue: 11_800_000, marginPct: 29, winRate: 52, pipeline: 2_900_000, reps: 6, marketSize: 21_000_000 },
  { region: "Midwest", revenue: 6_100_000, marginPct: 27, winRate: 39, pipeline: 1_800_000, reps: 2, marketSize: 18_000_000 },
  { region: "West", revenue: 8_400_000, marginPct: 33, winRate: 45, pipeline: 2_600_000, reps: 3, marketSize: 19_500_000 },
  { region: "Northeast", revenue: 6_500_000, marginPct: 30, winRate: 43, pipeline: 1_500_000, reps: 2, marketSize: 16_000_000 },
];
