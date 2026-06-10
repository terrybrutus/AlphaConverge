import Map "mo:core/Map";
import List "mo:core/List";

module {
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

  type OldActor = {};

  type NewActor = {
    stocks : Map.Map<Text, StockInternal>;
    holdings : List.List<HoldingInternal>;
  };

  public func migration(_ : OldActor) : NewActor {
    {
      stocks = Map.empty<Text, StockInternal>();
      holdings = List.empty<HoldingInternal>();
    };
  };
};
