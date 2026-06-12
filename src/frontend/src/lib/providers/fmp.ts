import { FUND_SIGNAL } from "@/lib/convergence";
import { MODEL_SIGNAL } from "@/lib/modelSignals";
import type { FundamentalData } from "@/lib/providers/finnhub";
import {
  emptyFundamentalAvailability,
  revenueAcceleration,
} from "@/lib/providers/fundamentals";

const BASE = "https://financialmodelingprep.com/stable";

function withinDays(date: string | undefined, days: number): boolean {
  if (!date) return false;
  const observed = new Date(`${date.slice(0, 10)}T00:00:00Z`).getTime();
  return (
    Number.isFinite(observed) &&
    Date.now() - observed <= days * 24 * 60 * 60 * 1000
  );
}

async function getJson(path: string, apiKey: string): Promise<unknown> {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(
    `${BASE}/${path}${separator}apikey=${encodeURIComponent(apiKey)}`,
  );
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "FMP rejected the key or this endpoint is not in its plan.",
    );
  }
  if (response.status === 429) throw new Error("FMP rate limit reached.");
  if (!response.ok) throw new Error(`FMP returned HTTP ${response.status}.`);
  return response.json();
}

export async function fetchFmpFundamentals(
  symbol: string,
  apiKey: string,
): Promise<FundamentalData> {
  const sym = encodeURIComponent(symbol.toUpperCase());
  const fields: FundamentalData["fields"] = {};
  const availability = emptyFundamentalAvailability();

  try {
    const rows = (await getJson(
      `income-statement?symbol=${sym}&period=quarter&limit=8`,
      apiKey,
    )) as Array<{
      date?: string;
      revenue?: number;
      operatingIncome?: number;
    }>;
    const acceleration = revenueAcceleration(rows.map((row) => row.revenue));
    if (acceleration !== undefined && withinDays(rows[0]?.date, 150)) {
      fields.revenueGrowthAccel = acceleration;
      availability[FUND_SIGNAL.revAccel] = true;
    }
    const latest = rows[0];
    const yearAgo = rows[4];
    if (
      latest?.revenue &&
      latest.operatingIncome !== undefined &&
      yearAgo?.revenue &&
      yearAgo.operatingIncome !== undefined &&
      withinDays(latest.date, 150)
    ) {
      fields.operatingMarginAccel =
        (latest.operatingIncome / latest.revenue -
          yearAgo.operatingIncome / yearAgo.revenue) *
        100;
      availability[MODEL_SIGNAL.profitability] = true;
    }
  } catch {
    // Plan-gated or unavailable remains unknown.
  }

  try {
    const rows = (await getJson(
      `ratios?symbol=${sym}&period=annual&limit=6`,
      apiKey,
    )) as Array<{ priceToEarningsRatio?: number; priceEarningsRatio?: number }>;
    const values = rows
      .map((row) => row.priceToEarningsRatio ?? row.priceEarningsRatio)
      .filter((value): value is number => !!value && value > 0);
    if (values.length >= 3) {
      const current = values[0];
      const historical =
        values.slice(1).reduce((sum, value) => sum + value, 0) /
        values.slice(1).length;
      fields.peVs5yrAvg = current / historical;
      availability[FUND_SIGNAL.peHist] = true;
    }
  } catch {
    // Plan-gated or unavailable remains unknown.
  }

  try {
    const rows = (await getJson(
      `earnings-surprises?symbol=${sym}`,
      apiKey,
    )) as Array<{
      date?: string;
      actualEarningResult?: number;
      estimatedEarning?: number;
    }>;
    const latest = rows[0];
    if (
      latest?.actualEarningResult !== undefined &&
      latest.estimatedEarning !== undefined &&
      latest.estimatedEarning !== 0 &&
      withinDays(latest.date, 70)
    ) {
      fields.earningsSurprisePct =
        ((latest.actualEarningResult - latest.estimatedEarning) /
          Math.abs(latest.estimatedEarning)) *
        100;
      availability[MODEL_SIGNAL.catalyst] = true;
    }
  } catch {
    // Plan-gated or unavailable remains unknown.
  }

  return { fields, availability };
}
