import { FlaskConical } from "lucide-react";

// Shown whenever the universe being scored is preview/sample data rather than
// facts from a connected live provider. Honesty over polish: never let preview
// numbers read as market truth.
export function SampleDataBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3"
      data-ocid="sample.banner"
    >
      <FlaskConical className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold text-accent">
          Preview data — no live provider connected
        </p>
        <p className="text-accent/80 leading-snug mt-0.5">
          These setups are illustrative inputs used to demonstrate the
          convergence engine. They are not real market data. Wire the sources in{" "}
          <span className="font-mono">DATA.md</span> to score the live market.
        </p>
      </div>
    </div>
  );
}
