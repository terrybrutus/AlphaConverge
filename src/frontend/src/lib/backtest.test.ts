import { aggregate, backtestCandles, backtestCoverage } from "@/lib/backtest";
import type { Candle } from "@/lib/technicals";
import { describe, expect, it } from "vitest";

function candles(count: number): Candle[] {
  return Array.from({ length: count }, (_, i) => ({
    date: `2024-${String(i + 1).padStart(3, "0")}`,
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    close: 100 + i,
    volume: 1000,
  }));
}

describe("backtest reliability", () => {
  it("uses non-overlapping samples by default", () => {
    const result = backtestCandles("TEST", candles(100), 12, 60);
    expect(result).toHaveLength(3);
  });

  it("reports an approximate confidence interval", () => {
    const result = aggregate(
      [
        {
          asOf: "2024-01-01",
          through: "2024-01-29",
          techScore: 20,
          aligned: false,
          stage: "none",
          fwd: -0.1,
        },
        {
          asOf: "2024-02-01",
          through: "2024-02-29",
          techScore: 80,
          aligned: true,
          stage: "breakout",
          fwd: 0.2,
        },
      ],
      12,
    );
    expect(result.baseline.confidence95).not.toBeNull();
    expect(result.baseline.confidence95 ?? 0).toBeGreaterThan(0);
    expect(result.baseline.winRateLow95 ?? 1).toBeLessThan(
      result.baseline.winRate,
    );
    expect(result.baseline.winRateHigh95 ?? 0).toBeGreaterThan(
      result.baseline.winRate,
    );
    expect(result.nonOverlapping).toBe(true);
  });

  it("refuses a verdict when ticker coverage or sample count is inadequate", () => {
    expect(backtestCoverage(6, 10, 20).usable).toBe(false);
    expect(backtestCoverage(7, 10, 20).usable).toBe(true);
    expect(backtestCoverage(10, 10, 0).usable).toBe(false);
    expect(backtestCoverage(10, 10, 19).usable).toBe(false);
  });

  it("clusters overlapping forward windows into one effective period", () => {
    const result = aggregate(
      [
        {
          asOf: "2024-01-01",
          through: "2024-03-01",
          techScore: 80,
          aligned: true,
          stage: "breakout",
          fwd: 0.1,
        },
        {
          asOf: "2024-02-01",
          through: "2024-04-01",
          techScore: 80,
          aligned: true,
          stage: "breakout",
          fwd: 0.2,
        },
      ],
      12,
    );
    expect(result.baseline.count).toBe(2);
    expect(result.baseline.effectiveCount).toBe(1);
    expect(result.baseline.confidence95).toBeNull();
  });
});
