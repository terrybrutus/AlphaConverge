# AlphaConverge — Data Wiring Plan

AlphaConverge's Screener analyzes live tickers from connected browser-side
providers. A separate **Examples** page contains a labeled fictional universe
so the complete convergence experience remains navigable without presenting
sample inputs as market truth.

## Discovery — finding candidates without typing symbols

Add one symbol, paste a comma/space-separated list exported from another
screener, or click **Load & scan starter set**. Configure Alpha Vantage,
Twelve Data, Finnhub, and Anthropic keys on **Settings**. Scans are sequential
and paced to the selected provider's per-minute limit. Twelve Data uses one
browser-side queue for ticker, SPY, and sector-ETF calls so benchmark requests
cannot accidentally exceed the limit. Successful live results are cached in
browser storage; provider keys are not.

The result views split names into **Surfaced** (strict independent confirmation),
**Candidates** (technical structure aligned but not independently confirmed),
and **On watch**.

Every live ticker detail now includes an **Evidence acquisition audit**. It
separates sourced-negative evidence from evidence the app could not observe,
shows the maximum score that the completed scan could possibly have produced
from its returned coverage, and records provider requests that succeeded,
failed, were plan-gated, or were deliberately skipped to protect a free quota.
This diagnostic layer does not award points or loosen alignment thresholds.

## Opportunity models

AlphaConverge no longer assumes every valid opportunity must resemble an early
bottom reversal. The same sourced facts are evaluated against separate
research hypotheses:

- **Fundamental Inflection** requires revenue-growth acceleration plus
  medium-term market confirmation.
- **Value Recovery** requires discounted historical valuation plus market
  confirmation, then looks for improving fundamentals.
- **Quality Momentum** uses operating-margin improvement when FMP or Alpha
  Vantage returns sufficient quarterly statements. It remains untestable when
  that evidence is unavailable.
- **Catalyst Underreaction** uses the latest positive earnings surprise when
  FMP or Alpha Vantage returns it. Raised-guidance detection remains a future
  point-in-time source.
- **Early Reversal** preserves the original exhaustion/base thesis as its own
  model rather than treating it as the universal opportunity shape.

Each model shows fit, observable coverage, required-signal blockers, and
evidence windows. Missing required signals leave a model untestable. Model fit
is not presented as historical confidence or a win probability.

Finviz's paid export is not required for manual discovery. Paste a full table
captured by a browser table exporter into the Screener; AlphaConverge detects
the `Ticker` column and scans only those symbols.

## Low-cost full-model validation

Open any live ticker and use **Cheap research validation** to record sourced
manual facts from SEC filings, FINRA, Finviz, an options screen, or another
research source. Each judgment requires a source and date, stays labeled as
manual research, and can be marked confirmed or contradicted. It then
participates in the same strict coverage and scoring rules as provider data.

This makes a manually researched 4/4 possible without paying for a broad
real-time feed. It does not make the process automatic, and a manual judgment
is only as reliable as its source.

Click **Track this setup** before the outcome is known. The **Validation** page
keeps a browser-local forward record of its score, evidence-family count,
coverage, manual-fact count, entry price, and latest refreshed price. This is
the inexpensive honest test of whether 3/4 and 4/4 setups outperform weaker
setups. Refresh tracked tickers periodically to update their outcomes.

No recurring canister timer, canister HTTP outcall, or cycle-consuming scan is
used for this workflow. Evidence and validation records currently remain in
that browser's local storage.

## Screener workflow and quotas

- Imports always show a preview before scanning. The preview reports detected,
  new, existing, duplicate, and rejected values.
- Imported symbols can be added without scanning, scanned only when new, or
  deliberately rescanned.
- Ranked results remain above the collapsed scan-status list.
- Batch scans can be paused and resumed between ticker requests.
- Successful cards can be refreshed individually, selected for bulk refresh,
  tracked in bulk, removed in bulk, or exported to CSV.
- Each refresh keeps a short browser-local score snapshot history so the
  Screener can sort by recent improvement and display score changes.
- Manual research facts expire by signal type. Fast-moving options and
  sentiment facts expire quickly; filing-based facts remain valid longer.

These features remain browser-side and do not consume ICP canister cycles.

## Provider enrichment and free-tier reality

Provider facts are merged signal-by-signal. One provider returning no data
cannot erase a signal sourced by another provider.

- **Finnhub** supplies company profile, insider transactions, and recent
  headline sentiment. It also compares the latest 14 days of company-news
  volume with the preceding 14 days to measure news-attention acceleration.
  Together those two sourced signals make Sentiment align-capable. The app does
  not reinterpret unrelated Finnhub metrics as revenue acceleration or estimate
  revisions.
- **FMP** is queried for quarterly revenue acceleration and historical P/E
  comparison. Its free Basic plan allows 250 calls/day, but fundamental
  endpoints may be plan-gated. Rejected endpoints remain unknown.
- **Alpha Vantage free** is queried for quarterly revenue acceleration and news
  sentiment only during a single-ticker Alpha Vantage scan. It also attempts
  the realtime options endpoint to measure unusual call volume and call-vs-put
  positioning; that endpoint may be plan-gated. Its roughly 25-request/day free
  limit makes enrichment across a broad list impractical.
- **SimFin** and **Tiingo** keys can be stored in the encrypted vault, but they
  are not called during browser scans yet. SimFin is better suited to a bulk
  fundamentals ingestion workflow; Tiingo currently duplicates price/news
  coverage rather than filling a missing independent family.
- **Anthropic AI Read** explains the facts already sourced by the engine. It
  does not search the web or change scores. Anthropic web search can later be
  added as an optional cited research assistant, but should not be allowed to
  turn narrative search results directly into scored financial facts.

The encrypted vault can be overwritten at any time by saving again with the
keys active in the current session. Its passphrase remains unrecoverable. An
optional hint is stored only in the current browser and should never contain
the passphrase itself.

Unfinished scan queues are stored in the browser. Reopening AlphaConverge
restores the remaining tickers as a paused queue so they can be resumed without
reimporting the list. API keys still must be unlocked for the new session.

True whole-market nightly scanning (all ~8,000 US equities) is still a
big-ticket item. Prefer an external worker plus paid data; do not add a canister
timer or canister HTTP-outcall loop without an explicit cycle budget.

## Status — what is already live

- **Technical category is real.** Add any US ticker under **Live tickers** on
  the Screener (with a free Alpha Vantage key) and the app fetches weekly
  candles and computes the technical signals — RSI bullish divergence
  (weekly + monthly), base formation, first higher high, % above 52-week low,
  volume contraction, support proximity — in
  `src/frontend/src/lib/technicals.ts`. Stage classification and the instrument
  recommendation then run on real structure.
- **Fundamental category is partially real** (add a free Finnhub key). Via
  `lib/providers/finnhub.ts` it sources **insider buying (90d)** from insider
  transactions. Finnhub's recommendation trend is not treated as either
  Fundamental estimate revisions or an independent Sentiment confirmation.
  Finnhub's long-term growth metric is not treated as true revenue acceleration.
  Unsupported sub-signals are marked **"no data"** per signal, reduce category
  coverage, and are never faked. A category needs at least 50% coverage before
  it can align. The authoritative source for raw
  insider/13F detail is SEC EDGAR (keyless, but browser-blocked → needs a
  canister HTTP outcall). Prefer an external ingestion worker before adding
  recurring canister outcalls.
- **Honest by construction.** Unsupported signals show **"no data"** and cannot
  count toward convergence or model qualification. Actual coverage depends on
  which configured account endpoints return data. Finnhub can make Sentiment
  align-capable; FMP and single-ticker Alpha Vantage enrichment can add
  Fundamental and opportunity-model facts; Alpha Vantage options can add
  partial Microstructure when the account permits it. The acquisition audit
  reports the observed result instead of assuming theoretical access. Sample
  tickers remain badged **Preview** on Examples.
- **Architecture decision.** Public market data is fetched **browser-side**
  (per the project’s original design), not via canister HTTP outcalls — this
  avoids the ICP consensus problem for non-deterministic API responses and
  needs no cycles. The canister is reserved for explicit, authenticated
  watchlist persistence and encrypted credential-vault ciphertext.
  Files: `lib/providers/` (provider interfaces), `lib/liveTicker.ts`
  (candles → scorable ticker), `lib/liveStore.ts` (symbols, cached results, and
  session-only keys).

- **Sentiment category is partially real** (same Finnhub key). Via
  `lib/providers/finnhub.ts` it sources **news-headline sentiment** (a transparent
  finance lexicon over the last 14 days of company headlines). Analyst
  recommendations are excluded from this family because they overlap with
  fundamental analyst evidence. Reddit mention velocity and Google Trends are
  **CORS-blocked from the browser**, so they are marked "no data" per signal.
- **Macro & sector category is partially real** (`lib/macro.ts`, computed from
  the price provider). **Risk-on backdrop** = the S&P 500 (SPY) is in an
  uptrend; **sector ETF inflows** = the stock's sector ETF outperforming SPY
  over ~12 weeks (rotation proxy, mapped from the Finnhub profile's industry).
  Benchmark candles are cached across a scan. Sector narrative has no free
  deterministic source → "no data". Macro is context and does not replace a
  missing company-specific confirmation.
- **Microstructure requires an independent feed.** Unusual options activity,
  short-squeeze fuel (short interest), dark-pool prints, and put/call shifts
  need **paid** feeds, so live microstructure remains "no data" until one is
  connected. Volume accumulation (OBV) is computed free from price candles, but
  it belongs to Technical because price/volume cannot count as an independent
  positioning confirmation.
- **AI read (optional).** On any ticker's detail page, an on-click **AI read**
  (`lib/ai/analyze.ts`) sends the engine's computed signals to **Claude Haiku
  4.5** and returns a plain-language thesis + bull/bear case + what would
  invalidate the setup. Cheapest model, runs only on click, uses the user's own
  Anthropic key (held in memory for the session, sent direct to Anthropic via the documented
  browser-access header). It reads *only* the engine's signals — it does not
  invent data, and it names categories that have no source.

Each remaining category below becomes real by adding a provider that fills its
fields and flipping its `availability` flag in `buildLiveTicker`.

See [`CYCLES.md`](./CYCLES.md) for the cycle budget and security boundaries.

## Architecture (how data reaches the engine)

```
External APIs ──browser fetch──▶ React frontend ──▶ convergence engine
                                             (scoreUniverse / Play cards)

Internet Identity ──explicit sync──▶ Motoko canister (per-user watchlist)
```

- On ICP, canisters cannot call arbitrary HTTP directly. Outbound requests go
  through **HTTP outcalls**, where every replica must reach consensus on the
  response. Non-deterministic fields (timestamps, request IDs) must be stripped
  in a **transform function** or the call fails consensus.
- Shared ticker writes are disabled until a trusted writer and cycle budget are
  deliberately configured.
- The frontend reads the universe and runs the engine client-side
  (`src/frontend/src/lib/convergence.ts`). The scoring logic never changes when
  you swap sample data for live data — only the inputs do.

## Evidence families and context: where each field comes from

| Engine field(s) | Category | Source | Auth | Notes |
| --- | --- | --- | --- | --- |
| `priceHistory`, `pctAbove52wLow`, `volumeContraction`, `weeklyBullishDivergence`, `monthlyBullishDivergence`, `firstHigherHigh`, `nearMajorSupport` | Technical | Polygon.io or Alpha Vantage (OHLCV) | API key | Divergence/base/HH are computed from the candles, not fetched. See "Derived technicals". |
| `revenueGrowthAccel`, `estimateRevision`, `peVs5yrAvg`, `psVsSector` | Fundamental | Alpha Vantage `OVERVIEW`/`EARNINGS`, or Financial Modeling Prep | API key | `revenueGrowthAccel` = (latest YoY growth − prior YoY growth). |
| `insiderBuy90d`, `instOwnershipChange` | Fundamental | **SEC EDGAR** (Form 4, 13F) | none (free) | EDGAR is free and keyless; just set a descriptive `User-Agent`. |
| `shortInterestPct` | Fundamental/Micro | FINRA short interest / Nasdaq | varies | Bi-monthly cadence. |
| `unusualCallActivity`, `darkPoolAccumulation`, `putCallShift` | Microstructure | Unusual Whales / Market Chameleon (options flow) | API key (freemium) | Hardest/most expensive surface; start with put/call ratio from a cheaper feed. |
| `redditMentionVelocity` | Sentiment | Reddit API (r/wallstreetbets, r/stocks, r/investing) | OAuth (free tier) | Velocity = z-score of mention count vs trailing mean. |
| `newsSentiment` | Sentiment | News API + OpenAI NLP (via Caffeine OpenAI integration) | API key | Score headlines −1..1. |
| `analystUpgrade` | Context only | Alpha Vantage / FMP ratings | API key | Excluded from the independent score because it overlaps analyst estimate/revision evidence. |
| `googleTrendsSlope` | Sentiment | Google Trends (unofficial) | none | |
| `sectorEtfInflow`, `macroRiskOn`, `sectorNarrative` | Macro | ETF flow data + a macro calendar; `sectorNarrative` may be an OpenAI classification | mixed | |
| `impliedVolatilityPctile`, `instrumentDataAvailable` | Instrument selection | Options chain provider | API key | Options recommendations stay disabled until volatility, liquidity, and spread data are explicitly available. |

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

## Known follow-up

- Add point-in-time Fundamental and Sentiment history before claiming a
  full-model historical backtest. The current backtest deliberately validates
  only price-derived structure.
- Connect at least two sufficiently covered non-price company evidence families
  before strict live Surfaced plays can become reachable.
