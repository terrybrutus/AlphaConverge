import { ConvergenceMeter } from "@/components/ConvergenceMeter";
import { StageBadge } from "@/components/StageBadge";
import { INSTRUMENT_LABEL } from "@/lib/convergence";
import type { Play } from "@/types/ticker";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, FlaskConical, Radio, Target } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

export function PlayCard({ play, rank }: { play: Play; rank: number }) {
  const chartData = play.priceHistory.map((p, i) => ({ i, p }));
  const instrumentLabel = INSTRUMENT_LABEL[play.instrument];

  return (
    <Link
      to="/ticker/$symbol"
      params={{ symbol: play.symbol }}
      data-ocid={`plays.item.${rank}`}
      className="block group"
    >
      <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200">
        <div className="flex items-start justify-between gap-4">
          {/* Identity */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-2xl font-bold text-foreground">
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
            <p className="text-sm text-muted-foreground truncate">
              {play.name} · {play.sector}
            </p>
            {!play.sample && (
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                {play.categoriesWithData} of 5 categories sourced
                {play.source ? ` · ${play.source}` : ""}
              </p>
            )}
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">
              ${play.price.toFixed(2)}
            </p>
          </div>

          {/* Score */}
          <ConvergenceMeter
            score={play.convergenceScore}
            dimensionsAligned={play.categoriesAligned}
          />
        </div>

        {/* Sparkline */}
        <div className="mt-3 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="p"
                stroke="oklch(var(--primary))"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Instrument */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
          <Target className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {instrumentLabel}
          </span>
        </div>

        {/* Thesis */}
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {play.thesis}
        </p>

        {/* Fatigue */}
        {play.fatigueWarning && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-accent/90 leading-snug">
              {play.fatigueWarning}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
