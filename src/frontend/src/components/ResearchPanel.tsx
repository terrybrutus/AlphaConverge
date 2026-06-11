import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveStore } from "@/lib/liveStore";
import { RESEARCH_SIGNALS } from "@/lib/research";
import type { Play } from "@/types/ticker";
import { BookOpenCheck, Check, Minus, Trash2 } from "lucide-react";
import { useState } from "react";

export function ResearchPanel({ play }: { play: Play }) {
  const evidence = useLiveStore((s) => s.manualEvidence[play.symbol]);
  const setEvidence = useLiveStore((s) => s.setManualEvidence);
  const trackPlay = useLiveStore((s) => s.trackPlay);
  const [source, setSource] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const save = (signal: string, verdict: "confirmed" | "contradicted") => {
    if (!source.trim()) return;
    setEvidence(play.symbol, signal, {
      verdict,
      source: source.trim(),
      observedAt: today,
    });
  };

  return (
    <div className="mb-6 rounded-2xl border border-chart-4/30 bg-chart-4/5 p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Cheap research validation
          </h2>
          <p className="text-xs text-muted-foreground">
            Record facts from SEC, FINRA, Finviz, options screens, or other
            sources. Manual facts count only when explicitly sourced and remain
            labeled as manual research.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => trackPlay(play)}>
          <BookOpenCheck className="mr-1.5 h-4 w-4" /> Track this setup
        </Button>
      </div>
      <Input
        value={source}
        onChange={(event) => setSource(event.target.value)}
        placeholder="Source URL or publication name required before marking facts"
        className="mb-3 bg-background"
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {RESEARCH_SIGNALS.map((signal) => {
          const current = evidence?.signals[signal];
          return (
            <div
              key={signal}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card/70 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {signal}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {current
                    ? `${current.verdict} · ${current.source} · ${current.observedAt}`
                    : "Unreviewed"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant={
                    current?.verdict === "confirmed" ? "secondary" : "ghost"
                  }
                  disabled={!source.trim()}
                  title="Source confirms signal"
                  onClick={() => save(signal, "confirmed")}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={
                    current?.verdict === "contradicted" ? "secondary" : "ghost"
                  }
                  disabled={!source.trim()}
                  title="Source contradicts signal"
                  onClick={() => save(signal, "contradicted")}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                {current && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="Remove manual fact"
                    onClick={() => setEvidence(play.symbol, signal)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
