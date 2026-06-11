import { PlayCard } from "@/components/PlayCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { STARTER_UNIVERSE } from "@/data/starterUniverse";
import { useLiveStore } from "@/lib/liveStore";
import { analyzeTickerImport } from "@/lib/research";
import { evidenceIsFresh } from "@/lib/research";
import type { CategoryKey, Play } from "@/types/ticker";
import {
  CheckSquare,
  ChevronDown,
  Download,
  Filter,
  Loader2,
  Pause,
  Play as PlayIcon,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

type ResultView = "all" | "surfaced" | "candidates" | "watch";
type ResultSort =
  | "score"
  | "coverage"
  | "aligned"
  | "closest"
  | "improved"
  | "recent"
  | "symbol"
  | "stage";

const COMPANY_KEYS: CategoryKey[] = [
  "fundamental",
  "microstructure",
  "sentiment",
];
const EVIDENCE_BLEND: Partial<Record<CategoryKey, number>> = {
  technical: 0.32,
  fundamental: 0.28,
  microstructure: 0.24,
  sentiment: 0.16,
};

function manualCoverage(
  play: Play,
  evidence: ReturnType<typeof useLiveStore.getState>["manualEvidence"][string],
): number {
  if (!evidence) return 0;
  return Math.round(
    play.categories.reduce((total, category) => {
      const blend = EVIDENCE_BLEND[category.key] ?? 0;
      return (
        total +
        category.signals.reduce(
          (sum, signal) =>
            evidence.signals[signal.name] &&
            evidenceIsFresh(signal.name, evidence.signals[signal.name])
              ? sum + signal.weight * blend * 100
              : sum,
          0,
        )
      );
    }, 0),
  );
}

function missingWork(play: Play): string {
  const missing = play.categories
    .filter(
      (category) => COMPANY_KEYS.includes(category.key) && !category.aligned,
    )
    .sort((a, b) => b.score - a.score)
    .map((category) =>
      category.coverage < 50
        ? `${category.label}: needs ${50 - category.coverage}% more coverage`
        : `${category.label}: needs stronger confirming signals`,
    );
  return missing[0] ?? "Independent evidence requirements met";
}

function exportCsv(plays: Play[]) {
  const rows = [
    ["Ticker", "Score", "Coverage", "Evidence families", "Surfaced", "Stage"],
    ...plays.map((play) => [
      play.symbol,
      play.convergenceScore,
      play.dataCoverage,
      play.categoriesAligned,
      play.surfaced ? "Yes" : "No",
      play.stage,
    ]),
  ];
  const blob = new Blob(
    [rows.map((row) => row.map((value) => `"${value}"`).join(",")).join("\n")],
    { type: "text/csv" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `alphaconverge-results-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LivePanel() {
  const store = useLiveStore();
  const [draft, setDraft] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [view, setView] = useState<ResultView>("all");
  const [sort, setSort] = useState<ResultSort>("score");
  const [selected, setSelected] = useState<string[]>([]);
  const preview = analyzeTickerImport(previewText);

  const plays = useMemo(() => {
    const values = store.symbols
      .map((symbol) => store.entries[symbol]?.play)
      .filter((play): play is Play => !!play);
    return values.sort((a, b) => {
      const latestDelta = (play: Play) => {
        const history = store.snapshots[play.symbol] ?? [];
        return history.length > 1
          ? history.at(-1)!.score - history.at(-2)!.score
          : 0;
      };
      if (sort === "coverage") return b.dataCoverage - a.dataCoverage;
      if (sort === "aligned") return b.categoriesAligned - a.categoriesAligned;
      if (sort === "closest")
        return (
          b.categoriesAligned - a.categoriesAligned ||
          b.dataCoverage - a.dataCoverage
        );
      if (sort === "improved") return latestDelta(b) - latestDelta(a);
      if (sort === "recent")
        return (
          (store.entries[b.symbol]?.updatedAt ?? 0) -
          (store.entries[a.symbol]?.updatedAt ?? 0)
        );
      if (sort === "symbol") return a.symbol.localeCompare(b.symbol);
      if (sort === "stage") return a.stage.localeCompare(b.stage);
      return b.convergenceScore - a.convergenceScore;
    });
  }, [store.symbols, store.entries, store.snapshots, sort]);

  const surfaced = plays.filter((play) => play.surfaced);
  const candidates = plays.filter(
    (play) =>
      !play.surfaced &&
      !!play.categories.find((category) => category.key === "technical")
        ?.aligned,
  );
  const watch = plays.filter(
    (play) => !play.surfaced && !candidates.includes(play),
  );
  const failed = store.symbols.filter(
    (symbol) => store.entries[symbol]?.status === "error",
  );
  const filtered =
    view === "surfaced"
      ? surfaced
      : view === "candidates"
        ? candidates
        : view === "watch"
          ? watch
          : plays;
  const scanning = store.scanQueue.status === "running";
  const previewNew = preview.symbols.filter(
    (symbol) => !store.symbols.includes(symbol),
  );
  const estimatedMinutes =
    store.priceProvider === "twelveData"
      ? Math.ceil((previewNew.length * 8) / 60)
      : Math.ceil((previewNew.length * 1.5) / 60);

  const submitTicker = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    void store.scanSymbols([draft.trim().toUpperCase()]);
    setDraft("");
  };
  const toggle = (symbol: string) =>
    setSelected((current) =>
      current.includes(symbol)
        ? current.filter((value) => value !== symbol)
        : [...current, symbol],
    );

  return (
    <div className="space-y-5" data-ocid="live.panel">
      <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Find and scan tickers
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Preview imports before spending API quota. Scans run in your browser
          and can be paused without losing completed results.
        </p>
        <form onSubmit={submitTicker} className="mb-3 flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Scan one ticker"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm"
          />
          <Button type="submit" disabled={!draft.trim()}>
            <Search className="mr-1.5 h-4 w-4" /> Scan ticker
          </Button>
        </form>
        {!previewText ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewText(" ")}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Import list or Finviz table
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={scanning}
              onClick={() => {
                setPreviewText(STARTER_UNIVERSE.join(", "));
              }}
            >
              Preview starter set ({STARTER_UNIVERSE.length})
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-border bg-card/70 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">Import preview</p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setPreviewText("")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={previewText.trimStart()}
              onChange={(event) => setPreviewText(event.target.value)}
              placeholder="Paste ticker list or full exported table here"
              className="min-h-28 bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Detected {preview.symbols.length} · {previewNew.length} new ·{" "}
              {preview.symbols.length - previewNew.length} already present ·{" "}
              {preview.duplicates.length} duplicates · {preview.rejected.length}{" "}
              rejected
            </p>
            <div className="max-h-20 overflow-auto rounded-md bg-muted/40 p-2 font-mono text-xs">
              {preview.symbols.join(", ") || "No valid tickers detected yet."}
            </div>
            {previewNew.length > 0 && (
              <p className="text-xs text-accent">
                Estimated scan time: about {estimatedMinutes || 1} minute(s).
                Expected price-provider requests: at least {previewNew.length},
                plus cached benchmark and optional Finnhub requests.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={preview.symbols.length === 0 || scanning}
                onClick={() => {
                  void store.scanSymbols(previewNew);
                  setPreviewText("");
                }}
              >
                Scan new tickers ({previewNew.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={preview.symbols.length === 0}
                onClick={() => {
                  store.addWithoutScan(preview.symbols);
                  setPreviewText("");
                }}
              >
                Add without scanning
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={preview.symbols.length === 0 || scanning}
                onClick={() => {
                  void store.scanSymbols(preview.symbols);
                  setPreviewText("");
                }}
              >
                Rescan all detected
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {[
            ["Surfaced", surfaced.length],
            ["Candidates", candidates.length],
            ["On watch", watch.length],
            ["Failed", failed.length],
            ["Scanning", store.scanQueue.pending.length],
          ].map(([label, count]) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-3"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-mono text-2xl font-bold text-foreground">
                {count}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
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
                {option}
              </Button>
            ),
          )}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as ResultSort)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          >
            <option value="score">Highest evidence strength</option>
            <option value="coverage">Highest data confidence</option>
            <option value="aligned">Evidence families aligned</option>
            <option value="closest">Closest to surfaced</option>
            <option value="improved">Most improved</option>
            <option value="recent">Recently refreshed</option>
            <option value="stage">Technical stage</option>
            <option value="symbol">Ticker symbol</option>
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => exportCsv(filtered)}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm">{selected.length} selected</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void store.scanSymbols(selected)}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                for (const symbol of selected) {
                  const play = store.entries[symbol]?.play;
                  if (play) store.trackPlay(play);
                }
              }}
            >
              Track selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                store.removeSymbols(selected);
                setSelected([]);
              }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove selected
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((play, index) => {
            const entry = store.entries[play.symbol];
            const snapshots = store.snapshots[play.symbol] ?? [];
            const scoreDelta =
              snapshots.length > 1
                ? snapshots.at(-1)!.score - snapshots.at(-2)!.score
                : null;
            const coverageDelta =
              snapshots.length > 1
                ? snapshots.at(-1)!.coverage - snapshots.at(-2)!.coverage
                : null;
            const alignedDelta =
              snapshots.length > 1
                ? snapshots.at(-1)!.aligned - snapshots.at(-2)!.aligned
                : null;
            const manual = manualCoverage(
              play,
              store.manualEvidence[play.symbol],
            );
            return (
              <div key={play.symbol} className="relative">
                <div className="mb-1 flex items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={selected.includes(play.symbol)}
                      onChange={() => toggle(play.symbol)}
                    />
                    Select
                  </label>
                  <span>
                    Updated{" "}
                    {entry?.updatedAt
                      ? new Date(entry.updatedAt).toLocaleString()
                      : "unknown"}
                    {scoreDelta !== null
                      ? ` · score ${scoreDelta >= 0 ? "+" : ""}${scoreDelta} · coverage ${coverageDelta! >= 0 ? "+" : ""}${coverageDelta} · families ${alignedDelta! >= 0 ? "+" : ""}${alignedDelta}`
                      : ""}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title={`Refresh ${play.symbol}`}
                      onClick={() => void store.refreshOne(play.symbol)}
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${entry?.status === "loading" ? "animate-spin" : ""}`}
                      />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title={`Track ${play.symbol}`}
                      onClick={() => store.trackPlay(play)}
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title={`Remove ${play.symbol}`}
                      onClick={() => store.removeSymbol(play.symbol)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <PlayCard play={play} rank={index + 1} />
                <p className="mt-1 px-2 text-[11px] text-muted-foreground">
                  Data confidence: {play.dataCoverage}% total ·{" "}
                  {Math.max(0, play.dataCoverage - manual)}% automated ·{" "}
                  {manual}% manual research
                </p>
                <p className="mt-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                  Next research: {missingWork(play)}
                </p>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No results in this view yet.
          </p>
        )}
      </section>

      <details className="rounded-2xl border border-border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4">
          <span className="font-semibold text-foreground">
            Scan status · {plays.length} complete ·{" "}
            {store.scanQueue.pending.length} queued · {failed.length} failed
          </span>
          <ChevronDown className="h-4 w-4" />
        </summary>
        <div className="border-t border-border p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {scanning ? (
              <Button size="sm" variant="outline" onClick={store.pauseScan}>
                <Pause className="mr-1.5 h-4 w-4" /> Pause
              </Button>
            ) : store.scanQueue.status === "paused" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void store.resumeScan()}
              >
                <PlayIcon className="mr-1.5 h-4 w-4" /> Resume
              </Button>
            ) : null}
            {failed.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void store.retryErrored()}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> Retry failures
              </Button>
            )}
            {watch.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  store.removeSymbols(watch.map((play) => play.symbol))
                }
              >
                Clear on watch
              </Button>
            )}
          </div>
          <div className="max-h-64 space-y-1 overflow-auto">
            {store.symbols.map((symbol) => {
              const entry = store.entries[symbol];
              return (
                <div
                  key={symbol}
                  className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2 text-xs"
                >
                  <span className="w-16 font-mono font-semibold">{symbol}</span>
                  {entry?.status === "loading" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Fetching
                    </>
                  ) : entry?.status === "error" ? (
                    <>
                      <TriangleAlert className="h-3 w-3 text-destructive" />{" "}
                      {entry.error}
                    </>
                  ) : entry?.status === "ok" ? (
                    "Complete"
                  ) : (
                    "Added, not scanned"
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </details>
    </div>
  );
}
