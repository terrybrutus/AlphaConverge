import Map "mo:core/Map";
import List "mo:core/List";
import Types "../types/stock";

module {
  public func seedData() : [Types.Stock] {
    [
      {
        symbol = "AAPL";
        name = "Apple Inc.";
        price = 189.30;
        changePercent = 1.24;
        open = 186.78;
        high = 190.15;
        low = 186.10;
        volume = 54_320_100;
        priceHistory = [162.5, 165.0, 167.8, 170.2, 168.9, 172.4, 175.1, 173.6, 176.0, 178.5, 177.2, 180.3, 182.0, 179.8, 183.4, 185.2, 184.0, 186.5, 188.1, 186.9, 187.5, 189.0, 188.3, 190.5, 191.2, 189.8, 188.7, 190.0, 189.5, 189.30];
      },
      {
        symbol = "GOOGL";
        name = "Alphabet Inc.";
        price = 141.80;
        changePercent = -0.56;
        open = 142.65;
        high = 143.20;
        low = 141.10;
        volume = 21_450_800;
        priceHistory = [120.0, 122.5, 124.8, 123.2, 126.0, 128.4, 127.1, 129.5, 131.2, 130.0, 132.8, 134.5, 133.1, 135.6, 137.0, 136.2, 138.4, 139.8, 138.5, 140.2, 141.5, 140.8, 142.0, 143.1, 142.5, 141.2, 140.5, 141.8, 142.3, 141.80];
      },
      {
        symbol = "MSFT";
        name = "Microsoft Corp.";
        price = 378.85;
        changePercent = 0.92;
        open = 375.40;
        high = 380.20;
        low = 374.80;
        volume = 18_920_500;
        priceHistory = [330.0, 335.2, 338.5, 336.0, 340.1, 344.8, 342.5, 346.0, 350.2, 348.6, 352.3, 355.0, 353.2, 357.4, 360.0, 358.5, 362.1, 365.8, 364.0, 367.5, 370.2, 368.8, 372.0, 374.5, 376.2, 374.8, 375.5, 377.0, 378.2, 378.85];
      },
      {
        symbol = "AMZN";
        name = "Amazon.com Inc.";
        price = 185.50;
        changePercent = 2.15;
        open = 181.60;
        high = 186.30;
        low = 181.20;
        volume = 35_670_200;
        priceHistory = [155.0, 158.2, 161.5, 159.8, 163.0, 166.4, 164.8, 167.5, 170.2, 168.5, 171.8, 174.5, 172.6, 175.8, 178.0, 176.2, 179.4, 181.0, 179.5, 182.0, 183.5, 182.0, 184.2, 185.8, 184.5, 183.2, 182.8, 184.0, 185.0, 185.50];
      },
      {
        symbol = "TSLA";
        name = "Tesla Inc.";
        price = 248.42;
        changePercent = -1.87;
        open = 253.10;
        high = 254.50;
        low = 247.20;
        volume = 92_150_400;
        priceHistory = [210.0, 215.5, 220.2, 218.0, 225.4, 230.1, 228.5, 235.0, 240.2, 237.5, 243.0, 248.5, 245.0, 250.2, 255.1, 252.8, 258.0, 262.5, 258.2, 260.5, 263.0, 258.5, 255.0, 252.0, 255.5, 258.0, 252.5, 250.0, 252.0, 248.42];
      },
      {
        symbol = "NVDA";
        name = "NVIDIA Corp.";
        price = 875.40;
        changePercent = 3.42;
        open = 846.50;
        high = 880.20;
        low = 844.10;
        volume = 41_230_700;
        priceHistory = [650.0, 668.5, 685.2, 672.0, 695.4, 712.8, 705.0, 725.5, 742.0, 730.5, 750.2, 768.5, 755.0, 780.2, 795.5, 782.0, 800.8, 820.5, 810.2, 828.0, 842.5, 830.0, 845.2, 855.8, 848.5, 858.0, 862.5, 855.0, 860.0, 875.40];
      },
    ]
  };

  public func seedStocks(stocks : Map.Map<Text, Types.Stock>) : () {
    for (stock in seedData().vals()) {
      stocks.add(stock.symbol, stock);
    };
  };

  public func getAll(stocks : Map.Map<Text, Types.Stock>) : [Types.Stock] {
    // Return static mock data if the map hasn't been seeded yet
    if (stocks.size() == 0) {
      return seedData();
    };
    let result = List.empty<Types.Stock>();
    for ((_, stock) in stocks.entries()) {
      result.add(stock);
    };
    result.toArray();
  };

  public func getBySymbol(stocks : Map.Map<Text, Types.Stock>, symbol : Text) : ?Types.Stock {
    stocks.get(symbol);
  };

  public func buildPortfolioSummary(
    stocks : Map.Map<Text, Types.Stock>,
    holdings : List.List<Types.PortfolioHolding>
  ) : Types.PortfolioSummary {
    // Use mock holdings when none are stored yet
    let stocksArr = if (stocks.size() == 0) { seedData() } else {
      let result = List.empty<Types.Stock>();
      for ((_, s) in stocks.entries()) { result.add(s) };
      result.toArray();
    };
    let stockMap = Map.empty<Text, Float>();
    for (s in stocksArr.vals()) { stockMap.add(s.symbol, s.price) };

    let holdingsArr : [Types.PortfolioHolding] = if (holdings.size() == 0) {
      [
        { symbol = "AAPL"; quantity = 10.0; avgCost = 155.20 },
        { symbol = "NVDA"; quantity = 5.0; avgCost = 680.50 },
        { symbol = "MSFT"; quantity = 8.0; avgCost = 310.75 },
        { symbol = "TSLA"; quantity = 15.0; avgCost = 220.00 },
      ]
    } else { holdings.toArray() };

    var totalValue = 0.0;
    var totalCost = 0.0;
    for (h in holdingsArr.vals()) {
      let currentPrice = switch (stockMap.get(h.symbol)) {
        case (?p) { p };
        case null { 0.0 };
      };
      totalValue += currentPrice * h.quantity;
      totalCost += h.avgCost * h.quantity;
    };
    { totalValue; totalGainLoss = totalValue - totalCost; holdings = holdingsArr };
  };
};
