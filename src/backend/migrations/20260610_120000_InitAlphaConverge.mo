import Map "mo:core/Map";
import List "mo:core/List";

module {
  // Raw ticker signal facts — must structurally match types/ticker.mo : Ticker.
  type TickerInternal = {
    symbol : Text;
    name : Text;
    sector : Text;
    price : Float;
    priceHistory : [Float];

    pctAbove52wLow : Float;
    volumeContraction : Float;
    weeklyBullishDivergence : Bool;
    monthlyBullishDivergence : Bool;
    firstHigherHigh : Bool;
    nearMajorSupport : Bool;

    revenueGrowthAccel : Float;
    estimateRevision : Float;
    peVs5yrAvg : Float;
    psVsSector : Float;
    insiderBuy90d : Bool;
    instOwnershipChange : Float;
    shortInterestPct : Float;

    unusualCallActivity : Bool;
    darkPoolAccumulation : Bool;
    putCallShift : Float;

    redditMentionVelocity : Float;
    newsSentiment : Float;
    analystUpgrade : Bool;
    googleTrendsSlope : Float;

    sectorEtfInflow : Float;
    macroRiskOn : Bool;
    sectorNarrative : Bool;

    impliedVolatilityPctile : Float;

    sample : Bool;
  };

  // Discard the prior placeholder state (stocks/holdings) and initialize the
  // AlphaConverge stable shape fresh. The old StockHub data was mock-only.
  type OldActor = {};

  type NewActor = {
    tickers : Map.Map<Text, TickerInternal>;
    watchlist : List.List<Text>;
  };

  public func migration(_ : OldActor) : NewActor {
    {
      tickers = Map.empty<Text, TickerInternal>();
      watchlist = List.empty<Text>();
    };
  };
};
