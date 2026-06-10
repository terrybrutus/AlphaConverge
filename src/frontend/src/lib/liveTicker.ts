import type { FundamentalData, SentimentData } from "@/lib/providers/finnhub";
import { type Candle, computeTechnicals } from "@/lib/technicals";
import type { TickerRaw } from "@/types/ticker";

// Build a scorable TickerRaw from real price candles (and optionally real
// fundamentals). Categories without a connected source are marked unavailable so
// the engine scores them as "no source" rather than fabricating signals. As more
// live providers are wired (sentiment, options, macro), flip their availability
// flags and fill the corresponding fields.
export function buildLiveTicker(
  symbol: string,
  candles: Candle[],
  opts: {
    name?: string;
    sector?: string;
    source: string;
    fundamentals?: FundamentalData;
    sentiment?: SentimentData;
  },
): TickerRaw {
  const tech = computeTechnicals(candles);
  const f = opts.fundamentals;
  const sent = opts.sentiment;

  const signalAvailability =
    f || sent
      ? { ...(f?.availability ?? {}), ...(sent?.availability ?? {}) }
      : undefined;

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

    // Fundamental — real where a source filled it; per-signal availability
    // (signalAvailability) marks the rest as "no data".
    revenueGrowthAccel: f?.fields.revenueGrowthAccel ?? 0,
    estimateRevision: f?.fields.estimateRevision ?? 0,
    peVs5yrAvg: f?.fields.peVs5yrAvg ?? 0,
    psVsSector: f?.fields.psVsSector ?? 0,
    insiderBuy90d: f?.fields.insiderBuy90d ?? false,
    instOwnershipChange: f?.fields.instOwnershipChange ?? 0,
    shortInterestPct: 0,

    unusualCallActivity: false,
    darkPoolAccumulation: false,
    putCallShift: 0,

    // Sentiment — real where a source filled it; per-signal availability marks
    // the rest (Reddit, Google Trends) as "no data".
    redditMentionVelocity: sent?.fields.redditMentionVelocity ?? 0,
    newsSentiment: sent?.fields.newsSentiment ?? 0,
    analystUpgrade: sent?.fields.analystUpgrade ?? false,
    googleTrendsSlope: sent?.fields.googleTrendsSlope ?? 0,

    sectorEtfInflow: 0,
    macroRiskOn: false,
    sectorNarrative: false,

    impliedVolatilityPctile: 0,

    sample: false,
    source: opts.source,
    availability: {
      technical: true,
      fundamental: !!f,
      microstructure: false,
      sentiment: !!sent,
      macro: false,
    },
    signalAvailability,
  };
}
