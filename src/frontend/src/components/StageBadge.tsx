import { STAGE_LABEL } from "@/lib/convergence";
import type { Stage } from "@/types/ticker";

// Color encodes how early/late in the lifecycle the setup is:
// amber = earliest/riskiest, teal = confirmed, muted = none.
const STAGE_STYLES: Record<Stage, string> = {
  capitulation: "bg-accent/15 text-accent border-accent/40",
  base: "bg-chart-2/15 text-chart-2 border-chart-2/40",
  breakout: "bg-primary/15 text-primary border-primary/40",
  earlyTrend: "bg-chart-4/15 text-chart-4 border-chart-4/40",
  none: "bg-muted text-muted-foreground border-border",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-semibold uppercase tracking-wide ${STAGE_STYLES[stage]}`}
      data-ocid="stage.badge"
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}
