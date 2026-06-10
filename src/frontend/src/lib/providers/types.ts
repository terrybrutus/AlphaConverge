import type { Candle } from "@/lib/technicals";

// A market-data provider returns real OHLCV history for a symbol. Implementations
// run in the browser (per the project's architecture: the frontend fetches
// public market data, the canister stores watchlist/history). Swapping providers
// never touches the convergence engine.
export interface MarketDataProvider {
  readonly name: string;
  readonly requiresKey: boolean;
  // Weekly candles, oldest -> newest. Throws a descriptive Error on failure
  // (bad key, rate limit, unknown symbol, network).
  weeklyCandles(symbol: string, apiKey: string): Promise<Candle[]>;
}
