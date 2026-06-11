import { FUND_SIGNAL, SENT_SIGNAL } from "@/lib/convergence";
import type { FundamentalData, SentimentData } from "@/lib/providers/finnhub";
import {
  emptyFundamentalAvailability,
  emptySentimentAvailability,
  revenueAcceleration,
} from "@/lib/providers/fundamentals";

const BASE = "https://www.alphavantage.co/query";

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
    totalRevenue?: string;
  }>;
  const acceleration = revenueAcceleration(
    reports.map((report) => Number(report.totalRevenue)),
  );
  if (acceleration !== undefined) {
    fields.revenueGrowthAccel = acceleration;
    availability[FUND_SIGNAL.revAccel] = true;
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
