import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Types "../types/ticker";

module {
  // ---------------------------------------------------------------------------
  // Sample preview universe.
  //
  // Every record here is flagged `sample = true`. These are ILLUSTRATIVE inputs
  // used to exercise the convergence engine and render the UI before live data
  // providers are connected. They are not market truth. See DATA.md for the
  // wiring plan that replaces this seed with HTTP-outcall-sourced facts.
  // ---------------------------------------------------------------------------
  public func seedData() : [Types.Ticker] {
    [
      {
        symbol = "ACME";
        name = "Acme Robotics";
        sector = "Industrials";
        price = 6.94;
        priceHistory = [22.0, 19.5, 17.0, 14.2, 11.8, 9.9, 8.4, 7.1, 6.2, 5.4, 4.9, 4.44, 4.6, 4.9, 5.3, 5.1, 5.6, 6.0, 5.8, 6.3, 6.7, 6.5, 6.8, 6.94];
        pctAbove52wLow = 11.0;
        volumeContraction = 0.82;
        weeklyBullishDivergence = true;
        monthlyBullishDivergence = true;
        firstHigherHigh = false;
        nearMajorSupport = true;
        revenueGrowthAccel = 4.5;
        estimateRevision = 0.4;
        peVs5yrAvg = 0.6;
        psVsSector = 0.7;
        insiderBuy90d = true;
        instOwnershipChange = 1.8;
        shortInterestPct = 19.0;
        unusualCallActivity = true;
        darkPoolAccumulation = true;
        putCallShift = -0.5;
        redditMentionVelocity = 1.4;
        newsSentiment = 0.2;
        analystUpgrade = false;
        googleTrendsSlope = 0.3;
        sectorEtfInflow = 0.4;
        macroRiskOn = true;
        sectorNarrative = true;
        impliedVolatilityPctile = 74.0;
        sample = true;
      },
      {
        symbol = "VOLT";
        name = "Voltgrid Energy";
        sector = "Clean Energy";
        price = 2.18;
        priceHistory = [9.8, 8.5, 7.2, 6.0, 4.9, 3.8, 3.0, 2.4, 2.0, 1.7, 1.55, 1.62, 1.7, 1.8, 1.74, 1.9, 2.0, 1.95, 2.05, 2.1, 2.0, 2.12, 2.15, 2.18];
        pctAbove52wLow = 40.0;
        volumeContraction = 0.7;
        weeklyBullishDivergence = true;
        monthlyBullishDivergence = false;
        firstHigherHigh = false;
        nearMajorSupport = true;
        revenueGrowthAccel = 8.0;
        estimateRevision = 0.2;
        peVs5yrAvg = 0.0;
        psVsSector = 0.5;
        insiderBuy90d = false;
        instOwnershipChange = 0.6;
        shortInterestPct = 41.0;
        unusualCallActivity = true;
        darkPoolAccumulation = false;
        putCallShift = -0.3;
        redditMentionVelocity = 2.1;
        newsSentiment = 0.1;
        analystUpgrade = false;
        googleTrendsSlope = 0.5;
        sectorEtfInflow = 0.6;
        macroRiskOn = true;
        sectorNarrative = true;
        impliedVolatilityPctile = 88.0;
        sample = true;
      },
      {
        symbol = "NOVA";
        name = "Nova Cloud Systems";
        sector = "Software";
        price = 18.40;
        priceHistory = [31.0, 28.5, 25.0, 22.4, 20.1, 18.0, 16.5, 15.2, 14.8, 15.4, 16.0, 15.6, 16.4, 17.0, 16.6, 17.4, 17.0, 17.8, 18.2, 17.6, 18.0, 18.6, 18.1, 18.40];
        pctAbove52wLow = 24.0;
        volumeContraction = 0.55;
        weeklyBullishDivergence = true;
        monthlyBullishDivergence = true;
        firstHigherHigh = true;
        nearMajorSupport = false;
        revenueGrowthAccel = 6.0;
        estimateRevision = 0.6;
        peVs5yrAvg = 0.8;
        psVsSector = 0.85;
        insiderBuy90d = true;
        instOwnershipChange = 2.4;
        shortInterestPct = 22.0;
        unusualCallActivity = true;
        darkPoolAccumulation = true;
        putCallShift = -0.6;
        redditMentionVelocity = 1.1;
        newsSentiment = 0.4;
        analystUpgrade = true;
        googleTrendsSlope = 0.2;
        sectorEtfInflow = 0.5;
        macroRiskOn = true;
        sectorNarrative = true;
        impliedVolatilityPctile = 52.0;
        sample = true;
      },
      {
        symbol = "ORBT";
        name = "Orbit Semiconductors";
        sector = "Semiconductors";
        price = 41.20;
        priceHistory = [18.0, 19.5, 21.0, 23.4, 22.0, 24.5, 26.0, 28.4, 27.0, 30.0, 32.5, 31.0, 34.0, 36.5, 35.0, 37.5, 39.0, 38.0, 40.0, 41.5, 40.2, 41.8, 40.9, 41.20];
        pctAbove52wLow = 130.0;
        volumeContraction = 0.3;
        weeklyBullishDivergence = false;
        monthlyBullishDivergence = false;
        firstHigherHigh = true;
        nearMajorSupport = false;
        revenueGrowthAccel = 3.0;
        estimateRevision = 0.5;
        peVs5yrAvg = 1.3;
        psVsSector = 1.2;
        insiderBuy90d = false;
        instOwnershipChange = 1.0;
        shortInterestPct = 4.0;
        unusualCallActivity = false;
        darkPoolAccumulation = false;
        putCallShift = 0.1;
        redditMentionVelocity = 0.3;
        newsSentiment = 0.3;
        analystUpgrade = true;
        googleTrendsSlope = 0.1;
        sectorEtfInflow = 0.7;
        macroRiskOn = true;
        sectorNarrative = true;
        impliedVolatilityPctile = 38.0;
        sample = true;
      },
      {
        symbol = "HRBR";
        name = "Harbor Retail Group";
        sector = "Consumer";
        price = 12.05;
        priceHistory = [14.0, 13.6, 14.2, 13.8, 14.1, 13.7, 14.0, 13.5, 13.9, 13.4, 13.8, 13.2, 13.6, 13.0, 13.4, 12.8, 13.1, 12.6, 12.9, 12.4, 12.7, 12.2, 12.3, 12.05];
        pctAbove52wLow = 6.0;
        volumeContraction = 0.2;
        weeklyBullishDivergence = false;
        monthlyBullishDivergence = false;
        firstHigherHigh = false;
        nearMajorSupport = false;
        revenueGrowthAccel = -2.0;
        estimateRevision = -0.4;
        peVs5yrAvg = 0.9;
        psVsSector = 1.0;
        insiderBuy90d = false;
        instOwnershipChange = -0.8;
        shortInterestPct = 7.0;
        unusualCallActivity = false;
        darkPoolAccumulation = false;
        putCallShift = 0.3;
        redditMentionVelocity = -0.2;
        newsSentiment = -0.3;
        analystUpgrade = false;
        googleTrendsSlope = -0.2;
        sectorEtfInflow = -0.3;
        macroRiskOn = false;
        sectorNarrative = false;
        impliedVolatilityPctile = 45.0;
        sample = true;
      },
      {
        symbol = "MINT";
        name = "Mint Bioworks";
        sector = "Biotech";
        price = 3.05;
        priceHistory = [12.0, 10.5, 8.8, 7.0, 5.5, 4.2, 3.3, 2.7, 2.3, 2.1, 2.0, 2.15, 2.3, 2.2, 2.45, 2.6, 2.5, 2.7, 2.85, 2.75, 2.9, 3.0, 2.95, 3.05];
        pctAbove52wLow = 52.0;
        volumeContraction = 0.6;
        weeklyBullishDivergence = true;
        monthlyBullishDivergence = false;
        firstHigherHigh = true;
        nearMajorSupport = true;
        revenueGrowthAccel = 0.0;
        estimateRevision = 0.1;
        peVs5yrAvg = 0.0;
        psVsSector = 0.4;
        insiderBuy90d = true;
        instOwnershipChange = 1.2;
        shortInterestPct = 28.0;
        unusualCallActivity = true;
        darkPoolAccumulation = false;
        putCallShift = -0.4;
        redditMentionVelocity = 1.8;
        newsSentiment = 0.0;
        analystUpgrade = false;
        googleTrendsSlope = 0.4;
        sectorEtfInflow = 0.1;
        macroRiskOn = true;
        sectorNarrative = false;
        impliedVolatilityPctile = 91.0;
        sample = true;
      },
      {
        symbol = "FRST";
        name = "Forest Design Labs";
        sector = "Software";
        price = 27.30;
        priceHistory = [44.0, 41.0, 38.5, 35.0, 32.4, 30.1, 28.0, 26.5, 25.8, 26.4, 25.9, 26.6, 25.7, 26.8, 26.0, 27.0, 26.4, 27.2, 26.6, 27.4, 26.9, 27.5, 27.0, 27.30];
        pctAbove52wLow = 9.0;
        volumeContraction = 0.78;
        weeklyBullishDivergence = true;
        monthlyBullishDivergence = false;
        firstHigherHigh = false;
        nearMajorSupport = true;
        revenueGrowthAccel = 2.5;
        estimateRevision = 0.3;
        peVs5yrAvg = 0.7;
        psVsSector = 0.8;
        insiderBuy90d = false;
        instOwnershipChange = 0.4;
        shortInterestPct = 12.0;
        unusualCallActivity = false;
        darkPoolAccumulation = true;
        putCallShift = -0.2;
        redditMentionVelocity = 0.6;
        newsSentiment = 0.1;
        analystUpgrade = false;
        googleTrendsSlope = 0.1;
        sectorEtfInflow = 0.2;
        macroRiskOn = true;
        sectorNarrative = false;
        impliedVolatilityPctile = 49.0;
        sample = true;
      },
    ];
  };

  public func seedTickers(tickers : Map.Map<Text, Types.Ticker>) : () {
    for (t in seedData().vals()) {
      tickers.add(t.symbol, t);
    };
  };

  public func getAll(tickers : Map.Map<Text, Types.Ticker>) : [Types.Ticker] {
    // Fall back to the labeled sample universe until live data is seeded.
    if (tickers.size() == 0) {
      return seedData();
    };
    let result = List.empty<Types.Ticker>();
    for ((_, t) in tickers.entries()) {
      result.add(t);
    };
    result.toArray();
  };

  public func getBySymbol(tickers : Map.Map<Text, Types.Ticker>, symbol : Text) : ?Types.Ticker {
    switch (tickers.get(symbol)) {
      case (?t) { ?t };
      case null {
        // Fall back to sample universe lookup.
        for (t in seedData().vals()) {
          if (t.symbol == symbol) { return ?t };
        };
        null;
      };
    };
  };

  public func getWatchlist(
    userWatchlists : Map.Map<Principal, List.List<Text>>,
    caller : Principal,
  ) : [Text] {
    switch (userWatchlists.get(caller)) {
      case (?watchlist) { watchlist.toArray() };
      case null { [] };
    };
  };

  public func setWatchlist(
    userWatchlists : Map.Map<Principal, List.List<Text>>,
    caller : Principal,
    symbols : [Text],
  ) : () {
    assert symbols.size() <= 100;
    let watchlist = List.empty<Text>();
    for (symbol in symbols.vals()) {
      assert symbol.size() > 0 and symbol.size() <= 12;
      var duplicate = false;
      for (existing in watchlist.toArray().vals()) {
        if (existing == symbol) { duplicate := true };
      };
      if (not duplicate) { watchlist.add(symbol) };
    };
    switch (userWatchlists.get(caller)) {
      case (?existing) {
        let old = existing.toArray();
        let next = watchlist.toArray();
        if (old.size() == next.size()) {
          var same = true;
          var i = 0;
          while (i < old.size()) {
            if (old[i] != next[i]) { same := false };
            i += 1;
          };
          if (same) { return };
        };
      };
      case null {};
    };
    userWatchlists.add(caller, watchlist);
  };
};
