# AlphaConverge — Data Cost Breakdown

**You can run everything below for $0 today.** Every wired feature uses a free
tier. This document is so you know, before paying anything, exactly what each
upgrade costs and what it buys.

> Prices are approximate as of early 2026 and change often — verify on each
> provider's pricing page before subscribing. Personal/retail tiers shown.

## What's wired now (free)

| Provider | Powers | Free tier we use | Paid entry (if you outgrow free) |
|---|---|---|---|
| **Twelve Data** | Price/candles → Technical, Macro | ~800 req/day, 8/min, EOD | ~$29/mo (Grow), ~$79/mo (Pro) |
| **Alpha Vantage** | Price/candles (alt source) | ~25 req/day | ~$50/mo (75 rpm) → ~$250/mo (1200 rpm) |
| **Finnhub** | Fundamental + Sentiment + sector | ~60/min, basic endpoints | ~$50/mo+ for premium endpoints/real-time |
| **Anthropic (Claude Haiku)** | On-click AI read | pay-per-use, no plan | ~$1 / 1M input, $5 / 1M output tokens |
| **On-Balance-Volume** | Microstructure (accumulation) | computed locally, $0 | n/a |

**AI read cost in practice:** each read is a few hundred tokens in + out, so
well under **$0.01 per click**. 100 reads ≈ a few cents. There is no subscription
— you only pay for what you click.

## Not wired yet — the paid-only pieces

These power the **remaining Microstructure signals** (options flow, dark pool,
short interest) and a true **whole-market nightly scan**.

| Provider | What it adds | Approx. retail price |
|---|---|---|
| **Polygon.io** (Stocks + Options) | Bulk price for full-market scan; options flow | Stocks: ~$29 (Starter) / $79 (Developer) / $199 (Advanced) per mo; Options add-on similar |
| **Unusual Whales** | Unusual options flow, dark-pool prints | ~$48–$75/mo |
| **Market Chameleon** | Options flow, unusual activity | ~$69–$99/mo |
| **ORTEX** | Short interest, squeeze metrics | ~$50–$100/mo |
| **Financial Modeling Prep / EODHD / Tiingo** | Bulk fundamentals + EOD for scanning | ~$15–$80/mo |

## Realistic budget scenarios

| Goal | What to buy | Approx. monthly |
|---|---|---|
| **Stay free** (curated scans, 4–6 categories on a watchlist) | nothing | **$0** + pennies of AI |
| **Bigger scans, smoother limits** | Twelve Data Grow **or** Polygon Stocks Starter | **~$29** |
| **Add real options-flow microstructure** | above **+** Unusual Whales (or Polygon Options) | **~$75–$110** |
| **Full microstructure + squeeze + scale** | Polygon Advanced **+** Unusual Whales **+** ORTEX | **~$300–$350** |
| **True whole-market nightly engine** | bulk market-data plan + options + a backend host | **$300–$800+** (plus build effort) |

**Bottom line:** prove it works on the free tiers first. The first paid step
worth taking is usually a single ~$29 price plan (Twelve Data or Polygon) for
smoother/bigger scans. Options-flow microstructure is the next ~$50–$75. The
"monitor all 8,000 tickers nightly" vision is the only part that genuinely needs
the $300+ tier plus a scheduled backend — don't pay for that until the rest has
earned your trust.

## A note on data freshness (see also: each ticker shows its source)

- **Prices/technicals:** free tiers are **end-of-day**, not intraday/real-time.
  Weekly candles update after the close. Good for swing/position analysis, not
  day-trading.
- **Fundamentals/insider/analyst:** reflect the **latest filed/reported** data,
  which carries natural lags (insider Form 4s lag days; analyst trends update
  ~monthly; financials update each earnings season).
- **News sentiment & OBV:** transparent heuristics computed from real inputs,
  labeled as such — not a paid NLP model.
- If a provider returns nothing for a signal, the app marks it **"no data"**
  rather than guessing. You can spot-check any value (price, insider, news)
  against your broker / Finviz / SEC EDGAR.
