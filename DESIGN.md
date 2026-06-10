# Design Brief — AlphaConverge

## Tone & differentiation
AlphaConverge is an analyst's instrument panel, not a brokerage app. The feeling is
"quiet signal in a noisy market": dark, dense, confident, data-forward. It does not
shout green/red P&L — it ranks conviction. The differentiator is the **Play card**:
the single artifact that says *what converged, what stage the stock is in, what
instrument fits, and whether you're too early.*

## Palette
Inherited dark theme. Teal primary (`--primary`) signals alignment/conviction; amber
accent (`--accent`) flags caution and "too early" fatigue; green (`--chart-4`) and red
(`--destructive`) are reserved for directional/strength cues, never decoration.

## Typography
- Display: Space Grotesk — headings, scores, symbols
- Body: DM Sans — prose, theses, explanations
- Mono: Geist Mono — tickers, numeric scores, signal weights

## Structural zones
1. **Screener** — ranked list of surfaced plays, highest convergence first.
2. **Play card** — the centerpiece; convergence meter, stage badge, aligned categories, instrument, thesis, fatigue warning.
3. **Ticker detail** — full six-category breakdown with each fired/quiet signal in plain language.

## Constraints
- Never present a number as live market truth unless it came from a connected provider.
  Preview/sample data is always badged as such.
- Plain language everywhere. The user knows technical analysis; explain the fundamentals.
- High accuracy over volume: surface a few strong setups, not a wall of mediocre ones.
