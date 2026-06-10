import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Types "types/ticker";
import TickerApiMixin "mixins/ticker-api";

actor {
  let tickers : Map.Map<Text, Types.Ticker>;
  let userWatchlists : Map.Map<Principal, List.List<Text>>;
  let credentialVaults : Map.Map<Principal, Text>;

  include TickerApiMixin(tickers, userWatchlists, credentialVaults);
};
