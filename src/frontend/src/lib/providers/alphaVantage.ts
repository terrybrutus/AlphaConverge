import type { MarketDataProvider } from "@/lib/providers/types";
import type { Candle } from "@/lib/technicals";

// Alpha Vantage weekly-adjusted time series. Free tier: get a key in ~30s at
// https://www.alphavantage.co/support/#api-key (limited to ~25 requests/day).
// CORS is permitted, so this works directly from the browser.
interface AvWeeklyBar {
  "1. open": string;
  "2. high": string;
  "3. low": string;
  "4. close": string;
  "5. adjusted close"?: string;
  "6. volume"?: string;
  "5. volume"?: string;
}

interface AvResponse {
  "Weekly Adjusted Time Series"?: Record<string, AvWeeklyBar>;
  "Weekly Time Series"?: Record<string, AvWeeklyBar>;
  Note?: string;
  Information?: string;
  "Error Message"?: string;
}

export const alphaVantageProvider: MarketDataProvider = {
  name: "Alpha Vantage",
  requiresKey: true,

  async weeklyCandles(symbol: string, apiKey: string): Promise<Candle[]> {
    const sym = symbol.trim().toUpperCase();
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(apiKey)}`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch (e) {
      throw new Error(
        `Network error reaching Alpha Vantage: ${(e as Error).message}`,
      );
    }
    if (!res.ok) {
      throw new Error(`Alpha Vantage returned HTTP ${res.status}`);
    }
    const data = (await res.json()) as AvResponse;

    if (data["Error Message"]) {
      throw new Error(`Unknown symbol "${sym}" (Alpha Vantage rejected it).`);
    }
    if (data.Note || data.Information) {
      // Free-tier rate limit or informational throttle.
      throw new Error(
        data.Note ||
          data.Information ||
          "Alpha Vantage rate limit reached. Free keys allow ~25 requests/day.",
      );
    }

    const series =
      data["Weekly Adjusted Time Series"] || data["Weekly Time Series"];
    if (!series) {
      throw new Error(`No weekly data returned for "${sym}".`);
    }

    const candles: Candle[] = Object.entries(series)
      .map(([date, bar]) => {
        const close = Number(bar["5. adjusted close"] ?? bar["4. close"]);
        return {
          date,
          open: Number(bar["1. open"]),
          high: Number(bar["2. high"]),
          low: Number(bar["3. low"]),
          close,
          volume: Number(bar["6. volume"] ?? bar["5. volume"] ?? 0),
        };
      })
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
