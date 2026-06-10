import Map "mo:core/Map";
import List "mo:core/List";
import Types "types/stock";
import StockApiMixin "mixins/stock-api";

actor {
  let stocks : Map.Map<Text, Types.Stock>;
  let holdings : List.List<Types.PortfolioHolding>;

  include StockApiMixin(stocks, holdings);
};

