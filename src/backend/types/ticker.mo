module {
  // A Ticker holds the *raw factual signals* for one equity. These are the
  // inputs the convergence engine scores — they are deliberately flat and
  // primitive so the data layer (Alpha Vantage / Polygon / SEC EDGAR / Reddit
  // / options-flow providers) can populate them via HTTP outcalls, and so the
  // frontend engine can score them deterministically.
  //
  // `sample = true` marks a record as illustrative preview data that did NOT
  // come from a connected live provider. The UI badges these prominently.
  public type Ticker = {
    symbol : Text;
    name : Text;
    sector : Text;
    price : Float;
    priceHistory : [Float]; // weekly closes, oldest -> newest

    // 1. Technical structure
    pctAbove52wLow : Float; // e.g. 8.0 means 8% above the 52-week low
    volumeContraction : Float; // 0..1, 1 = volume fully dried up
    weeklyBullishDivergence : Bool;
    monthlyBullishDivergence : Bool;
    firstHigherHigh : Bool;
    nearMajorSupport : Bool;

    // 2. Fundamental inflection (rate-of-change, not absolute quality)
    revenueGrowthAccel : Float; // percentage-point change in YoY growth rate
    estimateRevision : Float; // -1..1, direction/intensity of analyst revisions
    peVs5yrAvg : Float; // ratio vs own 5yr avg, <1 = below average
    psVsSector : Float; // ratio vs sector, <1 = cheaper than peers
    insiderBuy90d : Bool;
    instOwnershipChange : Float; // pct change in institutional ownership
    shortInterestPct : Float; // % of float sold short

    // 3. Market microstructure
    unusualCallActivity : Bool;
    darkPoolAccumulation : Bool;
    putCallShift : Float; // -1..1, negative = calls increasingly favored

    // 4. Sentiment
    redditMentionVelocity : Float; // z-score vs trailing mean
    newsSentiment : Float; // -1..1 NLP score
    analystUpgrade : Bool;
    googleTrendsSlope : Float; // -1..1

    // 5. Macro / sector alignment
    sectorEtfInflow : Float; // -1..1
    macroRiskOn : Bool;
    sectorNarrative : Bool;

    // Instrument selection input
    impliedVolatilityPctile : Float; // 0..100

    // Provenance
    sample : Bool;
  };
};
