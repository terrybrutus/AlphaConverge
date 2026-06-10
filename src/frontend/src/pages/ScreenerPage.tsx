import { PlayCard } from "@/components/PlayCard";
import { SampleDataBanner } from "@/components/SampleDataBanner";
import { SearchInput } from "@/components/SearchInput";
import { SAMPLE_UNIVERSE } from "@/data/sampleUniverse";
import { scoreUniverse } from "@/lib/convergence";
import { Activity, Layers, Radar } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

export function ScreenerPage() {
  const [query, setQuery] = useState("");

  // The convergence engine runs over the universe. Today that universe is the
  // labeled sample set; once the canister is populated from live providers this
  // reads from the backend instead (see DATA.md).
  const allPlays = useMemo(() => scoreUniverse(SAMPLE_UNIVERSE), []);
  const isSample = SAMPLE_UNIVERSE.some((t) => t.sample);

  const filtered = useMemo(() => {
    if (!query) return allPlays;
    const q = query.toLowerCase();
    return allPlays.filter(
      (p) =>
        p.symbol.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.sector.toLowerCase().includes(q),
    );
  }, [allPlays, query]);

  const surfaced = filtered.filter((p) => p.surfaced);
  const watching = filtered.filter((p) => !p.surfaced);

  return (
    <div className="min-h-screen bg-background" data-ocid="screener.page">
      {/* Hero */}
      <div className="relative overflow-hidden bg-card border-b border-border">
        <img
          src="/assets/generated/stock-hero.dim_1200x400.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-15"
        />
        <div className="relative z-10 px-4 md:px-8 py-10 md:py-14 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-primary text-sm font-mono font-semibold uppercase tracking-widest mb-2">
              Signal Convergence Engine
            </p>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-3">
              The Screener
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl">
              Six independent categories — technical, fundamental,
              microstructure, sentiment, macro, and lifecycle stage — scored per
              ticker. A setup only surfaces when at least four converge.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-wrap gap-4 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border">
              <Radar className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {allPlays.length} scanned
              </span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border">
              <Layers className="w-4 h-4 text-chart-4" />
              <span className="text-sm text-muted-foreground">
                {surfaced.length} surfaced
              </span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2 border border-border">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">
                {watching.length} watching
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-6">
        {isSample && <SampleDataBanner />}

        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Surfaced plays
          </h2>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Symbol, name, sector..."
          />
        </div>

        {surfaced.length === 0 ? (
          <div
            className="text-center py-16 text-muted-foreground"
            data-ocid="plays.empty_state"
          >
            <p className="text-lg font-medium">No setups surfaced</p>
            <p className="text-sm mt-1">
              Nothing currently has four or more categories converging.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {surfaced.map((play, i) => (
              <motion.div
                key={play.symbol}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <PlayCard play={play} rank={i + 1} />
              </motion.div>
            ))}
          </div>
        )}

        {watching.length > 0 && (
          <div className="pt-4">
            <h2 className="font-display text-xl font-semibold text-foreground mb-1">
              On watch
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Partial alignment — not yet a setup. Surfaces automatically if
              more categories converge.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {watching.map((play, i) => (
                <PlayCard
                  key={play.symbol}
                  play={play}
                  rank={surfaced.length + i + 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
