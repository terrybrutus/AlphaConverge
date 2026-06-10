import { PlayCard } from "@/components/PlayCard";
import { SampleDataBanner } from "@/components/SampleDataBanner";
import { SAMPLE_UNIVERSE } from "@/data/sampleUniverse";
import { scoreUniverse } from "@/lib/convergence";

export function ExamplesPage() {
  const plays = scoreUniverse(SAMPLE_UNIVERSE);
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 md:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Illustrated examples
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            What surfaced and on-watch setups look like
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            These fictional examples demonstrate the complete experience. They
            are not live securities or market recommendations.
          </p>
        </div>
        <SampleDataBanner />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {plays.map((play, index) => (
            <PlayCard key={play.symbol} play={play} rank={index + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
