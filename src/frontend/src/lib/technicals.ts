// Real technical-analysis computations derived from price candles.
//
// This is the engine that turns raw OHLCV history into the technical signal
// facts the convergence engine scores — replacing hand-set booleans with
// computed structure. Pure and deterministic so it can be unit-tested and run
// either in the browser or (later) inside a canister.

export interface Candle {
  date: string; // ISO, oldest -> newest ordering enforced by callers
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalFacts {
  price: number;
  priceHistory: number[]; // closes, oldest -> newest (trimmed for charting)
  pctAbove52wLow: number;
  volumeContraction: number; // 0..1
  weeklyBullishDivergence: boolean;
  monthlyBullishDivergence: boolean;
  firstHigherHigh: boolean;
  nearMajorSupport: boolean;
}

// Wilder's RSI. Returns an array aligned to `closes` (first `period` entries
// are seeded and less meaningful).
export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = new Array(closes.length).fill(50);
  if (closes.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const g = diff >= 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

// Indices of local price troughs (swing lows): a bar lower than `w` neighbours
// on each side.
function swingLows(lows: number[], w = 2): number[] {
  const idx: number[] = [];
  for (let i = w; i < lows.length - w; i++) {
    let isLow = true;
    for (let j = i - w; j <= i + w; j++) {
      if (lows[j] < lows[i]) {
        isLow = false;
        break;
      }
    }
    if (isLow) idx.push(i);
  }
  return idx;
}

function swingHighs(highs: number[], w = 2): number[] {
  const idx: number[] = [];
  for (let i = w; i < highs.length - w; i++) {
    let isHigh = true;
    for (let j = i - w; j <= i + w; j++) {
      if (highs[j] > highs[i]) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) idx.push(i);
  }
  return idx;
}

// Bullish divergence: the two most recent swing lows show price making a lower
// low while RSI makes a higher low — selling pressure exhausting.
function bullishDivergence(lows: number[], closes: number[]): boolean {
  const r = rsi(closes);
  const lowIdx = swingLows(lows);
  if (lowIdx.length < 2) return false;
  const a = lowIdx[lowIdx.length - 2];
  const b = lowIdx[lowIdx.length - 1];
  const priceLowerLow = lows[b] < lows[a];
  const rsiHigherLow = r[b] > r[a] + 1; // small buffer to avoid noise
  return priceLowerLow && rsiHigherLow;
}

// Aggregate ~4 weekly candles into one "monthly" candle for the higher
// timeframe divergence check.
function toMonthly(weekly: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < weekly.length; i += 4) {
    const chunk = weekly.slice(i, i + 4);
    if (chunk.length === 0) continue;
    out.push({
      date: chunk[chunk.length - 1].date,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + c.volume, 0),
    });
  }
  return out;
}

export function computeTechnicals(weekly: Candle[]): TechnicalFacts {
  const closes = weekly.map((c) => c.close);
  const lows = weekly.map((c) => c.low);
  const highs = weekly.map((c) => c.high);
  const volumes = weekly.map((c) => c.volume);
  const price = closes[closes.length - 1];

  // % above the 52-week low (last ~52 weekly bars)
  const window = weekly.slice(-52);
  const low52 = Math.min(...window.map((c) => c.low));
  const pctAbove52wLow = low52 > 0 ? ((price - low52) / low52) * 100 : 0;

  // Volume contraction: recent 8-week avg vs the prior 8-week avg, expressed as
  // a 0..1 dry-up score (1 = volume fully collapsed vs before).
  const recentVol = avg(volumes.slice(-8));
  const priorVol = avg(volumes.slice(-16, -8));
  const volumeContraction =
    priorVol > 0 ? clamp01(1 - recentVol / priorVol) : 0;

  // First higher high: most recent swing high exceeds the prior swing high.
  const highIdx = swingHighs(highs);
  let firstHigherHigh = false;
  if (highIdx.length >= 2) {
    const a = highIdx[highIdx.length - 2];
    const b = highIdx[highIdx.length - 1];
    firstHigherHigh = highs[b] > highs[a];
  }

  // Near major support: within 6% of the 52-week low.
  const nearMajorSupport = low52 > 0 && (price - low52) / low52 <= 0.06;

  return {
    price,
    priceHistory: closes.slice(-30),
    pctAbove52wLow,
    volumeContraction,
    weeklyBullishDivergence: bullishDivergence(lows, closes),
    monthlyBullishDivergence: (() => {
      const m = toMonthly(weekly);
      return bullishDivergence(
        m.map((c) => c.low),
        m.map((c) => c.close),
      );
    })(),
    firstHigherHigh,
    nearMajorSupport,
  };
}

function avg(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
