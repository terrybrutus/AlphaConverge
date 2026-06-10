import Types "common";

module {
  public type Stock = {
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

  public type PortfolioHolding = {
    symbol : Text;
    quantity : Float;
    avgCost : Float;
  };

  public type PortfolioSummary = {
    totalValue : Float;
    totalGainLoss : Float;
    holdings : [PortfolioHolding];
  };
};
