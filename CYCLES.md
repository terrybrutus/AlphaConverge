# Cycle-conscious architecture

AlphaConverge deliberately keeps recurring market-data work out of the ICP
canister.

## Browser-side work (no canister cycles)

- Price, Finnhub, and Anthropic API calls
- Technical calculations and convergence scoring
- Batch scans and pacing
- Walk-forward backtests and statistics
- API keys, held only in memory for the current browser session
- API-key vault encryption and decryption

## Canister work

- Public queries for shared preview facts
- One authenticated, per-principal watchlist read after an identity signs in
- One explicit `setWatchlist` update when the user clicks **Sync watchlist**
- One explicit encrypted-vault update when the user clicks **Save encrypted**

There are no scheduled canister jobs, canister HTTP outcalls, or automatic
watchlist writes. This keeps cycle usage predictable and avoids spending cycles
every time a ticker is scanned or scored.

The browser skips an unchanged watchlist sync, and the canister avoids rewriting
stable watchlist storage when an identical payload is submitted directly.

## Security boundaries

- Shared ticker writes are disabled until a trusted writer is configured.
- No shared ticker write or single-symbol watchlist update endpoints are
  exposed; this avoids callable no-op/failure paths that could still consume
  update execution.
- Anonymous callers cannot write watchlists.
- Watchlists are capped at 100 short symbols to bound storage and update work.
- Provider API keys are not stored in localStorage or plaintext canister state.
- Identity changes and sign-out clear the prior user's in-memory keys,
  watchlist, live results, and AI notes before loading another user's data.
- Cross-device API-key sync uses PBKDF2 + AES-GCM in the browser; the canister
  stores ciphertext only and never receives the vault passphrase.
