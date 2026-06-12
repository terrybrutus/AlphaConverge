import { FUND_SIGNAL, SENT_SIGNAL } from "@/lib/convergence";
import { MODEL_SIGNAL } from "@/lib/modelSignals";
import type {
  OpportunityModelKey,
  OpportunityModelResult,
  OpportunityModelSignal,
  TickerRaw,
} from "@/types/ticker";

const MODEL_THRESHOLD = 60;
const MODEL_COVERAGE = 60;

function available(ticker: TickerRaw, signal: string): boolean {
  return ticker.signalAvailability?.[signal] ?? true;
}

function momentum(ticker: TickerRaw): boolean {
  const prices = ticker.priceHistory;
  if (prices.length < 13) return false;
  const start = prices[prices.length - 13];
  return start > 0 && ticker.price / start - 1 >= 0.05;
}

function scoreModel(
  key: OpportunityModelKey,
  label: string,
  description: string,
  signals: OpportunityModelSignal[],
  required: string[],
): OpportunityModelResult {
  const coverage = Math.round(
    signals.reduce(
      (total, signal) => total + (signal.available ? signal.weight : 0),
      0,
    ) * 100,
  );
  const score = Math.round(
    signals.reduce(
      (total, signal) =>
        total + (signal.available && signal.fired ? signal.weight : 0),
      0,
    ) * 100,
  );
  const missingRequired = required.filter(
    (name) => !signals.find((signal) => signal.name === name)?.available,
  );
  const failedRequired = required.filter((name) => {
    const signal = signals.find((item) => item.name === name);
    return signal?.available && !signal.fired;
  });
  const testable = coverage >= MODEL_COVERAGE && missingRequired.length === 0;
  const qualified =
    testable && score >= MODEL_THRESHOLD && failedRequired.length === 0;
  let blocker = "Qualified: required evidence and model threshold are met.";
  if (missingRequired.length > 0)
    blocker = `Not testable yet. Missing required evidence: ${missingRequired.join(", ")}.`;
  else if (coverage < MODEL_COVERAGE)
    blocker = `Not testable yet. Only ${coverage}% of this model is observable; ${MODEL_COVERAGE}% is required.`;
  else if (failedRequired.length > 0)
    blocker = `Required confirmation did not fire: ${failedRequired.join(", ")}.`;
  else if (score < MODEL_THRESHOLD)
    blocker = `Observable, but evidence strength is ${score}; ${MODEL_THRESHOLD} is required.`;

  return {
    key,
    label,
    description,
    score,
    coverage,
    qualified,
    testable,
    blocker,
    signals,
  };
}

function signal(
  name: string,
  detail: string,
  weight: number,
  isAvailable: boolean,
  fired: boolean,
  window: string,
): OpportunityModelSignal {
  return { name, detail, weight, available: isAvailable, fired, window };
}

export function scoreOpportunityModels(
  ticker: TickerRaw,
): OpportunityModelResult[] {
  const marketConfirmation = momentum(ticker) && ticker.obvRising;
  const marketSignal = signal(
    "Market confirmation",
    "Positive medium-term price momentum confirmed by rising OBV.",
    0.25,
    ticker.priceHistory.length >= 13,
    marketConfirmation,
    "Active while 12-week momentum and OBV remain positive",
  );
  const revenue = signal(
    FUND_SIGNAL.revAccel,
    "The latest year-over-year quarterly revenue growth rate accelerated.",
    0.3,
    available(ticker, FUND_SIGNAL.revAccel),
    ticker.revenueGrowthAccel > 0,
    "Until the next quarterly report, at most 120 days",
  );
  const revisions = signal(
    FUND_SIGNAL.estRev,
    "Analyst estimates are moving upward.",
    0.25,
    available(ticker, FUND_SIGNAL.estRev),
    ticker.estimateRevision > 0.1,
    "45 days",
  );
  const attention = signal(
    "Positive attention",
    "Recent company-news attention is accelerating and/or net-positive.",
    0.1,
    available(ticker, SENT_SIGNAL.reddit) ||
      available(ticker, SENT_SIGNAL.news),
    ticker.redditMentionVelocity >= 1 || ticker.newsSentiment > 0.15,
    "14 days",
  );
  const ownership = signal(
    "Ownership confirmation",
    "Insiders or institutions are accumulating.",
    0.1,
    available(ticker, FUND_SIGNAL.insider) ||
      available(ticker, FUND_SIGNAL.inst),
    ticker.insiderBuy90d || ticker.instOwnershipChange > 0.5,
    "120 days",
  );

  const fundamentalInflection = scoreModel(
    "fundamentalInflection",
    "Fundamental Inflection",
    "A measurable business improvement confirmed by the market.",
    [revenue, revisions, marketSignal, attention, ownership],
    [FUND_SIGNAL.revAccel, "Market confirmation"],
  );

  const qualityMomentum = scoreModel(
    "qualityMomentum",
    "Quality Momentum",
    "Sustained relative strength backed by improving profitability and financial quality.",
    [
      signal(
        MODEL_SIGNAL.profitability,
        "Profitability and balance-sheet quality are improving.",
        0.4,
        ticker.signalAvailability?.[MODEL_SIGNAL.profitability] ??
          ticker.operatingMarginAccel !== undefined,
        (ticker.operatingMarginAccel ?? 0) > 0,
        "Quarterly",
      ),
      { ...marketSignal, weight: 0.35 },
      { ...ownership, weight: 0.15 },
      { ...attention, weight: 0.1 },
    ],
    [MODEL_SIGNAL.profitability, "Market confirmation"],
  );

  const valueRecovery = scoreModel(
    "valueRecovery",
    "Value Recovery",
    "A discounted company whose fundamentals and market behavior are improving.",
    [
      signal(
        FUND_SIGNAL.peHist,
        "Valuation is below its own history.",
        0.25,
        available(ticker, FUND_SIGNAL.peHist),
        ticker.peVs5yrAvg > 0 && ticker.peVs5yrAvg < 1,
        "Until the next financial update, at most 120 days",
      ),
      signal(
        FUND_SIGNAL.psSector,
        "Valuation is discounted versus sector peers.",
        0.2,
        available(ticker, FUND_SIGNAL.psSector),
        ticker.psVsSector > 0 && ticker.psVsSector < 1,
        "Until sector comparison refresh, at most 90 days",
      ),
      { ...revenue, weight: 0.2 },
      { ...revisions, weight: 0.15 },
      { ...marketSignal, weight: 0.2 },
    ],
    [FUND_SIGNAL.peHist, "Market confirmation"],
  );

  const catalystUnderreaction = scoreModel(
    "catalystUnderreaction",
    "Catalyst Underreaction",
    "A material surprise followed by continuing revisions and market confirmation.",
    [
      signal(
        MODEL_SIGNAL.catalyst,
        "A positive earnings surprise or raised guidance created a measurable catalyst.",
        0.3,
        ticker.signalAvailability?.[MODEL_SIGNAL.catalyst] ??
          ticker.earningsSurprisePct !== undefined,
        (ticker.earningsSurprisePct ?? 0) > 5,
        "60 days",
      ),
      { ...revisions, weight: 0.25 },
      { ...marketSignal, weight: 0.25 },
      { ...attention, weight: 0.2 },
    ],
    [MODEL_SIGNAL.catalyst, "Market confirmation"],
  );

  const divergence =
    ticker.weeklyBullishDivergence || ticker.monthlyBullishDivergence;
  const earlyReversal = scoreModel(
    "earlyReversal",
    "Early Reversal",
    "The original AlphaConverge setup: exhaustion, accumulation, and an emerging turn.",
    [
      signal(
        "Base formation",
        "Price and volume compressed after a decline.",
        0.25,
        true,
        ticker.volumeContraction >= 0.6 && ticker.pctAbove52wLow <= 30,
        "Active while the base remains intact",
      ),
      signal(
        "Bullish divergence",
        "Weekly or monthly momentum diverged positively from price.",
        0.25,
        true,
        divergence,
        "Active until invalidated by a new structural low",
      ),
      signal(
        "First higher high",
        "Price made its first higher swing high.",
        0.2,
        true,
        ticker.firstHigherHigh,
        "Active while the emerging trend remains intact",
      ),
      signal(
        "Major support",
        "Price remains near major historical support.",
        0.1,
        true,
        ticker.nearMajorSupport,
        "Active while support holds",
      ),
      signal(
        "OBV accumulation",
        "On-Balance Volume is rising.",
        0.1,
        true,
        ticker.obvRising,
        "Active while the 12-week OBV trend remains positive",
      ),
      { ...ownership, weight: 0.1 },
    ],
    ["Bullish divergence"],
  );

  return [
    fundamentalInflection,
    qualityMomentum,
    valueRecovery,
    catalystUnderreaction,
    earlyReversal,
  ];
}

export function primaryOpportunityModel(
  models: OpportunityModelResult[],
): OpportunityModelResult | undefined {
  return [...models].sort(
    (a, b) =>
      Number(b.qualified) - Number(a.qualified) ||
      Number(b.testable) - Number(a.testable) ||
      b.score - a.score ||
      b.coverage - a.coverage,
  )[0];
}
