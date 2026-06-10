# Project Guidance

> **AlphaConverge** — a stock-market signal-convergence engine on Caffeine/ICP.
> It scores US equities across six independent categories (technical,
> fundamental, microstructure, sentiment, macro, lifecycle stage) and surfaces a
> ranked list of "Plays" only when ≥4 dimensions converge. The convergence logic
> lives in `src/frontend/src/lib/convergence.ts` and is the core IP. The backend
> stores raw per-ticker signal facts; the frontend scores them client-side.
>
> See `DATA.md` for how to replace the labeled sample universe with live data.

## Architecture map

- `src/backend/types/ticker.mo` — raw signal facts per equity (the engine inputs)
- `src/backend/lib/ticker.mo` — sample seed + getters + watchlist
- `src/backend/mixins/ticker-api.mo` — canister query/update methods
- `src/frontend/src/types/ticker.ts` — TS mirror of inputs + engine output types
- `src/frontend/src/lib/convergence.ts` — scoring, stage, instrument, fatigue
- `src/frontend/src/data/sampleUniverse.ts` — labeled preview universe (fallback)
- `src/frontend/src/components/PlayCard.tsx` — the centerpiece UI artifact
- `src/frontend/src/pages/ScreenerPage.tsx` / `TickerDetailPage.tsx` — the two views
- `src/frontend/src/lib/technicals.ts` — REAL technical analysis from OHLCV (RSI/divergence/base/HH)
- `src/frontend/src/lib/providers/` — market-data provider interface + Alpha Vantage (browser-side)
- `src/frontend/src/lib/liveTicker.ts` — builds a scorable ticker from real candles
- `src/frontend/src/lib/liveStore.ts` — zustand store: API key + live symbols + fetch state

## Live data status

- **Technical is live** for any ticker added under "Live tickers" (free Alpha
  Vantage key, browser-side fetch). The other four categories are honestly
  marked "no source connected" via `TickerRaw.availability` until their
  providers are wired — they never fabricate signals.
- Market data is fetched **browser-side** (not via canister HTTP outcalls) to
  avoid ICP consensus issues with non-deterministic API responses. The canister
  is for watchlist/history persistence.

## Honesty constraints (do not violate)

- Never present a number as live market data unless it came from a connected
  provider. Preview data stays flagged `sample: true` and badged in the UI.
- An unavailable signal scores as "not fired" — it is never fabricated.

## User Preferences

[No preferences yet]

## Verified Commands

**Frontend** (run from `src/frontend/`):

- **install**: `pnpm install --prefer-offline`
- **typecheck**: `pnpm typecheck`
- **lint fix**: `pnpm fix`
- **build**: `pnpm build`

**Backend** (run from `src/backend/`):

- **install**: `mops install`
- **typecheck**: `mops check --fix`
- **build**: `mops build`

**Backend and frontend integration** (run from root):

- **generate bindings**: `pnpm bindgen` This step is necessary to ensure the frontend can call the backend methods.

## Learnings

- The web/remote session has Node + pnpm but **no `mops`/`moc`** — the Motoko
  backend compiles on Caffeine import, not here. Verify the frontend locally
  (`pnpm typecheck`, `pnpm check`, `pnpm build` all pass on this build) and keep
  backend changes mirrored to the existing patterns since they can't be compiled
  in-session.
- `dist/` build artifacts were untracked from git (they are gitignored and
  Caffeine rebuilds them); only source is committed.
- Backend stable shape moved from `{stocks, holdings}` (the old StockHub
  placeholder) to `{tickers, watchlist}` via a forward migration in
  `src/backend/migrations/`. The old data was mock-only and is intentionally
  dropped.
