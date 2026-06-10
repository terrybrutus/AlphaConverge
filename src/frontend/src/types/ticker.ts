// Raw per-ticker signal facts. Mirrors the backend `Ticker` Motoko type. These
// are the *inputs* the convergence engine scores — never the scores themselves.
export interface TickerRaw {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  priceHistory: number[]; // weekly closes, oldest -> newest

  // 1. Technical structure
  pctAbove52wLow: number; // 8 => 8% above the 52-week low
  volumeContraction: number; // 0..1, 1 = volume fully dried up
  weeklyBullishDivergence: boolean;
  monthlyBullishDivergence: boolean;
  firstHigherHigh: boolean;
  nearMajorSupport: boolean;

  // 2. Fundamental inflection (rate-of-change, not absolute quality)
  revenueGrowthAccel: number; // pct-point change in YoY growth rate
  estimateRevision: number; // -1..1
  peVs5yrAvg: number; // ratio vs own 5yr avg (<1 = below)
  psVsSector: number; // ratio vs sector (<1 = cheaper)
  insiderBuy90d: boolean;
  instOwnershipChange: number; // pct change in institutional ownership
  shortInterestPct: number; // % of float short

  // 3. Market microstructure
  unusualCallActivity: boolean;
  darkPoolAccumulation: boolean;
  putCallShift: number; // -1..1, negative = calls favored

  // 4. Sentiment
  redditMentionVelocity: number; // z-score
  newsSentiment: number; // -1..1
  analystUpgrade: boolean;
  googleTrendsSlope: number; // -1..1

  // 5. Macro / sector alignment
  sectorEtfInflow: number; // -1..1
  macroRiskOn: boolean;
  sectorNarrative: boolean;

  // Instrument selection input
  impliedVolatilityPctile: number; // 0..100

  // Provenance: true => illustrative preview, not from a live provider
  sample: boolean;

  // Which signal categories actually have data behind them. Omitted => all
  // available (the sample path). A live ticker with only price data sets
  // technical: true and the rest false, so unconnected categories are scored
  // as "no data" rather than faked.
  availability?: Partial<Record<CategoryKey, boolean>>;

  // Where the data came from, e.g. "Alpha Vantage" or "Preview".
  source?: string;
}

export type CategoryKey =
  | "technical"
  | "fundamental"
  | "microstructure"
  | "sentiment"
  | "macro";

export type Stage =
  | "capitulation"
  | "base"
  | "breakout"
  | "earlyTrend"
  | "none";

export type Instrument =
  | "leapCall"
  | "nearTermCall"
  | "cashSecuredPut"
  | "dcaStock"
  | "pass";

export interface SignalLine {
  name: string;
  detail: string; // plain language
  weight: number; // 0..1 contribution within its category
  fired: boolean;
  // optional numeric context for fired signals
  value?: string;
}

export interface CategoryResult {
  key: CategoryKey;
  label: string;
  score: number; // 0..100
  aligned: boolean; // counts toward convergence
  available: boolean; // false => no data source connected for this category
  signals: SignalLine[];
}

export interface Play {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  priceHistory: number[];
  convergenceScore: number; // 0..100
  categoriesAligned: number; // 0..5
  categories: CategoryResult[];
  stage: Stage;
  instrument: Instrument;
  instrumentRationale: string;
  thesis: string; // plain-language "why now"
  fatigueWarning: string | null;
  surfaced: boolean; // >= 4 categories aligned
  sample: boolean;
  source?: string; // where the underlying data came from
  categoriesWithData: number; // how many of the 5 categories have a live source
}
