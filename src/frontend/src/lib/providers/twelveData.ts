import type { MarketDataProvider } from "@/lib/providers/types";
import type { Candle } from "@/lib/technicals";

// Twelve Data weekly time series. Free tier: ~800 requests/day, 8/min, CORS
// permitted — much higher daily ceiling than Alpha Vantage, which makes scanning
// a curated universe viable. Get a free key at https://twelvedata.com/pricing.
interface TdValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
}

interface TdResponse {
  values?: TdValue[];
  status?: string;
  code?: number;
  message?: string;
}

const REQUEST_INTERVAL_MS = 8_000;
let nextRequestAt = 0;
let requestGate = Promise.resolve();

// Every Twelve Data request, including SPY and sector-ETF benchmark calls,
// passes through one browser-side queue. This is safer than pacing only between
// tickers because a single ticker analysis can require multiple price requests.
async function rateLimitedFetch(url: string): Promise<Response> {
  let release = () => {};
  const previous = requestGate;
  requestGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    const wait = Math.max(0, nextRequestAt - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
    return await fetch(url);
  } finally {
    release();
  }
}

export const twelveDataProvider: MarketDataProvider = {
  name: "Twelve Data",
  requiresKey: true,

  async weeklyCandles(symbol: string, apiKey: string): Promise<Candle[]> {
    const sym = symbol.trim().toUpperCase();
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(sym)}&interval=1week&outputsize=5000&apikey=${encodeURIComponent(apiKey)}`;

    let res: Response;
    try {
      res = await rateLimitedFetch(url);
    } catch (e) {
      throw new Error(
        `Network error reaching Twelve Data: ${(e as Error).message}`,
      );
    }
    if (!res.ok && res.status !== 400 && res.status !== 429) {
      throw new Error(`Twelve Data returned HTTP ${res.status}`);
    }
    const data = (await res.json().catch(() => ({}))) as TdResponse;

    if (data.status === "error" || data.code) {
      const msg = data.message || "Twelve Data request failed.";
      if (data.code === 429 || /limit/i.test(msg)) {
        throw new Error(
          "Twelve Data rate limit reached (free tier: 8/min, 800/day).",
        );
      }
      if (data.code === 401)
        throw new Error("Twelve Data rejected the API key.");
      if (/not found|invalid symbol/i.test(msg))
        throw new Error(`Unknown symbol "${sym}".`);
      throw new Error(msg);
    }

    const values = data.values ?? [];
    const candles: Candle[] = values
      .map((v) => ({
        date: v.datetime,
        open: Number(v.open),
        high: Number(v.high),
        low: Number(v.low),
        close: Number(v.close),
        volume: Number(v.volume ?? 0),
      }))
      // API returns newest-first; sort oldest -> newest.
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    if (candles.length < 30) {
      throw new Error(
        `Only ${candles.length} weeks of data for "${sym}" — not enough to analyze.`,
      );
    }
    return candles;
  },
};
