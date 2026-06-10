import { MACRO_SIGNAL } from "@/lib/convergence";
import type { MarketDataProvider } from "@/lib/providers/types";
import type { Candle } from "@/lib/technicals";

// Macro / sector signals derived from real index + sector-ETF price action,
// fetched through the same price provider the user configured:
//   - macroRiskOn   : is the broad market (SPY) in an uptrend?
//   - sectorEtfInflow: is the stock's sector ETF outperforming SPY? (rotation proxy)
//   - sectorNarrative: no free, deterministic source — marked "no data".
//
// Benchmark candles (SPY + the sector ETFs) are shared across every ticker in a
// scan, so they're cached in-memory with a short TTL to avoid re-fetching.

export interface MacroFacts {
  fields: { sectorEtfInflow?: number; macroRiskOn?: boolean };
  availability: Record<string, boolean>;
}

const BENCH_TTL_MS = 6 * 3600 * 1000;
const benchCache = new Map<string, { candles: Candle[]; ts: number }>();

async function benchmark(
  provider: MarketDataProvider,
  key: string,
  symbol: string,
): Promise<Candle[]> {
  const hit = benchCache.get(symbol);
  if (hit && Date.now() - hit.ts < BENCH_TTL_MS) return hit.candles;
  const candles = await provider.weeklyCandles(symbol, key);
  benchCache.set(symbol, { candles, ts: Date.now() });
  return candles;
}

function avg(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}

// Uptrend: latest close above its ~20-week moving average.
function inUptrend(candles: Candle[]): boolean {
  const closes = candles.map((c) => c.close);
  if (closes.length < 20) return false;
  return closes[closes.length - 1] > avg(closes.slice(-20));
}

// Trailing return over `weeks`.
function trailingReturn(candles: Candle[], weeks: number): number {
  const closes = candles.map((c) => c.close);
  if (closes.length <= weeks) return 0;
  const past = closes[closes.length - 1 - weeks];
  return past > 0 ? (closes[closes.length - 1] - past) / past : 0;
}

// Map a Finnhub industry/sector string to a representative sector ETF.
const SECTOR_ETF: Record<string, string> = {
  Technology: "XLK",
  Semiconductors: "SMH",
  Software: "IGV",
  "Financial Services": "XLF",
  "Financial Services - Banks": "XLF",
  Banking: "XLF",
  Energy: "XLE",
  "Oil & Gas": "XLE",
  "Renewable Energy": "ICLN",
  Utilities: "XLU",
  Healthcare: "XLV",
  Biotechnology: "XBI",
  Pharmaceuticals: "XLV",
  Industrials: "XLI",
  "Aerospace & Defense": "ITA",
  "Consumer Cyclical": "XLY",
  "Auto Manufacturers": "XLY",
  Retail: "XLY",
  "Consumer Defensive": "XLP",
  "Communication Services": "XLC",
  Media: "XLC",
  "Real Estate": "XLRE",
  "Basic Materials": "XLB",
  Materials: "XLB",
};

export function mapSectorToEtf(sector?: string): string | undefined {
  if (!sector) return undefined;
  if (SECTOR_ETF[sector]) return SECTOR_ETF[sector];
  const lower = sector.toLowerCase();
  for (const [k, v] of Object.entries(SECTOR_ETF)) {
    if (lower.includes(k.toLowerCase())) return v;
  }
  return undefined;
}

export async function fetchMacro(
  provider: MarketDataProvider,
  key: string,
  sector?: string,
): Promise<MacroFacts> {
  const fields: MacroFacts["fields"] = {};
  const availability: Record<string, boolean> = {
    [MACRO_SIGNAL.sectorEtf]: false,
    [MACRO_SIGNAL.riskOn]: false,
    [MACRO_SIGNAL.narrative]: false, // no free deterministic source
  };

  // Broad-market risk-on read.
  let spy: Candle[] | undefined;
  try {
    spy = await benchmark(provider, key, "SPY");
    fields.macroRiskOn = inUptrend(spy);
    availability[MACRO_SIGNAL.riskOn] = true;
  } catch {
    spy = undefined;
  }

  // Sector rotation: sector ETF outperforming SPY over the last ~12 weeks.
  const etf = mapSectorToEtf(sector);
  if (etf && spy) {
    try {
      const sectorCandles = await benchmark(provider, key, etf);
      const rel = trailingReturn(sectorCandles, 12) - trailingReturn(spy, 12);
      // Scale relative strength to roughly -1..1 (a ~5pt edge ≈ 0.25).
      fields.sectorEtfInflow = Math.max(-1, Math.min(1, rel * 5));
      availability[MACRO_SIGNAL.sectorEtf] = true;
    } catch {
      // leave unavailable
    }
  }

  return { fields, availability };
}
