import { FUND_SIGNAL, SENT_SIGNAL } from "@/lib/convergence";
import { scoreOpportunityModels } from "@/lib/opportunityModels";
import type { TickerRaw } from "@/types/ticker";
import { describe, expect, it } from "vitest";

function ticker(): TickerRaw {
  return {
    symbol: "TEST",
    name: "Test",
    sector: "Technology",
    price: 120,
    priceHistory: Array.from({ length: 30 }, (_, index) => 80 + index * 1.4),
    pctAbove52wLow: 50,
    volumeContraction: 0.2,
    weeklyBullishDivergence: false,
    monthlyBullishDivergence: false,
    firstHigherHigh: true,
    nearMajorSupport: false,
    revenueGrowthAccel: 8,
    estimateRevision: 0.3,
    peVs5yrAvg: 0.8,
    psVsSector: 0.8,
    insiderBuy90d: true,
    instOwnershipChange: 1,
    shortInterestPct: 5,
    unusualCallActivity: false,
    darkPoolAccumulation: false,
    putCallShift: 0,
    obvRising: true,
    redditMentionVelocity: 2,
    newsSentiment: 0.4,
    analystUpgrade: true,
    googleTrendsSlope: 0,
    sectorEtfInflow: 0,
    macroRiskOn: true,
    sectorNarrative: false,
    impliedVolatilityPctile: 0,
    sample: false,
    signalAvailability: {
      [FUND_SIGNAL.revAccel]: true,
      [FUND_SIGNAL.estRev]: true,
      [FUND_SIGNAL.peHist]: true,
      [FUND_SIGNAL.psSector]: true,
      [FUND_SIGNAL.insider]: true,
      [FUND_SIGNAL.inst]: true,
      [SENT_SIGNAL.reddit]: true,
      [SENT_SIGNAL.news]: true,
      [SENT_SIGNAL.trends]: false,
    },
  };
}

describe("opportunity models", () => {
  it("qualifies a measurable fundamental inflection with market confirmation", () => {
    const model = scoreOpportunityModels(ticker()).find(
      (item) => item.key === "fundamentalInflection",
    );
    expect(model?.testable).toBe(true);
    expect(model?.qualified).toBe(true);
  });

  it("keeps quality momentum untestable without profitability quality data", () => {
    const model = scoreOpportunityModels(ticker()).find(
      (item) => item.key === "qualityMomentum",
    );
    expect(model?.testable).toBe(false);
    expect(model?.blocker).toContain("Profitability quality");
  });

  it("does not qualify a model when required market confirmation fails", () => {
    const raw = ticker();
    raw.obvRising = false;
    const model = scoreOpportunityModels(raw).find(
      (item) => item.key === "fundamentalInflection",
    );
    expect(model?.qualified).toBe(false);
    expect(model?.blocker).toContain("Market confirmation");
  });
});
