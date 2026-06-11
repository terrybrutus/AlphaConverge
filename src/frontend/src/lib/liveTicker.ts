import { MICRO_SIGNAL } from "@/lib/convergence";
import type { MacroFacts } from "@/lib/macro";
import type { FundamentalData, SentimentData } from "@/lib/providers/finnhub";
import type { MicrostructureData } from "@/lib/providers/microstructure";
import { type Candle, computeTechnicals } from "@/lib/technicals";
import type { TickerRaw } from "@/types/ticker";

// Independent microstructure data requires options flow / short interest /
// dark-pool feeds, so every signal stays unavailable until one is connected.
// OBV is price-derived and belongs to the technical family.
const LIVE_MICRO_AVAILABILITY: Record<string, boolean> = {
  [MICRO_SIGNAL.unusualCall]: false,
  [MICRO_SIGNAL.shortFuel]: false,
  [MICRO_SIGNAL.darkPool]: false,
  [MICRO_SIGNAL.putCall]: false,
};

// Build a scorable TickerRaw from real price candles (and optionally real
// fundamentals / sentiment / macro). Categories without a connected source are
// marked unavailable so the engine scores them as "no source" rather than
// fabricating signals. As more live providers are wired, flip their availability
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
    microstructure?: MicrostructureData;
    macro?: MacroFacts;
  },
): TickerRaw {
  const tech = computeTechnicals(candles);
  const f = opts.fundamentals;
  const sent = opts.sentiment;
  const micro = opts.microstructure;
  const macro = opts.macro;
  const macroHasData =
    !!macro && Object.values(macro.availability).some(Boolean);

  const signalAvailability = {
    ...(f?.availability ?? {}),
    ...(sent?.availability ?? {}),
    ...(macro?.availability ?? {}),
    ...LIVE_MICRO_AVAILABILITY,
    ...(micro?.availability ?? {}),
  };

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
    shortInterestPct: micro?.fields.shortInterestPct ?? 0,

    unusualCallActivity: micro?.fields.unusualCallActivity ?? false,
    darkPoolAccumulation: micro?.fields.darkPoolAccumulation ?? false,
    putCallShift: micro?.fields.putCallShift ?? 0,
    obvRising: tech.obvRising, // price-derived technical signal

    // Sentiment — real where a source filled it; per-signal availability marks
    // the rest (Reddit, Google Trends) as "no data".
    redditMentionVelocity: sent?.fields.redditMentionVelocity ?? 0,
    newsSentiment: sent?.fields.newsSentiment ?? 0,
    analystUpgrade: sent?.fields.analystUpgrade ?? false,
    googleTrendsSlope: sent?.fields.googleTrendsSlope ?? 0,

    // Macro — real where a source filled it; sector narrative stays "no data".
    sectorEtfInflow: macro?.fields.sectorEtfInflow ?? 0,
    macroRiskOn: macro?.fields.macroRiskOn ?? false,
    sectorNarrative: false,

    impliedVolatilityPctile: micro?.fields.impliedVolatilityPctile ?? 0,
    instrumentDataAvailable:
      !!micro && Object.values(micro.availability).some(Boolean),

    sample: false,
    source: opts.source,
    availability: {
      technical: true,
      fundamental: !!f,
      microstructure: !!micro,
      sentiment: !!sent,
      macro: macroHasData,
    },
    signalAvailability,
  };
}
