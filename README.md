# AlphaConverge

A stock-market **signal-convergence engine** built on Caffeine / ICP.

Most screeners show you one thing at a time — a chart, a P/E, a Reddit mention.
AlphaConverge does the opposite: it scores every ticker across independent
evidence families and only surfaces a setup when price structure and multiple
non-price company signals agree at the same time. Independent evidence pointing
the same direction is the edge; any one source alone is noise.

## Independent evidence model

1. **Price structure** — technical structure, lifecycle stage, and OBV are one evidence family because they all come from price/volume.
2. **Fundamental inflection** — *rate of change*: revenue acceleration, estimate revisions, valuation vs its own history, insider buying (SEC Form 4), institutional accumulation (13F), short interest.
3. **Positioning / microstructure** — unusual call activity, short-squeeze fuel, dark-pool prints, put/call shifts.
4. **Sentiment** — Reddit mention velocity, news NLP, and search interest. Analyst recommendations do not count here because they overlap with fundamental estimate/revision evidence.
5. **Macro & sector context** — sector ETF relative strength, risk-on backdrop, narrative tailwind. This is displayed separately and cannot increase the convergence score or confirmation count.

A ticker is **surfaced as a Play** only when price structure aligns and at least
two independent, non-price company evidence families align. A category must
also have at least 50% data coverage before it can count as aligned.
Missing signals contribute no points; sparse positive data is never
renormalized into a misleading 100% category score.

## The Play card

The centerpiece. For each surfaced ticker it states:

- the convergence score and how many dimensions aligned,
- the lifecycle **stage**,
- the **instrument that fits the stage** — LEAP, near-term call, cash-secured put, DCA, or *pass*,
- a plain-language thesis of *why now*,
- a **fatigue warning** when the setup is structurally early (so you don't enter and grind sideways for 18 months).

Lifecycle stage describes the setup and helps select an instrument, but it does
not add another independent vote. Live options recommendations are withheld
until an options source explicitly confirms volatility, liquidity, and spread
data are available.

## Status

This build ships with a **labeled sample universe** so the engine and UI are
fully navigable. Nothing is presented as live market truth — preview data is
badged everywhere. See **[`DATA.md`](./DATA.md)** for the plan to wire real
sources (price, SEC EDGAR, Reddit, options flow) through ICP HTTP outcalls.

The convergence logic is real and lives in
[`src/frontend/src/lib/convergence.ts`](./src/frontend/src/lib/convergence.ts).

> Not investment advice. A research and screening tool.

## ICP cycle policy

Scans, provider calls, scoring, encryption, and backtests run in the browser.
The canister handles only explicit authenticated watchlist/vault persistence;
there are no scheduled jobs or canister HTTP outcalls. See
[`CYCLES.md`](./CYCLES.md).

## Develop

```bash
# frontend (from src/frontend/)
pnpm install --prefer-offline
pnpm typecheck && pnpm check && pnpm build

# backend compiles on Caffeine import (mops/moc not required locally)
```
