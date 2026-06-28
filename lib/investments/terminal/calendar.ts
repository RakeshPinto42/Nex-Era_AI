// Live Market Terminal — economic calendar (Phase 5).
// Static reference events (no economic-data provider integrated yet). Dated
// relative to "now" so the widget always shows an upcoming week.

import type { EconEvent } from "./types";

export function economicCalendar(): EconEvent[] {
  const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  return [
    { date: day(1), time: "08:30", title: "US Initial Jobless Claims", importance: "medium", region: "US" },
    { date: day(2), time: "14:00", title: "FOMC Meeting Minutes", importance: "high", region: "US" },
    { date: day(3), time: "08:30", title: "US CPI (Inflation)", importance: "high", region: "US" },
    { date: day(4), time: "05:30", title: "India WPI Inflation", importance: "medium", region: "IN" },
    { date: day(5), time: "08:30", title: "US Retail Sales", importance: "medium", region: "US" },
    { date: day(6), time: "10:00", title: "EU Consumer Confidence", importance: "low", region: "EU" },
  ];
}
