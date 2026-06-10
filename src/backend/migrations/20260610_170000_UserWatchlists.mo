import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
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

  type OldActor = {
    tickers : Map.Map<Text, TickerInternal>;
    watchlist : List.List<Text>;
  };

  type NewActor = {
    tickers : Map.Map<Text, TickerInternal>;
    userWatchlists : Map.Map<Principal, List.List<Text>>;
  };

  public func migration(old : OldActor) : NewActor {
    {
      tickers = old.tickers;
      // The previous list was shared and cannot safely be assigned to a user.
      userWatchlists = Map.empty<Principal, List.List<Text>>();
    };
  };
};
