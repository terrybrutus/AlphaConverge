import type { CategoryResult } from "@/types/ticker";
import { Check, Minus } from "lucide-react";

function scoreTone(score: number): string {
  if (score >= 75) return "text-primary";
  if (score >= 50) return "text-chart-4";
  if (score >= 30) return "text-accent";
  return "text-muted-foreground";
}

export function CategoryBreakdown({ category }: { category: CategoryResult }) {
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
        </span>
      </div>

      <ul className="space-y-2.5">
        {category.signals.map((s) => (
          <li key={s.name} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                s.fired
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s.fired ? (
                <Check className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-medium ${
                    s.fired ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.name}
                </span>
                {s.value && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {s.value}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                {s.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
