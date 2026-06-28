// Processing Personality Engine — selection logic. Weighted rolls (ultra-rare
// ~0.7%, funny ~2.5%), no immediate repeat, avoid the last 20 shown. Pure.

import { MESSAGES, FUNNY, ULTRA_RARE, type ProcessingCategory } from "./messages";

const ULTRA_RARE_P = 0.007;
const FUNNY_P = 0.025;
const HISTORY_WINDOW = 20;

function pickFrom(pool: string[], history: string[]): string {
  const recent = new Set(history.slice(-HISTORY_WINDOW));
  const fresh = pool.filter((m) => !recent.has(m));
  const candidates = fresh.length ? fresh : pool.filter((m) => m !== history[history.length - 1]);
  const list = candidates.length ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)];
}

/** Pick the next message for a category, honoring weights + no-repeat history. */
export function nextMessage(category: ProcessingCategory, history: string[]): string {
  const roll = Math.random();
  if (roll < ULTRA_RARE_P) return pickFrom(ULTRA_RARE, history);
  if (roll < ULTRA_RARE_P + FUNNY_P) return pickFrom(FUNNY, history);
  return pickFrom(MESSAGES[category] ?? MESSAGES.general, history);
}

/** Map a routed intent / task hint to a processing category. */
export function categoryForIntent(intent?: string | null): ProcessingCategory {
  const i = (intent ?? "").toLowerCase();
  if (/cod|engineer|refactor|bug|implement/.test(i)) return "coding";
  if (/financ|fpa|commission|pricing|forecast|budget|margin/.test(i)) return "finance";
  if (/invest|market|stock|portfolio|ticker|equity/.test(i)) return "investment";
  if (/research|search|source|cite|web/.test(i)) return "research";
  if (/knowledge|memory|graph/.test(i)) return "knowledge";
  if (/file|folder|workspace|repo/.test(i)) return "filesystem";
  if (/hermes|orchestr|plan|agent/.test(i)) return "hermes";
  if (/tool/.test(i)) return "tool_runtime";
  if (/valid|verify|check|test/.test(i)) return "validation";
  if (/route|model/.test(i)) return "ai_router";
  return "general";
}
