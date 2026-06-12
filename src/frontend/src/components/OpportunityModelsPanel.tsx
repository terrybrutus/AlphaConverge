import type { OpportunityModelResult } from "@/types/ticker";
import { Check, CircleOff, Minus } from "lucide-react";

export function OpportunityModelsPanel({
  models,
}: {
  models: OpportunityModelResult[];
}) {
  if (models.length === 0) return null;
  return (
    <section className="mb-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold text-foreground">
        Opportunity models
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Separate research hypotheses evaluated from the same sourced facts.
        Missing required evidence leaves a model untestable; it never becomes a
        positive.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {models.map((model) => (
          <details
            key={model.key}
            className={`rounded-xl border p-4 ${
              model.qualified
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-muted/20"
            }`}
          >
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{model.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {model.description}
                  </p>
                </div>
                <div className="text-right font-mono text-xs">
                  <p className={model.qualified ? "text-primary" : ""}>
                    {model.score} fit
                  </p>
                  <p className="text-muted-foreground">
                    {model.coverage}% observable
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {model.blocker}
              </p>
            </summary>
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              {model.signals.map((signal) => (
                <div
                  key={signal.name}
                  className="flex items-start gap-2 text-xs"
                >
                  {!signal.available ? (
                    <CircleOff className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  ) : signal.fired ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Minus className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      {signal.name} · {Math.round(signal.weight * 100)}%
                    </p>
                    <p className="text-muted-foreground">{signal.detail}</p>
                    <p className="text-muted-foreground/80">
                      Evidence window: {signal.window}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
