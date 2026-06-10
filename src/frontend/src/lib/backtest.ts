import { scoreTicker } from "@/lib/convergence";
import { buildLiveTicker } from "@/lib/liveTicker";
import type { Candle } from "@/lib/technicals";
import type { Stage } from "@/types/ticker";

// Walk-forward backtest of the engine's PRICE-DERIVED signals (technical
// structure, including OBV, plus lifecycle stage). At each historical week we
// compute the engine score using ONLY candles up to that week (no lookahead),
// then measure the forward return over the next `horizon` weeks. Fundamental /
// sentiment / macro are excluded because we have no point-in-time history for
// them on free data — so this validates the chart-structure core, not the full
// full independent-evidence score.

export interface BtSample {
  asOf: string;
  through: string; // overlapping forward windows are treated as one period
  techScore: number; // technical category score 0..100 at the as-of week
  aligned: boolean; // technical category aligned (>= threshold)
  stage: Stage;
  fwd: number; // forward return over the horizon (fraction)
}

export function backtestCandles(
  symbol: string,
  candles: Candle[],
  horizon: number,
  minHistory = 60,
  nonOverlapping = true,
): BtSample[] {
  const out: BtSample[] = [];
  const n = candles.length;
  if (n < minHistory + horizon + 1) return out;
  const stride = nonOverlapping ? horizon : 1;
  for (let t = minHistory; t <= n - 1 - horizon; t += stride) {
    // Only information available up to and including week t.
    const asOf = candles.slice(0, t + 1);
    const raw = buildLiveTicker(symbol, asOf, { source: "backtest" });
    const play = scoreTicker(raw);
    const tech = play.categories.find((c) => c.key === "technical");
    if (!tech) continue;
    const fwd =
      (candles[t + horizon].close - candles[t].close) / candles[t].close;
    out.push({
      asOf: candles[t].date,
      through: candles[t + horizon].date,
      techScore: tech.score,
      aligned: tech.aligned,
      stage: play.stage,
      fwd,
    });
  }
  return out;
}

export interface Stat {
  count: number;
  effectiveCount: number;
  avgReturn: number;
  winRate: number;
  confidence95: number | null;
  winRateLow95: number | null;
  winRateHigh95: number | null;
}

function stat(samples: BtSample[]): Stat {
  if (samples.length === 0)
    return {
      count: 0,
      effectiveCount: 0,
      avgReturn: 0,
      winRate: 0,
      confidence95: null,
      winRateLow95: null,
      winRateHigh95: null,
    };
  const clusters: BtSample[][] = [];
  let latestThrough = "";
  for (const sample of [...samples].sort((a, b) =>
    a.asOf.localeCompare(b.asOf),
  )) {
    const current = clusters[clusters.length - 1];
    if (current && sample.asOf < latestThrough) {
      current.push(sample);
      if (sample.through > latestThrough) latestThrough = sample.through;
    } else {
      clusters.push([sample]);
      latestThrough = sample.through;
    }
  }
  const periodReturns = clusters.map(
    (period) => period.reduce((sum, x) => sum + x.fwd, 0) / period.length,
  );
  const periodWinRates = clusters.map(
    (period) => period.filter((x) => x.fwd > 0).length / period.length,
  );
  const avg = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const margin95 = (values: number[], mean: number) => {
    if (values.length < 2) return null;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      (values.length - 1);
    return 1.96 * Math.sqrt(variance / values.length);
  };
  const avgReturn = avg(periodReturns);
  const winRate = avg(periodWinRates);
  const confidence95 = margin95(periodReturns, avgReturn);
  const winRateMargin95 = margin95(periodWinRates, winRate);
  return {
    count: samples.length,
    effectiveCount: clusters.length,
    avgReturn,
    winRate,
    confidence95,
    winRateLow95:
      winRateMargin95 === null ? null : Math.max(0, winRate - winRateMargin95),
    winRateHigh95:
      winRateMargin95 === null ? null : Math.min(1, winRate + winRateMargin95),
  };
}

export interface BtBucket extends Stat {
  label: string;
}

const SCORE_BUCKETS: [number, number, string][] = [
  [0, 40, "0–40"],
  [40, 60, "40–60"],
  [60, 80, "60–80"],
  [80, 101, "80–100"],
];

export interface BtStageRow extends Stat {
  stage: Stage;
}

const STAGE_ORDER: Stage[] = [
  "capitulation",
  "base",
  "breakout",
  "earlyTrend",
  "none",
];

export interface BtResult {
  horizon: number;
  total: number;
  baseline: Stat; // all samples = the "average week" over the horizon
  buckets: BtBucket[]; // by technical score
  aligned: Stat;
  notAligned: Stat;
  stages: BtStageRow[];
  nonOverlapping: boolean;
}

export function backtestCoverage(
  succeeded: number,
  requested: number,
  sampleCount: number,
): { usable: boolean; coverage: number; error?: string } {
  const minimumSamples = 20;
  const coverage = requested > 0 ? succeeded / requested : 0;
  const usable = coverage >= 0.7 && sampleCount >= minimumSamples;
  const reasons: string[] = [];
  if (coverage < 0.7) {
    reasons.push(
      `ticker coverage was only ${Math.round(coverage * 100)}% (70% required)`,
    );
  }
  if (sampleCount < minimumSamples) {
    reasons.push(
      `only ${sampleCount} independent time periods were available (${minimumSamples} required)`,
    );
  }
  return {
    usable,
    coverage,
    error: usable
      ? undefined
      : `Backtest verdict withheld: ${reasons.join("; ")}.`,
  };
}

export function aggregate(samples: BtSample[], horizon: number): BtResult {
  return {
    horizon,
    total: samples.length,
    baseline: stat(samples),
    buckets: SCORE_BUCKETS.map(([lo, hi, label]) => ({
      label,
      ...stat(samples.filter((x) => x.techScore >= lo && x.techScore < hi)),
    })),
    aligned: stat(samples.filter((x) => x.aligned)),
    notAligned: stat(samples.filter((x) => !x.aligned)),
    stages: STAGE_ORDER.map((stage) => ({
      stage,
      ...stat(samples.filter((x) => x.stage === stage)),
    })),
    nonOverlapping: true,
  };
}
