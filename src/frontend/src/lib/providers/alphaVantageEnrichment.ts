import { FUND_SIGNAL, MICRO_SIGNAL, SENT_SIGNAL } from "@/lib/convergence";
import { MODEL_SIGNAL } from "@/lib/modelSignals";
import type { FundamentalData, SentimentData } from "@/lib/providers/finnhub";
import {
  emptyFundamentalAvailability,
  emptySentimentAvailability,
  revenueAcceleration,
} from "@/lib/providers/fundamentals";
import {
  type MicrostructureData,
  emptyMicroAvailability,
} from "@/lib/providers/microstructure";

const BASE = "https://www.alphavantage.co/query";

function withinDays(date: string | undefined, days: number): boolean {
  if (!date) return false;
  const observed = new Date(`${date.slice(0, 10)}T00:00:00Z`).getTime();
  return (
    Number.isFinite(observed) &&
    Date.now() - observed <= days * 24 * 60 * 60 * 1000
  );
}

async function query(
  params: Record<string, string>,
  apiKey: string,
): Promise<Record<string, unknown>> {
  const search = new URLSearchParams({ ...params, apikey: apiKey });
  const response = await fetch(`${BASE}?${search.toString()}`);
  if (!response.ok)
    throw new Error(`Alpha Vantage returned HTTP ${response.status}.`);
  const data = (await response.json()) as Record<string, unknown>;
  if (data.Note || data.Information || data["Error Message"]) {
    throw new Error(
      String(data.Note ?? data.Information ?? data["Error Message"]),
    );
  }
  return data;
}

export async function fetchAlphaVantageFundamentals(
  symbol: string,
  apiKey: string,
): Promise<FundamentalData> {
  const fields: FundamentalData["fields"] = {};
  const availability = emptyFundamentalAvailability();
  const data = await query(
    { function: "INCOME_STATEMENT", symbol: symbol.toUpperCase() },
    apiKey,
  );
  const reports = (data.quarterlyReports ?? []) as Array<{
    fiscalDateEnding?: string;
    totalRevenue?: string;
    operatingIncome?: string;
  }>;
  const acceleration = revenueAcceleration(
    reports.map((report) => Number(report.totalRevenue)),
  );
  if (
    acceleration !== undefined &&
    withinDays(reports[0]?.fiscalDateEnding, 150)
  ) {
    fields.revenueGrowthAccel = acceleration;
    availability[FUND_SIGNAL.revAccel] = true;
  }
  const latest = reports[0];
  const yearAgo = reports[4];
  const latestRevenue = Number(latest?.totalRevenue);
  const latestOperating = Number(latest?.operatingIncome);
  const yearAgoRevenue = Number(yearAgo?.totalRevenue);
  const yearAgoOperating = Number(yearAgo?.operatingIncome);
  if (
    latestRevenue > 0 &&
    yearAgoRevenue > 0 &&
    Number.isFinite(latestOperating) &&
    Number.isFinite(yearAgoOperating) &&
    withinDays(latest?.fiscalDateEnding, 150)
  ) {
    fields.operatingMarginAccel =
      (latestOperating / latestRevenue - yearAgoOperating / yearAgoRevenue) *
      100;
    availability[MODEL_SIGNAL.profitability] = true;
  }
  try {
    const earnings = await query(
      { function: "EARNINGS", symbol: symbol.toUpperCase() },
      apiKey,
    );
    const latestEarning = (
      earnings.quarterlyEarnings as
        | Array<{ reportedDate?: string; surprisePercentage?: string }>
        | undefined
    )?.[0];
    const surprise = Number(latestEarning?.surprisePercentage);
    if (
      Number.isFinite(surprise) &&
      withinDays(latestEarning?.reportedDate, 70)
    ) {
      fields.earningsSurprisePct = surprise;
      availability[MODEL_SIGNAL.catalyst] = true;
    }
  } catch {
    // Preserve the statement-derived facts when the earnings call is limited.
  }
  return { fields, availability };
}

export async function fetchAlphaVantageSentiment(
  symbol: string,
  apiKey: string,
): Promise<SentimentData> {
  const fields: SentimentData["fields"] = {};
  const availability = emptySentimentAvailability();
  const data = await query(
    {
      function: "NEWS_SENTIMENT",
      tickers: symbol.toUpperCase(),
      limit: "50",
    },
    apiKey,
  );
  const feed = (data.feed ?? []) as Array<{
    ticker_sentiment?: Array<{
      ticker?: string;
      ticker_sentiment_score?: string;
    }>;
  }>;
  const scores = feed
    .flatMap((item) => item.ticker_sentiment ?? [])
    .filter((item) => item.ticker === symbol.toUpperCase())
    .map((item) => Number(item.ticker_sentiment_score))
    .filter(Number.isFinite);
  if (scores.length > 0) {
    fields.newsSentiment =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    availability[SENT_SIGNAL.news] = true;
  }
  return { fields, availability };
}

export async function fetchAlphaVantageMicrostructure(
  symbol: string,
  apiKey: string,
): Promise<MicrostructureData> {
  const fields: MicrostructureData["fields"] = {};
  const availability = emptyMicroAvailability();
  const data = await query(
    { function: "REALTIME_OPTIONS", symbol: symbol.toUpperCase() },
    apiKey,
  );
  const rows = (data.data ?? []) as Array<{
    type?: string;
    volume?: string;
    open_interest?: string;
  }>;
  if (rows.length > 0) {
    const calls = rows.filter((row) => row.type?.toLowerCase() === "call");
    const puts = rows.filter((row) => row.type?.toLowerCase() === "put");
    const volume = (values: typeof rows) =>
      values.reduce((sum, row) => sum + Number(row.volume ?? 0), 0);
    const openInterest = (values: typeof rows) =>
      values.reduce((sum, row) => sum + Number(row.open_interest ?? 0), 0);
    const callVolume = volume(calls);
    const putVolume = volume(puts);
    fields.unusualCallActivity =
      callVolume > 0 && callVolume / Math.max(1, openInterest(calls)) >= 1.5;
    fields.putCallShift =
      callVolume + putVolume > 0
        ? (putVolume - callVolume) / (putVolume + callVolume)
        : 0;
    availability[MICRO_SIGNAL.unusualCall] = true;
    availability[MICRO_SIGNAL.putCall] = true;
  }
  return { fields, availability };
}
