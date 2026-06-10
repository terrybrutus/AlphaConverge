import { FUND_SIGNAL, SENT_SIGNAL } from "@/lib/convergence";

// Finnhub fundamentals (free tier, CORS-enabled). Get a key at
// https://finnhub.io/register. Best-effort: each datum is fetched independently
// so partial coverage still produces real signals, and anything not sourced is
// reported as unavailable rather than faked.
export interface FundamentalData {
  fields: {
    revenueGrowthAccel?: number;
    estimateRevision?: number;
    peVs5yrAvg?: number;
    psVsSector?: number;
    insiderBuy90d?: boolean;
    instOwnershipChange?: number;
  };
  // Keyed by FUND_SIGNAL names — true only for signals we actually sourced.
  availability: Record<string, boolean>;
}

const BASE = "https://finnhub.io/api/v1";

async function getJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`Network error reaching Finnhub: ${(e as Error).message}`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error("Finnhub rejected the API key.");
  }
  if (res.status === 429) {
    throw new Error("Finnhub rate limit reached (free tier: 60/min).");
  }
  if (!res.ok) {
    throw new Error(`Finnhub returned HTTP ${res.status}`);
  }
  return res.json();
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

export async function fetchFundamentals(
  symbol: string,
  apiKey: string,
): Promise<FundamentalData> {
  const sym = symbol.trim().toUpperCase();
  const key = encodeURIComponent(apiKey);
  const fields: FundamentalData["fields"] = {};
  const availability: Record<string, boolean> = {
    [FUND_SIGNAL.revAccel]: false,
    [FUND_SIGNAL.estRev]: false,
    [FUND_SIGNAL.peHist]: false,
    [FUND_SIGNAL.psSector]: false,
    [FUND_SIGNAL.insider]: false,
    [FUND_SIGNAL.inst]: false,
  };

  // 1. Metrics — validate the key here (first call) and derive revenue accel.
  const metric = (await getJson(
    `${BASE}/stock/metric?symbol=${sym}&metric=all&token=${key}`,
  )) as { metric?: Record<string, unknown> };
  const m = metric.metric ?? {};
  const ttmYoY = num(m.revenueGrowthTTMYoy);
  const fiveY = num(m.revenueGrowth5Y);
  if (ttmYoY !== undefined && fiveY !== undefined) {
    // Is current growth outpacing its own 5-year trend? (percentage points)
    fields.revenueGrowthAccel = ttmYoY - fiveY;
    availability[FUND_SIGNAL.revAccel] = true;
  }

  // 2. Insider transactions — purchase in the last 90 days.
  try {
    const insider = (await getJson(
      `${BASE}/stock/insider-transactions?symbol=${sym}&token=${key}`,
    )) as {
      data?: Array<{ transactionCode?: string; transactionDate?: string }>;
    };
    const rows = insider.data ?? [];
    const cutoff = Date.now() - 90 * 24 * 3600 * 1000;
    const bought = rows.some(
      (r) =>
        (r.transactionCode ?? "").toUpperCase() === "P" &&
        r.transactionDate !== undefined &&
        new Date(r.transactionDate).getTime() >= cutoff,
    );
    fields.insiderBuy90d = bought;
    availability[FUND_SIGNAL.insider] = true;
  } catch {
    // leave unavailable
  }

  // 3. Analyst recommendation trend — direction of the latest revision.
  try {
    const recs = (await getJson(
      `${BASE}/stock/recommendation?symbol=${sym}&token=${key}`,
    )) as Array<{
      period?: string;
      strongBuy?: number;
      buy?: number;
      hold?: number;
      sell?: number;
      strongSell?: number;
    }>;
    if (Array.isArray(recs) && recs.length >= 2) {
      // recs are newest-first
      const score = (r: (typeof recs)[number]) =>
        (r.strongBuy ?? 0) * 2 +
        (r.buy ?? 0) -
        (r.sell ?? 0) -
        (r.strongSell ?? 0) * 2;
      const delta = score(recs[0]) - score(recs[1]);
      // Normalize to -1..1-ish.
      fields.estimateRevision = Math.max(-1, Math.min(1, delta / 5));
      availability[FUND_SIGNAL.estRev] = true;
    }
  } catch {
    // leave unavailable
  }

  return { fields, availability };
}

export const FINNHUB_NAME = "Finnhub";

// ---------------------------------------------------------------------------
// Sentiment
// ---------------------------------------------------------------------------
export interface SentimentData {
  fields: {
    redditMentionVelocity?: number;
    newsSentiment?: number;
    analystUpgrade?: boolean;
    googleTrendsSlope?: number;
  };
  availability: Record<string, boolean>;
}

// Finance-flavored headline lexicon for a lightweight, transparent news score.
// Crude by design — it is computed from real recent headlines and labeled as
// headline sentiment, not a black-box NLP model.
const POS_WORDS =
  /\b(beat|beats|surge|surges|soar|soars|jump|jumps|rally|rallies|record|surpass|surpasses|upgrade|upgraded|raises|raised|tops|wins|win|approval|approved|breakthrough|profit|profits|growth|gain|gains|strong|outperform|bullish|expands|expansion|partnership|launch|launches|guidance raise)\b/gi;
const NEG_WORDS =
  /\b(miss|misses|plunge|plunges|plummet|drop|drops|falls|fell|sink|sinks|cut|cuts|downgrade|downgraded|lawsuit|probe|investigation|weak|loss|losses|bearish|slump|warning|warns|recall|halt|halts|bankruptcy|delay|delays|layoff|layoffs|fraud|decline|declines|slashes|slash)\b/gi;

function headlineSentiment(headlines: string[]): number {
  let pos = 0;
  let neg = 0;
  for (const h of headlines) {
    pos += (h.match(POS_WORDS) || []).length;
    neg += (h.match(NEG_WORDS) || []).length;
  }
  const total = pos + neg;
  if (total === 0) return 0;
  return Math.max(-1, Math.min(1, (pos - neg) / total));
}

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export async function fetchSentiment(
  symbol: string,
  apiKey: string,
): Promise<SentimentData> {
  const sym = symbol.trim().toUpperCase();
  const key = encodeURIComponent(apiKey);
  const fields: SentimentData["fields"] = {};
  const availability: Record<string, boolean> = {
    [SENT_SIGNAL.reddit]: false, // Reddit API is CORS-blocked from the browser
    [SENT_SIGNAL.news]: false,
    [SENT_SIGNAL.analyst]: false,
    [SENT_SIGNAL.trends]: false, // Google Trends has no browser-usable API
  };

  // News sentiment from recent company headlines.
  try {
    const news = (await getJson(
      `${BASE}/company-news?symbol=${sym}&from=${isoDaysAgo(14)}&to=${isoDaysAgo(0)}&token=${key}`,
    )) as Array<{ headline?: string; summary?: string }>;
    if (Array.isArray(news) && news.length > 0) {
      const headlines = news
        .slice(0, 40)
        .map((n) => `${n.headline ?? ""} ${n.summary ?? ""}`);
      fields.newsSentiment = headlineSentiment(headlines);
      availability[SENT_SIGNAL.news] = true;
    }
  } catch {
    // leave unavailable
  }

  // Analyst upgrade: recommendation trend improved vs the prior period.
  try {
    const recs = (await getJson(
      `${BASE}/stock/recommendation?symbol=${sym}&token=${key}`,
    )) as Array<{
      strongBuy?: number;
      buy?: number;
      sell?: number;
      strongSell?: number;
    }>;
    if (Array.isArray(recs) && recs.length >= 2) {
      const score = (r: (typeof recs)[number]) =>
        (r.strongBuy ?? 0) * 2 +
        (r.buy ?? 0) -
        (r.sell ?? 0) -
        (r.strongSell ?? 0) * 2;
      fields.analystUpgrade = score(recs[0]) - score(recs[1]) > 0;
      availability[SENT_SIGNAL.analyst] = true;
    }
  } catch {
    // leave unavailable
  }

  return { fields, availability };
}
