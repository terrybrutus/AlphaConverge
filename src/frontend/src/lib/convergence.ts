import type {
  CategoryKey,
  CategoryResult,
  Instrument,
  Play,
  SignalLine,
  Stage,
  TickerRaw,
} from "@/types/ticker";

// A category is considered "aligned" (contributing to convergence) once its
// weighted signal score crosses this threshold.
const ALIGN_THRESHOLD = 50;

// A ticker is surfaced as a Play once at least this many of the six dimensions
// (five scored categories + a valid lifecycle stage) align simultaneously.
const SURFACE_MIN_DIMENSIONS = 4;

// Blend weights for the headline convergence score. Technical and fundamental
// carry the most weight because they define the structural setup; the others
// confirm it.
const CATEGORY_BLEND: Record<CategoryKey, number> = {
  technical: 0.28,
  fundamental: 0.26,
  microstructure: 0.18,
  macro: 0.16,
  sentiment: 0.12,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Stable names for fundamental sub-signals, shared with the live data layer so
// it can mark exactly which ones it sourced.
export const FUND_SIGNAL = {
  revAccel: "Revenue growth accelerating",
  estRev: "Estimates revised upward",
  peHist: "Valuation below 5-yr average",
  psSector: "Cheaper than sector",
  insider: "Insider buying (90d)",
  inst: "Institutional accumulation",
} as const;

function isAvailable(t: TickerRaw, key: CategoryKey): boolean {
  return t.availability?.[key] ?? true;
}

function signalAvailable(t: TickerRaw, name: string): boolean {
  return t.signalAvailability?.[name] ?? true;
}

function scoreCategory(
  key: CategoryKey,
  label: string,
  signals: SignalLine[],
  available: boolean,
): CategoryResult {
  // Only signals with a connected data source count toward the score.
  const usable = signals.filter((s) => s.available !== false);
  if (!available || usable.length === 0) {
    // No data source connected for this category — score it as unknown, never
    // fabricate a signal.
    return {
      key,
      label,
      score: 0,
      aligned: false,
      available: false,
      signals: signals.map((s) => ({ ...s, fired: false })),
    };
  }
  const totalWeight = usable.reduce((s, x) => s + x.weight, 0);
  const firedWeight = usable.reduce((s, x) => s + (x.fired ? x.weight : 0), 0);
  const score =
    totalWeight === 0 ? 0 : Math.round((firedWeight / totalWeight) * 100);
  return {
    key,
    label,
    score,
    aligned: score >= ALIGN_THRESHOLD,
    available: true,
    signals,
  };
}

function technical(t: TickerRaw): CategoryResult {
  const baseFormation = t.volumeContraction >= 0.6 && t.pctAbove52wLow <= 30;
  const signals: SignalLine[] = [
    {
      name: "Base formation",
      detail:
        "Price compressed into a tight range on contracting volume after a decline — the market has stopped caring, which is where quiet accumulation happens.",
      weight: 0.25,
      fired: baseFormation,
      value: `${Math.round(t.volumeContraction * 100)}% volume dry-up`,
    },
    {
      name: "Weekly bullish divergence",
      detail:
        "Price made a lower low while momentum made a higher low on the weekly chart — selling pressure is exhausting.",
      weight: 0.2,
      fired: t.weeklyBullishDivergence,
    },
    {
      name: "Monthly bullish divergence",
      detail:
        "The same exhaustion signal on the monthly chart — the longer the timeframe, the more structural the shift.",
      weight: 0.2,
      fired: t.monthlyBullishDivergence,
    },
    {
      name: "First higher high",
      detail:
        "First higher high on the weekly chart after the downtrend — momentum has actually turned, not just slowed.",
      weight: 0.2,
      fired: t.firstHigherHigh,
    },
    {
      name: "At major support",
      detail:
        "Trading into a major historical support level where buyers have stepped in before.",
      weight: 0.15,
      fired: t.nearMajorSupport,
    },
  ];
  return scoreCategory(
    "technical",
    "Technical structure",
    signals,
    isAvailable(t, "technical"),
  );
}

function fundamental(t: TickerRaw): CategoryResult {
  const signals: SignalLine[] = [
    {
      name: FUND_SIGNAL.revAccel,
      detail:
        "Growth rate is getting faster, not just staying positive — the inflection that precedes re-rating.",
      weight: 0.22,
      fired: t.revenueGrowthAccel > 0,
      value: `${t.revenueGrowthAccel > 0 ? "+" : ""}${t.revenueGrowthAccel.toFixed(1)} pp`,
      available: signalAvailable(t, FUND_SIGNAL.revAccel),
    },
    {
      name: FUND_SIGNAL.estRev,
      detail:
        "Analysts are raising forecasts. Direction of revisions matters more than the absolute level.",
      weight: 0.2,
      fired: t.estimateRevision > 0.1,
      available: signalAvailable(t, FUND_SIGNAL.estRev),
    },
    {
      name: FUND_SIGNAL.peHist,
      detail:
        "Trading below its own 5-year average multiple — cheap relative to its own history, not just the market.",
      weight: 0.15,
      fired: t.peVs5yrAvg > 0 && t.peVs5yrAvg < 1,
      value: t.peVs5yrAvg > 0 ? `${t.peVs5yrAvg.toFixed(2)}x` : "n/a",
      available: signalAvailable(t, FUND_SIGNAL.peHist),
    },
    {
      name: FUND_SIGNAL.psSector,
      detail:
        "Price-to-sales below the sector median — discounted versus peers.",
      weight: 0.13,
      fired: t.psVsSector > 0 && t.psVsSector < 1,
      available: signalAvailable(t, FUND_SIGNAL.psSector),
    },
    {
      name: FUND_SIGNAL.insider,
      detail:
        "Insiders bought on the open market in the last 90 days after a long quiet stretch (SEC Form 4).",
      weight: 0.18,
      fired: t.insiderBuy90d,
      available: signalAvailable(t, FUND_SIGNAL.insider),
    },
    {
      name: FUND_SIGNAL.inst,
      detail:
        "Institutional ownership rose over the latest quarter (13F) — funds are building positions.",
      weight: 0.12,
      fired: t.instOwnershipChange > 0.5,
      available: signalAvailable(t, FUND_SIGNAL.inst),
    },
  ];
  return scoreCategory(
    "fundamental",
    "Fundamental inflection",
    signals,
    isAvailable(t, "fundamental"),
  );
}

function microstructure(t: TickerRaw): CategoryResult {
  const signals: SignalLine[] = [
    {
      name: "Unusual call activity",
      detail:
        "Out-of-the-money call buying well above normal volume, weeks before expiry — a smart-money tell.",
      weight: 0.35,
      fired: t.unusualCallActivity,
    },
    {
      name: "Short-squeeze fuel",
      detail:
        "Elevated short interest. On any positive catalyst, shorts must buy to cover — a force multiplier.",
      weight: 0.3,
      fired: t.shortInterestPct >= 15,
      value: `${t.shortInterestPct.toFixed(0)}% short`,
    },
    {
      name: "Dark-pool accumulation",
      detail:
        "Large off-exchange prints consistent with quiet institutional buying.",
      weight: 0.2,
      fired: t.darkPoolAccumulation,
    },
    {
      name: "Put/call shift to calls",
      detail:
        "Options positioning is rotating toward calls relative to its baseline.",
      weight: 0.15,
      fired: t.putCallShift < -0.2,
    },
  ];
  return scoreCategory(
    "microstructure",
    "Market microstructure",
    signals,
    isAvailable(t, "microstructure"),
  );
}

function sentiment(t: TickerRaw): CategoryResult {
  const signals: SignalLine[] = [
    {
      name: "Reddit mention spike",
      detail:
        "Mention velocity on r/wallstreetbets / r/stocks is well above its trailing baseline.",
      weight: 0.3,
      fired: t.redditMentionVelocity >= 1,
      value: `${t.redditMentionVelocity.toFixed(1)}σ`,
    },
    {
      name: "News sentiment positive",
      detail: "Headline NLP sentiment has turned net-positive.",
      weight: 0.25,
      fired: t.newsSentiment > 0.15,
    },
    {
      name: "Analyst upgrade / initiation",
      detail: "A new upgrade or first-time coverage initiation.",
      weight: 0.25,
      fired: t.analystUpgrade,
    },
    {
      name: "Search interest rising",
      detail: "Google Trends for the ticker is sloping up.",
      weight: 0.2,
      fired: t.googleTrendsSlope > 0.15,
    },
  ];
  return scoreCategory(
    "sentiment",
    "Sentiment",
    signals,
    isAvailable(t, "sentiment"),
  );
}

function macro(t: TickerRaw): CategoryResult {
  const signals: SignalLine[] = [
    {
      name: "Sector ETF inflows",
      detail:
        "The stock's sector is receiving net ETF inflows — institutional money is rotating in.",
      weight: 0.4,
      fired: t.sectorEtfInflow > 0.2,
    },
    {
      name: "Risk-on backdrop",
      detail:
        "The broad macro environment is risk-on (rate direction / liquidity favorable).",
      weight: 0.3,
      fired: t.macroRiskOn,
    },
    {
      name: "Sector narrative tailwind",
      detail:
        "An active narrative is pulling attention and capital toward the sector.",
      weight: 0.3,
      fired: t.sectorNarrative,
    },
  ];
  return scoreCategory(
    "macro",
    "Macro & sector",
    signals,
    isAvailable(t, "macro"),
  );
}

function classifyStage(t: TickerRaw): Stage {
  if (t.firstHigherHigh) {
    return t.pctAbove52wLow <= 60 ? "breakout" : "earlyTrend";
  }
  const hasDivergence = t.weeklyBullishDivergence || t.monthlyBullishDivergence;
  if (t.pctAbove52wLow <= 15 && t.volumeContraction >= 0.6 && hasDivergence) {
    return "capitulation";
  }
  if (t.volumeContraction >= 0.5 && t.pctAbove52wLow <= 40) {
    return "base";
  }
  return "none";
}

export const STAGE_LABEL: Record<Stage, string> = {
  capitulation: "Capitulation Bottom",
  base: "Base Formation",
  breakout: "Base Breakout",
  earlyTrend: "Early Trend",
  none: "No clear stage",
};

export const INSTRUMENT_LABEL: Record<Instrument, string> = {
  leapCall: "LEAP call (12–18 mo)",
  nearTermCall: "Near-term call (1–3 mo)",
  cashSecuredPut: "Cash-secured put",
  dcaStock: "DCA into shares",
  pass: "Pass — wait",
};

function chooseInstrument(
  stage: Stage,
  t: TickerRaw,
  surfaced: boolean,
): { instrument: Instrument; rationale: string } {
  if (!surfaced) {
    return {
      instrument: "pass",
      rationale:
        "Too few independent categories agree right now. Watch it, don't commit capital.",
    };
  }
  const richPremiumAtSupport =
    t.impliedVolatilityPctile >= 70 && t.nearMajorSupport;
  switch (stage) {
    case "capitulation":
      return {
        instrument: "leapCall",
        rationale: `Earliest, highest risk/reward stage — give the thesis room with long-dated calls so time decay isn't the enemy.${
          richPremiumAtSupport
            ? " Implied vol is rich and price sits on support, so a cash-secured put is a reasonable income alternative while you wait for confirmation."
            : ""
        }`,
      };
    case "base":
      return richPremiumAtSupport
        ? {
            instrument: "cashSecuredPut",
            rationale:
              "Accumulation phase with rich implied vol at support — sell a cash-secured put to get paid while you wait for the breakout, and own shares lower if assigned.",
          }
        : {
            instrument: "leapCall",
            rationale:
              "Accumulation phase — a LEAP captures the eventual breakout without forcing a near-term timing call.",
          };
    case "breakout":
      return {
        instrument: "nearTermCall",
        rationale:
          "Momentum just confirmed with a higher high on expanding volume — a 1–3 month call captures the move with the lowest risk of being early.",
      };
    case "earlyTrend":
      return {
        instrument: "dcaStock",
        rationale:
          "Trend is already established — lower risk but less explosive upside, so scale into shares rather than pay option premium.",
      };
    default:
      return {
        instrument: "pass",
        rationale: "No clear lifecycle stage — nothing to act on yet.",
      };
  }
}

function buildFatigueWarning(stage: Stage, t: TickerRaw): string | null {
  if (stage === "capitulation" && !t.firstHigherHigh) {
    if (!t.monthlyBullishDivergence) {
      return "Early and unconfirmed. This looks like a pre-bottom: it can grind sideways for many months and shake out impatient buyers. Wait for a first higher high or size in slowly with long-dated exposure.";
    }
    return "Structurally supported but still early — momentum hasn't made a higher high yet. Favor long-dated instruments so you aren't fighting time decay while it bottoms.";
  }
  if (stage === "base" && !t.firstHigherHigh) {
    return "Accumulation in progress, breakout not yet confirmed. Reasonable to start scaling, but the cleanest entry is the first higher high.";
  }
  return null;
}

function buildThesis(
  t: TickerRaw,
  stage: Stage,
  categories: CategoryResult[],
  dimensionsAligned: number,
): string {
  const fired: string[] = [];
  for (const c of categories) {
    for (const s of c.signals) {
      if (s.fired) fired.push(s.name.toLowerCase());
    }
  }
  const top = fired.slice(0, 5);
  const stageText = STAGE_LABEL[stage].toLowerCase();
  if (dimensionsAligned < SURFACE_MIN_DIMENSIONS) {
    return `Only ${dimensionsAligned} of 6 dimensions align on ${t.symbol}. Not enough independent confirmation to call this a setup — it stays on the watch list.`;
  }
  const lead = `${dimensionsAligned} of 6 dimensions converge on ${t.symbol} (${t.name}), currently in a ${stageText}.`;
  const body =
    top.length > 0
      ? ` The agreeing signals: ${top.join(", ")}. Independent categories pointing the same way is the edge — any one alone is noise.`
      : "";
  return lead + body;
}

export function scoreTicker(t: TickerRaw): Play {
  const categories = [
    technical(t),
    fundamental(t),
    microstructure(t),
    sentiment(t),
    macro(t),
  ];
  const categoriesAlignedCount = categories.filter((c) => c.aligned).length;
  const stage = classifyStage(t);
  const stageValid = stage !== "none";
  const dimensionsAligned = categoriesAlignedCount + (stageValid ? 1 : 0);
  const surfaced = dimensionsAligned >= SURFACE_MIN_DIMENSIONS;

  const convergenceScore = Math.round(
    clamp(
      categories.reduce((sum, c) => sum + c.score * CATEGORY_BLEND[c.key], 0),
      0,
      100,
    ),
  );

  const { instrument, rationale } = chooseInstrument(stage, t, surfaced);

  return {
    symbol: t.symbol,
    name: t.name,
    sector: t.sector,
    price: t.price,
    priceHistory: t.priceHistory,
    convergenceScore,
    categoriesAligned: dimensionsAligned,
    categories,
    stage,
    instrument,
    instrumentRationale: rationale,
    thesis: buildThesis(t, stage, categories, dimensionsAligned),
    fatigueWarning: buildFatigueWarning(stage, t),
    surfaced,
    sample: t.sample,
    source: t.source,
    categoriesWithData: categories.filter((c) => c.available).length,
  };
}

export function scoreUniverse(universe: TickerRaw[]): Play[] {
  return universe
    .map(scoreTicker)
    .sort((a, b) => b.convergenceScore - a.convergenceScore);
}

export function surfacedPlays(plays: Play[]): Play[] {
  return plays.filter((p) => p.surfaced);
}
