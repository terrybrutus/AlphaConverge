import { scoreTicker } from "@/lib/convergence";
import { buildLiveTicker } from "@/lib/liveTicker";
import type { Candle } from "@/lib/technicals";
import type { Stage } from "@/types/ticker";

// Walk-forward backtest of the engine's PRICE-DERIVED signals (technical
// structure + OBV microstructure + lifecycle stage). At each historical week we
// compute the engine score using ONLY candles up to that week (no lookahead),
// then measure the forward return over the next `horizon` weeks. Fundamental /
// sentiment / macro are excluded because we have no point-in-time history for
// them on free data — so this validates the chart-structure core, not the full
// six-category score.

export interface BtSample {
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
): BtSample[] {
  const out: BtSample[] = [];
  const n = candles.length;
  if (n < minHistory + horizon + 1) return out;
  for (let t = minHistory; t <= n - 1 - horizon; t++) {
    // Only information available up to and including week t.
    const asOf = candles.slice(0, t + 1);
    const raw = buildLiveTicker(symbol, asOf, { source: "backtest" });
    const play = scoreTicker(raw);
    const tech = play.categories.find((c) => c.key === "technical");
    if (!tech) continue;
    const fwd =
      (candles[t + horizon].close - candles[t].close) / candles[t].close;
    out.push({
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
  avgReturn: number;
  winRate: number;
}

function stat(samples: BtSample[]): Stat {
  if (samples.length === 0) return { count: 0, avgReturn: 0, winRate: 0 };
  const avgReturn = samples.reduce((s, x) => s + x.fwd, 0) / samples.length;
  const winRate = samples.filter((x) => x.fwd > 0).length / samples.length;
  return { count: samples.length, avgReturn, winRate };
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
  };
}
