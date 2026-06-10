import { AiRead } from "@/components/AiRead";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { ConvergenceMeter } from "@/components/ConvergenceMeter";
import { StageBadge } from "@/components/StageBadge";
import { Button } from "@/components/ui/button";
import { SAMPLE_UNIVERSE } from "@/data/sampleUniverse";
import { INSTRUMENT_LABEL, scoreTicker } from "@/lib/convergence";
import { useLiveStore } from "@/lib/liveStore";
import { Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart2,
  FlaskConical,
  Loader2,
  Radio,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TickerDetailPage() {
  const { symbol } = useParams({ from: "/ticker/$symbol" });
  const sym = symbol?.toUpperCase() ?? "";

  const liveEntry = useLiveStore((s) => s.entries[sym]);
  const isLiveSymbol = useLiveStore((s) => s.symbols.includes(sym));
  const apiKey = useLiveStore((s) => s.priceKeys[s.priceProvider]);
  const refreshOne = useLiveStore((s) => s.refreshOne);

  // If we arrived directly at a live ticker that hasn't been fetched (e.g. page
  // refresh), fetch it.
  useEffect(() => {
    if (isLiveSymbol && !liveEntry && apiKey) void refreshOne(sym);
  }, [isLiveSymbol, liveEntry, apiKey, sym, refreshOne]);

  const samplePlay = useMemo(() => {
    const raw = SAMPLE_UNIVERSE.find((t) => t.symbol === sym);
    return raw ? scoreTicker(raw) : null;
  }, [sym]);

  const play = liveEntry?.play ?? samplePlay;

  if (!play) {
    const loading = isLiveSymbol && liveEntry?.status !== "error";
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
        {loading ? (
          <p className="text-xl text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Fetching live data for{" "}
            <span className="text-foreground font-mono">{sym}</span>…
          </p>
        ) : (
          <p className="text-xl text-muted-foreground">
            {liveEntry?.status === "error" ? (
              <>
                Couldn’t load {sym}: {liveEntry.error}
              </>
            ) : (
              <>
                Ticker <span className="text-foreground font-mono">{sym}</span>{" "}
                not in the current universe
              </>
            )}
          </p>
        )}
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Screener
          </Button>
        </Link>
      </div>
    );
  }

  const chartData = play.priceHistory.map((price, i) => ({
    week: i + 1,
    price,
  }));

  return (
    <div className="min-h-screen bg-background" data-ocid="ticker-detail.page">
      <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
        <Link to="/" data-ocid="ticker-detail.back_button">
          <Button variant="ghost" className="mb-6 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Screener
          </Button>
        </Link>

        {/* Header */}
        <motion.div
          className="bg-card border border-border rounded-2xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="font-display text-4xl font-bold text-foreground">
                  {play.symbol}
                </span>
                <StageBadge stage={play.stage} />
                {play.sample ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-accent">
                    <FlaskConical className="w-3 h-3" /> Preview
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-primary">
                    <Radio className="w-3 h-3" /> Live
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-base">
                {play.name} · {play.sector}
              </p>
              {!play.sample && (
                <p className="text-xs text-muted-foreground/80 mt-0.5">
                  {play.dataCoverage}% weighted data coverage
                  {play.source ? ` · ${play.source}` : ""}
                </p>
              )}
              <p className="mt-2 font-mono text-3xl font-bold text-foreground">
                ${play.price.toFixed(2)}
              </p>
            </div>
            <ConvergenceMeter
              score={play.convergenceScore}
              dimensionsAligned={play.categoriesAligned}
              size="lg"
            />
          </div>

          {/* Thesis */}
          <p className="mt-5 text-sm md:text-base text-foreground/90 leading-relaxed">
            {play.thesis}
          </p>

          {/* Instrument */}
          <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-display font-semibold text-foreground">
                Recommended: {INSTRUMENT_LABEL[play.instrument]}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {play.instrumentRationale}
            </p>
          </div>

          {/* Fatigue */}
          {play.fatigueWarning && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 p-4">
              <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-accent text-sm">
                  Fatigue check
                </p>
                <p className="text-sm text-accent/90 leading-relaxed mt-0.5">
                  {play.fatigueWarning}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* AI read */}
        <AiRead play={play} />

        {/* Price history */}
        <motion.div
          className="bg-card border border-border rounded-2xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">
              Weekly price structure
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="oklch(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="oklch(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(var(--border))"
              />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "oklch(var(--muted-foreground))" }}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(var(--card))",
                  border: "1px solid oklch(var(--border))",
                  borderRadius: "8px",
                  color: "oklch(var(--foreground))",
                }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, "Close"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="oklch(var(--primary))"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Signal breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {play.categories.map((category) => (
              <CategoryBreakdown key={category.key} category={category} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
