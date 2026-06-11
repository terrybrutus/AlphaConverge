import { SAMPLE_UNIVERSE } from "@/data/sampleUniverse";
import { MICRO_SIGNAL, SENT_SIGNAL, scoreTicker } from "@/lib/convergence";
import { buildLiveTicker } from "@/lib/liveTicker";
import type { Candle } from "@/lib/technicals";
import { describe, expect, it } from "vitest";

describe("convergence integrity", () => {
  it("keeps every category's intended signal weights normalized", () => {
    const play = scoreTicker(SAMPLE_UNIVERSE[0]);

    for (const category of play.categories) {
      expect(
        category.signals.reduce((sum, signal) => sum + signal.weight, 0),
        category.key,
      ).toBeCloseTo(1);
    }
  });

  it("keeps OBV in price structure and out of microstructure", () => {
    const ticker = {
      ...SAMPLE_UNIVERSE[0],
      sample: false,
      availability: {
        technical: true,
        fundamental: false,
        microstructure: false,
        sentiment: false,
        macro: false,
      },
      signalAvailability: {
        [MICRO_SIGNAL.unusualCall]: false,
        [MICRO_SIGNAL.shortFuel]: false,
        [MICRO_SIGNAL.darkPool]: false,
        [MICRO_SIGNAL.putCall]: false,
      },
      obvRising: true,
    };

    const play = scoreTicker(ticker);
    const micro = play.categories.find((c) => c.key === "microstructure");

    expect(
      play.categories
        .find((c) => c.key === "technical")
        ?.signals.find((signal) => signal.name.includes("OBV"))?.fired,
    ).toBe(true);
    expect(micro?.score).toBe(0);
    expect(micro?.coverage).toBe(0);
    expect(micro?.aligned).toBe(false);
    expect(play.surfaced).toBe(false);
  });

  it("does not count lifecycle stage as an independent confirmation", () => {
    const play = scoreTicker({
      ...SAMPLE_UNIVERSE[0],
      availability: {
        technical: true,
        fundamental: false,
        microstructure: false,
        sentiment: false,
        macro: false,
      },
    });

    expect(play.stage).not.toBe("none");
    expect(play.categoriesAligned).toBe(1);
    expect(play.surfaced).toBe(false);
  });

  it("marks live microstructure unavailable until an independent feed is connected", () => {
    const candles: Candle[] = Array.from({ length: 20 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(3, "0")}`,
      open: 100 + i,
      high: 101 + i,
      low: 99 + i,
      close: 100 + i,
      volume: 1000 + i,
    }));
    const play = scoreTicker(
      buildLiveTicker("TEST", candles, { source: "test" }),
    );
    const technical = play.categories.find((c) => c.key === "technical");
    const micro = play.categories.find((c) => c.key === "microstructure");

    expect(
      technical?.signals.find((signal) => signal.name.includes("OBV"))?.fired,
    ).toBe(true);
    expect(micro?.available).toBe(false);
    expect(micro?.coverage).toBe(0);
  });

  it("treats macro as context rather than another evidence vote", () => {
    const withMacro = scoreTicker({
      ...SAMPLE_UNIVERSE[0],
      availability: {
        technical: true,
        fundamental: true,
        microstructure: false,
        sentiment: false,
        macro: true,
      },
    });
    const withoutMacro = scoreTicker({
      ...SAMPLE_UNIVERSE[0],
      availability: {
        technical: true,
        fundamental: true,
        microstructure: false,
        sentiment: false,
        macro: false,
      },
    });

    expect(withMacro.categories.find((c) => c.key === "macro")?.aligned).toBe(
      true,
    );
    expect(withMacro.categoriesAligned).toBe(2);
    expect(withMacro.convergenceScore).toBe(withoutMacro.convergenceScore);
    expect(withMacro.dataCoverage).toBe(withoutMacro.dataCoverage);
    expect(withMacro.surfaced).toBe(false);
  });

  it("does not recommend options without live instrument data", () => {
    const play = scoreTicker({
      ...SAMPLE_UNIVERSE[0],
      sample: false,
      impliedVolatilityPctile: 0,
    });

    expect(play.surfaced).toBe(true);
    expect(play.instrument).toBe("pass");
  });

  it("allows a surfaced live setup to choose an option only when instrument data is explicit", () => {
    const play = scoreTicker({
      ...SAMPLE_UNIVERSE[0],
      sample: false,
      instrumentDataAvailable: true,
    });

    expect(play.surfaced).toBe(true);
    expect(play.instrument).not.toBe("pass");
  });

  it("allows sourced news sentiment and attention to make sentiment align-capable", () => {
    const play = scoreTicker({
      ...SAMPLE_UNIVERSE[0],
      sample: false,
      availability: {
        technical: true,
        fundamental: false,
        microstructure: false,
        sentiment: true,
        macro: false,
      },
      signalAvailability: {
        [SENT_SIGNAL.reddit]: true,
        [SENT_SIGNAL.news]: true,
        [SENT_SIGNAL.trends]: false,
      },
      redditMentionVelocity: 2,
      newsSentiment: 0.5,
    });
    const sentiment = play.categories.find(
      (category) => category.key === "sentiment",
    );

    expect(sentiment?.coverage).toBe(75);
    expect(sentiment?.aligned).toBe(true);
  });
});
