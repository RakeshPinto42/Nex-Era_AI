// Small technical-analysis toolkit computed from daily price history. Used to
// turn raw prices into investable signals: RSI (momentum/overbought), moving
// averages (trend), and ATR (volatility → stop/target sizing).

export function sma(arr: number[], n: number): number | null {
  if (arr.length < n) return null;
  let s = 0;
  for (let i = arr.length - n; i < arr.length; i++) s += arr[i];
  return s / n;
}

// Wilder-style RSI over the last `period` changes (simple average variant).
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch >= 0) gains += ch;
    else losses -= ch;
  }
  const avgG = gains / period;
  const avgL = losses / period;
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
}

// Average True Range — typical daily move, for stop/target distance.
export function atr(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    trs.push(tr);
  }
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

export function recentLow(lows: number[], n = 20): number | null {
  if (!lows.length) return null;
  return Math.min(...lows.slice(-n));
}
export function recentHigh(highs: number[], n = 20): number | null {
  if (!highs.length) return null;
  return Math.max(...highs.slice(-n));
}
