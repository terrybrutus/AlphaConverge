# AlphaConverge — Data Wiring Plan

AlphaConverge ships today with a **labeled sample universe** so the convergence
engine and UI are fully navigable. Nothing in the app is presented as live
market truth until you connect real sources. This document is the checklist for
that wiring.

## Status — what is already live

- **Technical category is real.** Add any US ticker under **Live tickers** on
  the Screener (with a free Alpha Vantage key) and the app fetches weekly
  candles and computes the technical signals — RSI bullish divergence
  (weekly + monthly), base formation, first higher high, % above 52-week low,
  volume contraction, support proximity — in
  `src/frontend/src/lib/technicals.ts`. Stage classification and the instrument
  recommendation then run on real structure.
- **Fundamental category is partially real** (add a free Finnhub key). Via
  `lib/providers/finnhub.ts` it sources, best-effort: **insider buying (90d)**
  from insider transactions, **estimate-revision direction** from the analyst
  recommendation trend, and a **revenue-growth-acceleration** proxy from
  metrics. Sub-signals Finnhub's free tier doesn't provide (P/E-vs-5yr,
  P/S-vs-sector, 13F institutional change) are marked **"no data"** per signal —
  they are excluded from scoring, never faked. The authoritative source for raw
  insider/13F detail is SEC EDGAR (keyless, but browser-blocked → needs a
  canister HTTP outcall); wire that when you want filing-level depth.
- **Honest by construction.** A live ticker only has data for the Technical
  category; the other four are shown as **“no source connected”** and cannot
  count toward convergence, so a live ticker won’t surface on technicals alone.
  Sample tickers remain badged **Preview**.
- **Architecture decision.** Public market data is fetched **browser-side**
  (per the project’s original design), not via canister HTTP outcalls — this
  avoids the ICP consensus problem for non-deterministic API responses and
  needs no cycles. The canister is reserved for watchlist/history persistence.
  Files: `lib/providers/` (provider interface + Alpha Vantage), `lib/liveTicker.ts`
  (candles → scorable ticker), `lib/liveStore.ts` (key + symbols + fetch state).

- **Sentiment category is partially real** (same Finnhub key). Via
  `lib/providers/finnhub.ts` it sources **news-headline sentiment** (a transparent
  finance lexicon over the last 14 days of company headlines) and **analyst
  upgrade** (recommendation trend improving vs the prior period). Reddit mention
  velocity and Google Trends are **CORS-blocked from the browser**, so they are
  marked "no data" per signal. With Technical + Fundamental + Sentiment a live
  ticker can reach 4/6 dimensions and **surface as a full Play**.
- **AI read (optional).** On any ticker's detail page, an on-click **AI read**
  (`lib/ai/analyze.ts`) sends the engine's computed signals to **Claude Haiku
  4.5** and returns a plain-language thesis + bull/bear case + what would
  invalidate the setup. Cheapest model, runs only on click, uses the user's own
  Anthropic key (stored in-browser, sent direct to Anthropic via the documented
  browser-access header). It reads *only* the engine's signals — it does not
  invent data, and it names categories that have no source.

Each remaining category below becomes real by adding a provider that fills its
fields and flipping its `availability` flag in `buildLiveTicker`.

## Architecture (how data reaches the engine)

```
External APIs ──HTTP outcall──▶ Motoko backend ──query──▶ React frontend ──▶ convergence engine
   (live facts)                  (canister: tickers,        (scoreUniverse)      (Play cards)
                                  watchlist, history)
```

- On ICP, canisters cannot call arbitrary HTTP directly. Outbound requests go
  through **HTTP outcalls**, where every replica must reach consensus on the
  response. Non-deterministic fields (timestamps, request IDs) must be stripped
  in a **transform function** or the call fails consensus.
- A scheduled refresh populates each `Ticker`'s raw signal fields (see
  `src/backend/types/ticker.mo`) via `upsertTicker`.
- The frontend reads the universe and runs the engine client-side
  (`src/frontend/src/lib/convergence.ts`). The scoring logic never changes when
  you swap sample data for live data — only the inputs do.

## The six categories and where each field comes from

| Engine field(s) | Category | Source | Auth | Notes |
| --- | --- | --- | --- | --- |
| `priceHistory`, `pctAbove52wLow`, `volumeContraction`, `weeklyBullishDivergence`, `monthlyBullishDivergence`, `firstHigherHigh`, `nearMajorSupport` | Technical | Polygon.io or Alpha Vantage (OHLCV) | API key | Divergence/base/HH are computed from the candles, not fetched. See "Derived technicals". |
| `revenueGrowthAccel`, `estimateRevision`, `peVs5yrAvg`, `psVsSector` | Fundamental | Alpha Vantage `OVERVIEW`/`EARNINGS`, or Financial Modeling Prep | API key | `revenueGrowthAccel` = (latest YoY growth − prior YoY growth). |
| `insiderBuy90d`, `instOwnershipChange` | Fundamental | **SEC EDGAR** (Form 4, 13F) | none (free) | EDGAR is free and keyless; just set a descriptive `User-Agent`. |
| `shortInterestPct` | Fundamental/Micro | FINRA short interest / Nasdaq | varies | Bi-monthly cadence. |
| `unusualCallActivity`, `darkPoolAccumulation`, `putCallShift` | Microstructure | Unusual Whales / Market Chameleon (options flow) | API key (freemium) | Hardest/most expensive surface; start with put/call ratio from a cheaper feed. |
| `redditMentionVelocity` | Sentiment | Reddit API (r/wallstreetbets, r/stocks, r/investing) | OAuth (free tier) | Velocity = z-score of mention count vs trailing mean. |
| `newsSentiment` | Sentiment | News API + OpenAI NLP (via Caffeine OpenAI integration) | API key | Score headlines −1..1. |
| `analystUpgrade` | Sentiment | Alpha Vantage / FMP ratings | API key | |
| `googleTrendsSlope` | Sentiment | Google Trends (unofficial) | none | |
| `sectorEtfInflow`, `macroRiskOn`, `sectorNarrative` | Macro | ETF flow data + a macro calendar; `sectorNarrative` may be an OpenAI classification | mixed | |
| `impliedVolatilityPctile` | Instrument selection | Options chain provider | API key | Drives CSP vs call choice. |

## Derived technicals (compute, don't fetch)

These are calculated from `priceHistory` (weekly closes) rather than pulled from
an API — implement them in the backend refresh or a shared TS util:

- **Bullish divergence**: price makes a lower low while RSI/MACD makes a higher
  low over the lookback window.
- **Base formation**: range width and volume both contracting after a decline.
- **First higher high**: most recent swing high exceeds the prior swing high.
- **`pctAbove52wLow`**: `(price − min(52w)) / min(52w) * 100`.

## Recommended build order

1. **Price + EDGAR first** (free/keyless EDGAR, cheap price data). That already
   powers Technical + the insider/institutional parts of Fundamental — enough
   for real Play cards.
2. **Reddit + news sentiment** next (free tiers + OpenAI).
3. **Options flow last** (most expensive). Until then, the microstructure
   category simply scores lower; the engine degrades gracefully.

## Honesty rules (enforced in the UI)

- Any ticker whose facts did not come from a connected provider keeps
  `sample = true` and is badged **Preview** with the `SampleDataBanner`.
- When a data source is unavailable, mark the affected fields as unknown rather
  than guessing — an unknown signal scores as "not fired", it is never faked.

## Known follow-ups in the current scaffold

- `removeFromWatchlist` is not yet exposed by the backend (the in-place List
  mutation needs the verified `mo:core` List API). Add it alongside the live
  data refresh.
- The frontend currently reads `SAMPLE_UNIVERSE`; switch `ScreenerPage` /
  `TickerDetailPage` to read from the canister (`getTickers`/`getTicker`) once
  `pnpm bindgen` has regenerated bindings against the new backend interface.
