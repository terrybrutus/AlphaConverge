import Map "mo:core/Map";
import List "mo:core/List";
import Types "../types/stock";
import StockLib "../lib/stock";

mixin (stocks : Map.Map<Text, Types.Stock>, holdings : List.List<Types.PortfolioHolding>) {
  public query func getStocks() : async [Types.Stock] {
    StockLib.getAll(stocks);
  };

  public query func getStock(symbol : Text) : async ?Types.Stock {
    StockLib.getBySymbol(stocks, symbol);
  };

  public query func getPortfolio() : async Types.PortfolioSummary {
    StockLib.buildPortfolioSummary(stocks, holdings);
  };
};
