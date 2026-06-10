import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Types "../types/ticker";
import TickerLib "../lib/ticker";

mixin (
  tickers : Map.Map<Text, Types.Ticker>,
  userWatchlists : Map.Map<Principal, List.List<Text>>,
  credentialVaults : Map.Map<Principal, Text>,
) {
  // Required by Caffeine's InternetIdentityProvider after a plain II sign-in.
  // User records are created lazily, so initialization needs no storage write.
  public shared ({ caller }) func _initialize_access_control() : async () {
    assert not Principal.isAnonymous(caller);
  };

  // Read the full universe of tickers (raw signal facts). The convergence
  // engine scores these client-side.
  public query func getTickers() : async [Types.Ticker] {
    TickerLib.getAll(tickers);
  };

  public query func getTicker(symbol : Text) : async ?Types.Ticker {
    TickerLib.getBySymbol(tickers, symbol);
  };

  public shared query ({ caller }) func getWatchlist() : async [Text] {
    if (Principal.isAnonymous(caller)) return [];
    TickerLib.getWatchlist(userWatchlists, caller);
  };

  // One explicit update replaces the whole list, minimizing update calls and
  // cycle use when a user syncs from the browser. There are intentionally no
  // single-symbol update endpoints or public shared-market-data write endpoint.
  public shared ({ caller }) func setWatchlist(symbols : [Text]) : async () {
    assert not Principal.isAnonymous(caller);
    TickerLib.setWatchlist(userWatchlists, caller, symbols);
  };

  // The browser encrypts/decrypts this payload. The canister never receives
  // provider keys or the user's vault passphrase in plaintext.
  public shared query ({ caller }) func getCredentialVault() : async ?Text {
    if (Principal.isAnonymous(caller)) return null;
    credentialVaults.get(caller);
  };

  public shared ({ caller }) func setCredentialVault(vault : Text) : async () {
    assert not Principal.isAnonymous(caller);
    assert Text.size(vault) <= 16_384;
    credentialVaults.add(caller, vault);
  };
};
