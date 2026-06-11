import { MICRO_SIGNAL } from "@/lib/convergence";
import { buildLiveTicker } from "@/lib/liveTicker";
import { applyManualEvidence, parseTickerImport } from "@/lib/research";
import type { Candle } from "@/lib/technicals";
import { describe, expect, it } from "vitest";

describe("research helpers", () => {
  it("extracts the ticker column from a pasted Finviz table", () => {
    const text =
      "No.\tTicker\tCompany\tSector\tPrice\n1\tBYRN\tByrna Technologies Inc\tIndustrials\t6.27\n2\tCHPT\tChargePoint Holdings Inc\tConsumer Cyclical\t6.40";
    expect(parseTickerImport(text)).toEqual(["BYRN", "CHPT"]);
  });

  it("still accepts ordinary ticker lists", () => {
    expect(parseTickerImport("PLTR, SOFI\nHOOD")).toEqual([
      "PLTR",
      "SOFI",
      "HOOD",
    ]);
  });

  it("turns sourced manual evidence into available evidence", () => {
    const candles: Candle[] = Array.from({ length: 70 }, (_, i) => ({
      date: `2025-${String(i + 1).padStart(3, "0")}`,
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100 + i,
      volume: 1000 + i,
    }));
    const raw = buildLiveTicker("TEST", candles, { source: "test" });
    const researched = applyManualEvidence(raw, {
      signals: {
        [MICRO_SIGNAL.shortFuel]: {
          verdict: "confirmed",
          source: "FINRA",
          observedAt: "2026-06-10",
        },
      },
    });

    expect(researched.availability?.microstructure).toBe(true);
    expect(researched.signalAvailability?.[MICRO_SIGNAL.shortFuel]).toBe(true);
    expect(researched.shortInterestPct).toBe(20);
  });
});
