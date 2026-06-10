# AlphaConverge

A stock-market **signal-convergence engine** built on Caffeine / ICP.

Most screeners show you one thing at a time — a chart, a P/E, a Reddit mention.
AlphaConverge does the opposite: it scores every ticker across **six independent
categories** and only surfaces a setup when several of them agree at the same
time. Independent signals pointing the same direction is the edge; any one alone
is noise.

## The six dimensions

1. **Technical structure** — base formations, weekly/monthly bullish divergence, first higher high, support.
2. **Fundamental inflection** — *rate of change*: revenue acceleration, estimate revisions, valuation vs its own history, insider buying (SEC Form 4), institutional accumulation (13F), short interest.
3. **Market microstructure** — unusual call activity, short-squeeze fuel, dark-pool prints, put/call shifts.
4. **Sentiment** — Reddit mention velocity, news NLP, analyst upgrades, search interest.
5. **Macro & sector** — sector ETF inflows, risk-on backdrop, narrative tailwind.
6. **Lifecycle stage** — Capitulation → Base → Breakout → Early Trend.

A ticker is **surfaced as a Play** only when **≥4 of 6** dimensions converge.

## The Play card

The centerpiece. For each surfaced ticker it states:

- the convergence score and how many dimensions aligned,
- the lifecycle **stage**,
- the **instrument that fits the stage** — LEAP, near-term call, cash-secured put, DCA, or *pass*,
- a plain-language thesis of *why now*,
- a **fatigue warning** when the setup is structurally early (so you don't enter and grind sideways for 18 months).

The stage drives the instrument: a capitulation bottom is LEAP/CSP territory, a
confirmed breakout is near-term calls, an established trend is DCA.

## Status

This build ships with a **labeled sample universe** so the engine and UI are
fully navigable. Nothing is presented as live market truth — preview data is
badged everywhere. See **[`DATA.md`](./DATA.md)** for the plan to wire real
sources (price, SEC EDGAR, Reddit, options flow) through ICP HTTP outcalls.

The convergence logic is real and lives in
[`src/frontend/src/lib/convergence.ts`](./src/frontend/src/lib/convergence.ts).

> Not investment advice. A research and screening tool.

## Develop

```bash
# frontend (from src/frontend/)
pnpm install --prefer-offline
pnpm typecheck && pnpm check && pnpm build

# backend compiles on Caffeine import (mops/moc not required locally)
```
