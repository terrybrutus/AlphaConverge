import { FUND_SIGNAL, SENT_SIGNAL } from "@/lib/convergence";
import type { FundamentalData, SentimentData } from "@/lib/providers/finnhub";

export function mergeFundamentals(
  ...sources: Array<FundamentalData | undefined>
): FundamentalData | undefined {
  const usable = sources.filter(
    (source): source is FundamentalData => !!source,
  );
  if (usable.length === 0) return undefined;
  const availability: Record<string, boolean> = {};
  for (const source of usable) {
    for (const [signal, available] of Object.entries(source.availability)) {
      availability[signal] = !!availability[signal] || available;
    }
  }
  return {
    fields: Object.assign({}, ...usable.map((source) => source.fields)),
    availability,
  };
}

export function mergeSentiment(
  ...sources: Array<SentimentData | undefined>
): SentimentData | undefined {
  const usable = sources.filter((source): source is SentimentData => !!source);
  if (usable.length === 0) return undefined;
  const availability: Record<string, boolean> = {};
  for (const source of usable) {
    for (const [signal, available] of Object.entries(source.availability)) {
      availability[signal] = !!availability[signal] || available;
    }
  }
  return {
    fields: Object.assign({}, ...usable.map((source) => source.fields)),
    availability,
  };
}

export function emptyFundamentalAvailability(): Record<string, boolean> {
  return {
    [FUND_SIGNAL.revAccel]: false,
    [FUND_SIGNAL.estRev]: false,
    [FUND_SIGNAL.peHist]: false,
    [FUND_SIGNAL.psSector]: false,
    [FUND_SIGNAL.insider]: false,
    [FUND_SIGNAL.inst]: false,
  };
}

export function emptySentimentAvailability(): Record<string, boolean> {
  return {
    [SENT_SIGNAL.reddit]: false,
    [SENT_SIGNAL.news]: false,
    [SENT_SIGNAL.trends]: false,
  };
}

export function revenueAcceleration(
  revenues: Array<number | undefined>,
): number | undefined {
  if (
    revenues.length < 6 ||
    revenues.slice(0, 6).some((revenue) => !revenue || revenue <= 0)
  ) {
    return undefined;
  }
  const [latest, prior, , , yearAgo, priorYearAgo] = revenues as number[];
  const latestGrowth = ((latest - yearAgo) / yearAgo) * 100;
  const priorGrowth = ((prior - priorYearAgo) / priorYearAgo) * 100;
  return latestGrowth - priorGrowth;
}
