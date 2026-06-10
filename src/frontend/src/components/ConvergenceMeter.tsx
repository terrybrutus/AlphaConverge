const EVIDENCE_SLOTS = ["price", "fundamental", "positioning", "sentiment"];

interface ConvergenceMeterProps {
  score: number; // 0..100
  dimensionsAligned: number; // 0..4 independent evidence families
  size?: "sm" | "lg";
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-primary";
  if (score >= 55) return "text-chart-4";
  if (score >= 40) return "text-accent";
  return "text-muted-foreground";
}

export function ConvergenceMeter({
  score,
  dimensionsAligned,
  size = "sm",
}: ConvergenceMeterProps) {
  const color = scoreColor(score);
  const numberClass = size === "lg" ? "text-4xl" : "text-2xl";
  return (
    <div
      className="flex flex-col items-center"
      data-ocid="convergence.meter"
      title="Overall evidence score. Missing evidence earns no points; the separate coverage figure shows how much of the intended model had a source."
    >
      <span
        className={`font-display font-bold tabular-nums ${numberClass} ${color}`}
      >
        {score}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Convergence
      </span>
      <div className="mt-1.5 flex gap-1" aria-hidden="true">
        {EVIDENCE_SLOTS.map((id, i) => (
          <span
            key={id}
            className={`h-1.5 w-3 rounded-full ${
              i < dimensionsAligned ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <span className="mt-1 text-[10px] text-muted-foreground tabular-nums">
        {dimensionsAligned}/4 evidence families
      </span>
    </div>
  );
}
