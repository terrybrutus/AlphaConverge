import { PlayCard } from "@/components/PlayCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STARTER_UNIVERSE } from "@/data/starterUniverse";
import { useLiveStore } from "@/lib/liveStore";
import { parseTickerImport } from "@/lib/research";
import type { Play } from "@/types/ticker";
import { Link } from "@tanstack/react-router";
import {
  CircleHelp,
  Filter,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Telescope,
  TriangleAlert,
  X,
} from "lucide-react";
import { type FormEvent, useState } from "react";

type ResultView = "all" | "surfaced" | "candidates" | "watch";
type ResultSort = "score" | "coverage" | "symbol";

export function LivePanel() {
  const apiKey = useLiveStore((s) => s.priceKeys[s.priceProvider]);
  const priceProvider = useLiveStore((s) => s.priceProvider);
  const symbols = useLiveStore((s) => s.symbols);
  const entries = useLiveStore((s) => s.entries);
  const addSymbol = useLiveStore((s) => s.addSymbol);
  const loadSymbols = useLiveStore((s) => s.loadSymbols);
  const removeSymbol = useLiveStore((s) => s.removeSymbol);
  const refreshAll = useLiveStore((s) => s.refreshAll);
  const retryErrored = useLiveStore((s) => s.retryErrored);
  const refreshOne = useLiveStore((s) => s.refreshOne);

  const [symbolDraft, setSymbolDraft] = useState("");
  const [view, setView] = useState<ResultView>("all");
  const [sort, setSort] = useState<ResultSort>("score");

  const hasKey = apiKey.length > 0;
  const scanning = symbols.some((s) => entries[s]?.status === "loading");
  const erroredSymbols = symbols.filter((s) => entries[s]?.status === "error");

  // Ranked live results — highest convergence first, surfaced split out.
  const livePlays = symbols
    .map((sym) => entries[sym]?.play)
    .filter((p): p is Play => !!p)
    .sort((a, b) => {
      if (sort === "coverage") return b.dataCoverage - a.dataCoverage;
      if (sort === "symbol") return a.symbol.localeCompare(b.symbol);
      return b.convergenceScore - a.convergenceScore;
    });
  const liveSurfaced = livePlays.filter((p) => p.surfaced);
  const liveCandidates = livePlays.filter(
    (p) =>
      !p.surfaced &&
      (p.categories.find((category) => category.key === "technical")?.aligned ??
        false),
  );
  const liveWatch = livePlays.filter(
    (p) => !p.surfaced && !liveCandidates.includes(p),
  );
  const showSurfaced = view === "all" || view === "surfaced";
  const showCandidates = view === "all" || view === "candidates";
  const showWatch = view === "all" || view === "watch";

  const submitSymbol = (e: FormEvent) => {
    e.preventDefault();
    const incoming = parseTickerImport(symbolDraft);
    if (incoming.length === 0) return;
    if (incoming.length === 1) addSymbol(incoming[0]);
    else void loadSymbols(incoming);
    setSymbolDraft("");
  };

  return (
    <div
      className="rounded-2xl border border-primary/30 bg-primary/5 p-5"
      data-ocid="live.panel"
    >
      <div className="flex items-center gap-2 mb-1">
        <Radio className="w-4 h-4 text-primary" />
        <h2 className="font-display text-lg font-semibold text-foreground">
          Live tickers
        </h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Score any US ticker on <strong>real</strong> data, or load the starter
        set and let the engine rank what it can support. A Candidate has aligned
        technical structure but is not a confirmed Surfaced play.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
        <CircleHelp className="h-4 w-4 text-primary" />
        Using {priceProvider === "twelveData" ? "Twelve Data" : "Alpha Vantage"}
        . Results are cached snapshots after a successful scan; refresh them
        before acting.
        <Link
          to="/settings"
          className="font-semibold text-primary hover:underline"
        >
          Configure data sources
        </Link>
        <Link
          to="/examples"
          className="font-semibold text-primary hover:underline"
        >
          See illustrated examples
        </Link>
      </div>

      {/* Add symbol */}
      <form onSubmit={submitSymbol} className="flex items-start gap-2 mb-4">
        <Textarea
          value={symbolDraft}
          onChange={(e) => setSymbolDraft(e.target.value)}
          placeholder="Paste tickers or an exported Finviz table"
          className="min-h-20 bg-muted/50"
          disabled={!hasKey}
        />
        <Button type="submit" disabled={!hasKey || !symbolDraft.trim()}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
        {symbols.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshAll()}
            disabled={scanning}
            title="Refresh all"
          >
            <RefreshCw
              className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`}
            />
          </Button>
        )}
      </form>

      {/* Discovery: scan a curated set so the engine surfaces candidates */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hasKey || scanning}
          onClick={() => void loadSymbols(STARTER_UNIVERSE)}
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Scanning…
            </>
          ) : (
            <>
              <Telescope className="w-4 h-4 mr-1.5" /> Load &amp; scan starter
              set ({STARTER_UNIVERSE.length})
            </>
          )}
        </Button>
        {priceProvider === "alphaVantage" && (
          <span className="text-xs text-accent/90">
            Tip: switch to Twelve Data above for a full scan — Alpha Vantage's
            free limit is too small.
          </span>
        )}
        {erroredSymbols.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scanning}
            onClick={() => void retryErrored()}
          >
            <RotateCcw className="w-4 h-4 mr-1.5" /> Retry{" "}
            {erroredSymbols.length} failed
          </Button>
        )}
      </div>

      {livePlays.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 p-2">
          <Filter className="ml-1 h-4 w-4 text-muted-foreground" />
          {(["all", "surfaced", "candidates", "watch"] as ResultView[]).map(
            (option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={view === option ? "secondary" : "ghost"}
                onClick={() => setView(option)}
              >
                {option === "all"
                  ? `All ${livePlays.length}`
                  : option === "surfaced"
                    ? `Surfaced ${liveSurfaced.length}`
                    : option === "candidates"
                      ? `Candidates ${liveCandidates.length}`
                      : `On watch ${liveWatch.length}`}
              </Button>
            ),
          )}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as ResultSort)}
            className="ml-auto rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            aria-label="Sort live results"
          >
            <option value="score">Highest evidence score</option>
            <option value="coverage">Highest data coverage</option>
            <option value="symbol">Ticker symbol</option>
          </select>
        </div>
      )}

      {symbols.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No live tickers yet. Add one, paste a comma-separated list from a
          screener such as Finviz, or load the starter set.
        </p>
      )}

      {/* Status rows for loading/error */}
      <div className="space-y-2">
        {symbols.map((sym) => {
          const entry = entries[sym];
          if (entry?.status === "ok") return null;
          return (
            <div
              key={sym}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-semibold text-foreground">
                  {sym}
                </span>
                {entry?.status === "loading" && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Fetching…
                  </span>
                )}
                {entry?.status === "error" && (
                  <span className="flex items-center gap-1 text-xs text-destructive truncate">
                    <TriangleAlert className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{entry.error}</span>
                  </span>
                )}
                {!entry && (
                  <span className="text-xs text-muted-foreground">Queued</span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {entry?.status === "error" && (
                  <button
                    type="button"
                    aria-label={`Retry ${sym}`}
                    title="Retry"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => void refreshOne(sym)}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${sym}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeSymbol(sym)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Surfaced live plays — the ones that fit the criteria */}
      {showSurfaced && liveSurfaced.length > 0 && (
        <div className="mt-4">
          <h3 className="font-display text-base font-semibold text-primary mb-2">
            Surfaced ({liveSurfaced.length}) — independent evidence confirmed
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {liveSurfaced.map((play, i) => (
              <div key={play.symbol} className="relative">
                <button
                  type="button"
                  aria-label={`Remove ${play.symbol}`}
                  className="absolute -top-2 -right-2 z-10 rounded-full bg-card border border-border p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSymbol(play.symbol)}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <PlayCard play={play} rank={i + 1} />
              </div>
            ))}
          </div>
        </div>
      )}

      {showCandidates && liveCandidates.length > 0 && (
        <div className="mt-4">
          <h3 className="font-display text-base font-semibold text-chart-4 mb-1">
            Candidates ({liveCandidates.length}) — technical structure aligned
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Worth researching, but not confirmed: the app still lacks two
            sufficiently covered independent company evidence families.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {liveCandidates.map((play, i) => (
              <div key={play.symbol} className="relative">
                <button
                  type="button"
                  aria-label={`Remove ${play.symbol}`}
                  className="absolute -top-2 -right-2 z-10 rounded-full bg-card border border-border p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSymbol(play.symbol)}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <PlayCard play={play} rank={liveSurfaced.length + i + 1} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scanned but not surfaced — ranked by convergence */}
      {showWatch && liveWatch.length > 0 && (
        <div className="mt-4">
          <h3 className="font-display text-base font-semibold text-muted-foreground mb-2">
            Scanned ({liveWatch.length}) — ranked, not yet a setup
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {liveWatch.map((play, i) => (
              <div key={play.symbol} className="relative">
                <button
                  type="button"
                  aria-label={`Remove ${play.symbol}`}
                  className="absolute -top-2 -right-2 z-10 rounded-full bg-card border border-border p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => removeSymbol(play.symbol)}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <PlayCard play={play} rank={liveSurfaced.length + i + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
