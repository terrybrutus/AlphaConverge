import { type Candle, computeTechnicals } from "@/lib/technicals";
import type { TickerRaw } from "@/types/ticker";

// Build a scorable TickerRaw from real price candles. Only the Technical
// category has data; the other four are marked unavailable so the engine scores
// them as "no source connected" rather than fabricating signals. As more live
// providers are wired (fundamentals, sentiment, options, macro), flip their
// availability flags and fill the corresponding fields.
export function buildLiveTicker(
  symbol: string,
  candles: Candle[],
  opts: { name?: string; sector?: string; source: string },
): TickerRaw {
  const tech = computeTechnicals(candles);

  return {
    symbol: symbol.toUpperCase(),
    name: opts.name ?? symbol.toUpperCase(),
    sector: opts.sector ?? "—",
    price: tech.price,
    priceHistory: tech.priceHistory,

    // Technical — real, computed from candles.
    pctAbove52wLow: tech.pctAbove52wLow,
    volumeContraction: tech.volumeContraction,
    weeklyBullishDivergence: tech.weeklyBullishDivergence,
    monthlyBullishDivergence: tech.monthlyBullishDivergence,
    firstHigherHigh: tech.firstHigherHigh,
    nearMajorSupport: tech.nearMajorSupport,

    // Other categories — no live source yet. Neutral values; availability marks
    // them as unknown so they never fire.
    revenueGrowthAccel: 0,
    estimateRevision: 0,
    peVs5yrAvg: 0,
    psVsSector: 0,
    insiderBuy90d: false,
    instOwnershipChange: 0,
    shortInterestPct: 0,

    unusualCallActivity: false,
    darkPoolAccumulation: false,
    putCallShift: 0,

    redditMentionVelocity: 0,
    newsSentiment: 0,
    analystUpgrade: false,
    googleTrendsSlope: 0,

    sectorEtfInflow: 0,
    macroRiskOn: false,
    sectorNarrative: false,

    impliedVolatilityPctile: 0,

    sample: false,
    source: opts.source,
    availability: {
      technical: true,
      fundamental: false,
      microstructure: false,
      sentiment: false,
      macro: false,
    },
  };
}
