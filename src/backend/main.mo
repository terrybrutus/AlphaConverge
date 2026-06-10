import Map "mo:core/Map";
import List "mo:core/List";
import Types "types/ticker";
import TickerApiMixin "mixins/ticker-api";

actor {
  let tickers : Map.Map<Text, Types.Ticker>;
  let watchlist : List.List<Text>;

  include TickerApiMixin(tickers, watchlist);
};
