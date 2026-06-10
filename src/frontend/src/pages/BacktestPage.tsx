import { Button } from "@/components/ui/button";
import { STARTER_UNIVERSE } from "@/data/starterUniverse";
import type { BtResult, Stat } from "@/lib/backtest";
import { STAGE_LABEL } from "@/lib/convergence";
import { useLiveStore } from "@/lib/liveStore";
import { FlaskConical, Loader2, Play, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

const HORIZONS = [4, 12, 26];

function pct(x: number): string {
  return `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
}
function rate(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}
function tone(value: number, baseline: number): string {
  if (value > baseline + 0.002) return "text-chart-4";
  if (value < baseline - 0.002) return "text-destructive";
  return "text-foreground";
}

function StatRow({
  label,
  s,
  baseline,
}: {
  label: string;
  s: Stat;
  baseline: number;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-3 py-2 border-b border-border last:border-0 text-sm">
      <span className="text-foreground">{label}</span>
      <span className="font-mono text-muted-foreground tabular-nums w-16 text-right">
        n={s.count}
      </span>
      <span
        className={`font-mono tabular-nums w-20 text-right ${tone(s.avgReturn, baseline)}`}
      >
        {s.count ? pct(s.avgReturn) : "—"}
      </span>
      <span className="font-mono text-muted-foreground tabular-nums w-14 text-right">
        {s.count ? rate(s.winRate) : "—"}
      </span>
    </div>
  );
}

function Verdict({ result }: { result: BtResult }) {
  const top = result.buckets[result.buckets.length - 1];
  const enough = top.count >= 20;
  const beatsBaseline = top.avgReturn > result.baseline.avgReturn;
  const alignedBeats = result.aligned.avgReturn > result.notAligned.avgReturn;

  let text: string;
  if (!enough) {
    text =
      "Not enough high-convergence samples to draw a conclusion — widen the universe or horizon.";
  } else if (beatsBaseline && alignedBeats) {
    text =
      "In this sample, weeks with higher technical convergence preceded higher forward returns than average — the chart-structure signal showed a real edge. (Validate on more names and horizons before trusting it.)";
  } else if (beatsBaseline || alignedBeats) {
    text =
      "Mixed: convergence showed some edge on one measure but not the other. Treat as inconclusive until tested on a wider universe.";
  } else {
    text =
      "In this sample, higher convergence did NOT precede higher forward returns — the price-only signal showed no edge here. That's exactly the kind of honest result worth knowing before trusting (or paying for) it.";
  }
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground/90 leading-relaxed">
      {text}
    </div>
  );
}

export function BacktestPage() {
  const apiKey = useLiveStore((s) => s.apiKey);
  const watchlist = useLiveStore((s) => s.symbols);
  const backtest = useLiveStore((s) => s.backtest);
  const runBacktest = useLiveStore((s) => s.runBacktest);

  const [horizon, setHorizon] = useState(12);
  const [universe, setUniverse] = useState<"starter" | "watchlist">("starter");

  const symbols =
    universe === "watchlist" && watchlist.length ? watchlist : STARTER_UNIVERSE;
  const running = backtest.status === "running";
  const result = backtest.result;
  const b = result?.baseline.avgReturn ?? 0;

  return (
    <div className="min-h-screen bg-background" data-ocid="backtest.page">
      <div className="px-4 md:px-8 py-10 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-primary text-sm font-mono font-semibold uppercase tracking-widest mb-2">
            Does it actually work?
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Backtest
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Replays the engine week-by-week over real history (using only data
            available at each point — no lookahead) and measures the forward
            return after high- vs low-convergence weeks. If the signal is real,
            higher convergence should precede higher returns.
          </p>
        </motion.div>

        {/* Honest caveats */}
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
          <TriangleAlert className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="text-xs text-accent/90 leading-snug space-y-1">
            <p className="font-semibold text-accent">Read this first</p>
            <p>
              Tests only the <strong>price-derived</strong> signals (technical
              structure + volume accumulation + stage) — fundamentals, sentiment
              and macro can't be reconstructed historically on free data.
            </p>
            <p>
              Uses weekly end-of-day data. Samples overlap (not independent),
              and the universe is today's liquid names (survivorship bias) —
              both flatter results. This is a sanity check, not proof, and not
              investment advice.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 space-y-4">
          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Forward horizon
            </span>
            <div className="mt-1.5 flex gap-2">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizon(h)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    horizon === h
                      ? "border-primary/50 bg-primary/15 text-foreground"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {h} weeks
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              Universe
            </span>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setUniverse("starter")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  universe === "starter"
                    ? "border-primary/50 bg-primary/15 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                Starter set ({STARTER_UNIVERSE.length})
              </button>
              <button
                type="button"
                disabled={watchlist.length === 0}
                onClick={() => setUniverse("watchlist")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                  universe === "watchlist"
                    ? "border-primary/50 bg-primary/15 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                My watchlist ({watchlist.length})
              </button>
            </div>
          </div>

          <Button
            disabled={running || !apiKey}
            onClick={() => void runBacktest({ horizon, symbols })}
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running…{" "}
                {backtest.progress.done}/{backtest.progress.total}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> Run backtest ({symbols.length}{" "}
                tickers)
              </>
            )}
          </Button>
          {!apiKey && (
            <p className="text-xs text-accent/90">
              Add a price-source API key in the Screener's Live panel first
              (Twelve Data recommended for the larger fetch).
            </p>
          )}
          {backtest.status === "error" && (
            <p className="text-sm text-destructive">{backtest.error}</p>
          )}
        </div>

        {/* Results */}
        {result && backtest.status === "done" && (
          <motion.div
            className="mt-8 space-y-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {result.total === 0 ? (
              <p className="text-sm text-muted-foreground">
                No samples — tickers may have failed to fetch or lacked enough
                history. Try Twelve Data and a shorter horizon.
              </p>
            ) : (
              <>
                <Verdict result={result} />

                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-1">
                    Forward return by technical-convergence score
                  </h2>
                  <p className="text-xs text-muted-foreground mb-3">
                    {result.total.toLocaleString()} weekly samples ·{" "}
                    {result.horizon}-week forward return · baseline (avg of all
                    weeks){" "}
                    <span className="font-mono">
                      {pct(result.baseline.avgReturn)}
                    </span>
                    , win rate{" "}
                    <span className="font-mono">
                      {rate(result.baseline.winRate)}
                    </span>
                  </p>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span>Score bucket</span>
                    <span className="w-16 text-right">samples</span>
                    <span className="w-20 text-right">avg return</span>
                    <span className="w-14 text-right">win %</span>
                  </div>
                  {result.buckets.map((bk) => (
                    <StatRow
                      key={bk.label}
                      label={bk.label}
                      s={bk}
                      baseline={b}
                    />
                  ))}
                </div>

                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-3">
                    Technical category: aligned vs not
                  </h2>
                  <StatRow
                    label="Aligned (≥50)"
                    s={result.aligned}
                    baseline={b}
                  />
                  <StatRow
                    label="Not aligned"
                    s={result.notAligned}
                    baseline={b}
                  />
                </div>

                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-display text-lg font-semibold text-foreground mb-3">
                    Forward return by lifecycle stage
                  </h2>
                  {result.stages
                    .filter((st) => st.count > 0)
                    .map((st) => (
                      <StatRow
                        key={st.stage}
                        label={STAGE_LABEL[st.stage]}
                        s={st}
                        baseline={b}
                      />
                    ))}
                </div>

                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5" /> Past performance does
                  not predict future results. Sanity check only.
                </p>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
