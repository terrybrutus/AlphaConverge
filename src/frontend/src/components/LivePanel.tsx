import { PlayCard } from "@/components/PlayCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STARTER_UNIVERSE } from "@/data/starterUniverse";
import { type PriceProvider, useLiveStore } from "@/lib/liveStore";
import type { Play } from "@/types/ticker";
import {
  KeyRound,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Telescope,
  TriangleAlert,
  X,
} from "lucide-react";
import { type FormEvent, useState } from "react";

const PRICE_PROVIDERS: Record<
  PriceProvider,
  { label: string; keyLabel: string; signupUrl: string; note: string }
> = {
  alphaVantage: {
    label: "Alpha Vantage",
    keyLabel: "Alpha Vantage API key",
    signupUrl: "https://www.alphavantage.co/support/#api-key",
    note: "Free tier ~25 requests/day — fine for a few names, too small to scan a set.",
  },
  twelveData: {
    label: "Twelve Data",
    keyLabel: "Twelve Data API key",
    signupUrl: "https://twelvedata.com/pricing",
    note: "Free tier ~800/day, 8/min — high enough to scan the starter set.",
  },
};

export function LivePanel() {
  const apiKey = useLiveStore((s) => s.apiKey);
  const finnhubKey = useLiveStore((s) => s.finnhubKey);
  const priceProvider = useLiveStore((s) => s.priceProvider);
  const symbols = useLiveStore((s) => s.symbols);
  const entries = useLiveStore((s) => s.entries);
  const setApiKey = useLiveStore((s) => s.setApiKey);
  const setFinnhubKey = useLiveStore((s) => s.setFinnhubKey);
  const setPriceProvider = useLiveStore((s) => s.setPriceProvider);
  const addSymbol = useLiveStore((s) => s.addSymbol);
  const loadSymbols = useLiveStore((s) => s.loadSymbols);
  const removeSymbol = useLiveStore((s) => s.removeSymbol);
  const refreshAll = useLiveStore((s) => s.refreshAll);

  const [keyDraft, setKeyDraft] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [finnhubDraft, setFinnhubDraft] = useState("");
  const [editingFinnhub, setEditingFinnhub] = useState(false);
  const [symbolDraft, setSymbolDraft] = useState("");

  const hasKey = apiKey.length > 0;
  const pp = PRICE_PROVIDERS[priceProvider];
  const scanning = symbols.some((s) => entries[s]?.status === "loading");

  // Ranked live results — highest convergence first, surfaced split out.
  const livePlays = symbols
    .map((sym) => entries[sym]?.play)
    .filter((p): p is Play => !!p)
    .sort((a, b) => b.convergenceScore - a.convergenceScore);
  const liveSurfaced = livePlays.filter((p) => p.surfaced);
  const liveWatch = livePlays.filter((p) => !p.surfaced);

  const submitKey = (e: FormEvent) => {
    e.preventDefault();
    setApiKey(keyDraft);
    setKeyDraft("");
    setEditingKey(false);
  };

  const submitFinnhub = (e: FormEvent) => {
    e.preventDefault();
    setFinnhubKey(finnhubDraft);
    setFinnhubDraft("");
    setEditingFinnhub(false);
  };

  const submitSymbol = (e: FormEvent) => {
    e.preventDefault();
    const s = symbolDraft.trim();
    if (!s) return;
    addSymbol(s);
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
        set and let the engine surface what converges. Technical and Macro
        (market regime + sector rotation) are computed live from price; add a
        Finnhub key to also source Fundamentals (insider buys, revenue accel)
        and Sentiment (news, analyst trend).
      </p>

      {/* Price source */}
      <div className="mb-4">
        <span className="text-xs font-medium text-muted-foreground">
          Price source
        </span>
        <div className="mt-1.5 flex gap-2">
          {(Object.keys(PRICE_PROVIDERS) as PriceProvider[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPriceProvider(id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                priceProvider === id
                  ? "border-primary/50 bg-primary/15 text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {PRICE_PROVIDERS[id].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/80 mt-1.5">{pp.note}</p>
      </div>

      {/* API key */}
      {!hasKey || editingKey ? (
        <form onSubmit={submitKey} className="mb-4">
          <label
            htmlFor="av-key"
            className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" /> {pp.keyLabel}
          </label>
          <div className="flex gap-2">
            <Input
              id="av-key"
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="Paste your free key"
              className="bg-muted/50"
            />
            <Button type="submit" disabled={!keyDraft.trim()}>
              Save
            </Button>
          </div>
          <a
            href={pp.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-1.5 inline-block"
          >
            Get a free key (~30 seconds) →
          </a>
        </form>
      ) : (
        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="text-muted-foreground">
            <KeyRound className="w-3.5 h-3.5 inline mr-1" /> Price key saved
          </span>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => setEditingKey(true)}
          >
            Change
          </button>
        </div>
      )}

      {/* Optional Finnhub key — unlocks the Fundamental category */}
      {finnhubKey.length === 0 || editingFinnhub ? (
        <form onSubmit={submitFinnhub} className="mb-4">
          <label
            htmlFor="fh-key"
            className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" /> Finnhub API key{" "}
            <span className="text-muted-foreground/70">
              (optional — adds Fundamentals)
            </span>
          </label>
          <div className="flex gap-2">
            <Input
              id="fh-key"
              type="password"
              value={finnhubDraft}
              onChange={(e) => setFinnhubDraft(e.target.value)}
              placeholder="Paste your free Finnhub key"
              className="bg-muted/50"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={!finnhubDraft.trim()}
            >
              Save
            </Button>
          </div>
          <a
            href="https://finnhub.io/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-1.5 inline-block"
          >
            Get a free Finnhub key →
          </a>
        </form>
      ) : (
        <div className="flex items-center justify-between mb-4 text-sm">
          <span className="text-muted-foreground">
            <KeyRound className="w-3.5 h-3.5 inline mr-1" /> Fundamentals key
            saved
          </span>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => setEditingFinnhub(true)}
          >
            Change
          </button>
        </div>
      )}

      {/* Add symbol */}
      <form onSubmit={submitSymbol} className="flex gap-2 mb-4">
        <Input
          value={symbolDraft}
          onChange={(e) => setSymbolDraft(e.target.value.toUpperCase())}
          placeholder="Add ticker (e.g. PLTR)"
          className="bg-muted/50"
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
      </div>

      {symbols.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No live tickers yet. Add one, or load the starter set to let the
          engine surface candidates.
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
                    {entry.error}
                  </span>
                )}
                {!entry && (
                  <span className="text-xs text-muted-foreground">Queued</span>
                )}
              </div>
              <button
                type="button"
                aria-label={`Remove ${sym}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeSymbol(sym)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Surfaced live plays — the ones that fit the criteria */}
      {liveSurfaced.length > 0 && (
        <div className="mt-4">
          <h3 className="font-display text-base font-semibold text-primary mb-2">
            Surfaced ({liveSurfaced.length}) — 4+ dimensions converging
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

      {/* Scanned but not surfaced — ranked by convergence */}
      {liveWatch.length > 0 && (
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
