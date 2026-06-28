// Per-account price alerts, stored in localStorage and evaluated client-side
// whenever fresh prices load. No server / push infra — a triggered alert shows an
// in-page banner (and a browser notification if the user granted permission).

export type AlertDir = "above" | "below";
export type Alert = {
  id: string;
  key: string; // matches the asset key used in the tables (crypto id / ticker)
  name: string;
  currency: string;
  target: number;
  dir: AlertDir;
  createdAt: number;
  triggeredAt?: number;
};

export function loadAlerts(storeKey: string): Alert[] {
  try {
    const raw = localStorage.getItem(storeKey);
    return raw ? (JSON.parse(raw) as Alert[]) : [];
  } catch {
    return [];
  }
}

export function saveAlerts(storeKey: string, alerts: Alert[]): void {
  try {
    localStorage.setItem(storeKey, JSON.stringify(alerts));
  } catch {
    /* quota / unavailable */
  }
}

// Check each un-triggered alert against the current price; mark hits as triggered.
export function evaluate(
  alerts: Alert[],
  priceFor: (key: string) => number | undefined,
): { next: Alert[]; fired: Alert[] } {
  const fired: Alert[] = [];
  const next = alerts.map((a) => {
    if (a.triggeredAt) return a;
    const p = priceFor(a.key);
    if (p == null) return a;
    const hit = a.dir === "above" ? p >= a.target : p <= a.target;
    if (hit) {
      const t = { ...a, triggeredAt: Date.now() };
      fired.push(t);
      return t;
    }
    return a;
  });
  return { next, fired };
}
