import type { CategoryResult } from "@/types/ticker";
import { Check, Minus, PlugZap } from "lucide-react";

function scoreTone(score: number): string {
  if (score >= 75) return "text-primary";
  if (score >= 50) return "text-chart-4";
  if (score >= 30) return "text-accent";
  return "text-muted-foreground";
}

export function CategoryBreakdown({ category }: { category: CategoryResult }) {
  // No live data source connected for this category — show it honestly as
  // unscored rather than a misleading zero.
  if (!category.available) {
    return (
      <div
        className="bg-card border border-dashed border-border rounded-xl p-4 opacity-80"
        data-ocid={`category.${category.key}`}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-base font-semibold text-muted-foreground">
            {category.label}
          </h3>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            <PlugZap className="h-3 w-3" /> No source
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-snug">
          No live data source is connected for this category yet, so it is not
          scored and cannot count toward convergence. See DATA.md to wire it.
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-card border border-border rounded-xl p-4"
      data-ocid={`category.${category.key}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold text-foreground">
            {category.label}
          </h3>
          {category.aligned && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-primary">
              Aligned
            </span>
          )}
        </div>
        <span
          className={`font-mono font-bold tabular-nums ${scoreTone(category.score)}`}
        >
          {category.score}
          <span className="ml-2 text-[10px] font-normal text-muted-foreground">
            {category.coverage}% weighted data coverage
          </span>
        </span>
      </div>

      <ul className="space-y-2.5">
        {category.signals.map((s) => {
          const noData = s.available === false;
          return (
            <li
              key={s.name}
              className={`flex items-start gap-2.5 ${noData ? "opacity-60" : ""}`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                  noData
                    ? "bg-muted text-muted-foreground"
                    : s.fired
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {noData ? (
                  <PlugZap className="h-3 w-3" />
                ) : s.fired ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      s.fired && !noData
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s.name}
                  </span>
                  {noData ? (
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      no data
                    </span>
                  ) : (
                    s.value && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.value}
                      </span>
                    )
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                  {s.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
        Check = sourced and passed. Minus = sourced but did not pass. Plug = no
        connected source. Coverage follows each signal's intended weight, so it
        is not simply the number of rows with data.
      </p>
    </div>
  );
}
