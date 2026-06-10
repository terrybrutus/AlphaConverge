import Map "mo:core/Map";
import List "mo:core/List";
import Types "../types/ticker";
import TickerLib "../lib/ticker";

mixin (tickers : Map.Map<Text, Types.Ticker>, watchlist : List.List<Text>) {
  // Read the full universe of tickers (raw signal facts). The convergence
  // engine scores these client-side.
  public query func getTickers() : async [Types.Ticker] {
    TickerLib.getAll(tickers);
  };

  public query func getTicker(symbol : Text) : async ?Types.Ticker {
    TickerLib.getBySymbol(tickers, symbol);
  };

  // Insert or replace a ticker's raw signals. This is the write path the data
  // layer (HTTP outcalls from a scheduled refresh) uses to populate live facts.
  public func upsertTicker(ticker : Types.Ticker) : async () {
    TickerLib.upsert(tickers, ticker);
  };

  public query func getWatchlist() : async [Text] {
    TickerLib.getWatchlist(watchlist);
  };

  public func addToWatchlist(symbol : Text) : async () {
    TickerLib.addToWatchlist(watchlist, symbol);
  };
};
