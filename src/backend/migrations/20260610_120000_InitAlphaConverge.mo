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

  // The prior placeholder version (20260610_033400_InitStock) had these stable
  // variables. Motoko will not implicitly discard them, so we name them in the
  // migration input to consume — and intentionally drop — them. The old
  // StockHub data was mock-only and is not carried forward.
  type StockInternal = {
    symbol : Text;
    name : Text;
    price : Float;
    changePercent : Float;
    open : Float;
    high : Float;
    low : Float;
    volume : Nat;
    priceHistory : [Float];
  };

  type HoldingInternal = {
    symbol : Text;
    quantity : Float;
    avgCost : Float;
  };

  type OldActor = {
    stocks : Map.Map<Text, StockInternal>;
    holdings : List.List<HoldingInternal>;
  };

  type NewActor = {
    tickers : Map.Map<Text, TickerInternal>;
    watchlist : List.List<Text>;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      tickers = Map.empty<Text, TickerInternal>();
      watchlist = List.empty<Text>();
    };
  };
};
