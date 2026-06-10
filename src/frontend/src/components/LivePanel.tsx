import { PlayCard } from "@/components/PlayCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveStore } from "@/lib/liveStore";
import {
  KeyRound,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  TriangleAlert,
  X,
} from "lucide-react";
import { type FormEvent, useState } from "react";

export function LivePanel() {
  const apiKey = useLiveStore((s) => s.apiKey);
  const finnhubKey = useLiveStore((s) => s.finnhubKey);
  const symbols = useLiveStore((s) => s.symbols);
  const entries = useLiveStore((s) => s.entries);
  const setApiKey = useLiveStore((s) => s.setApiKey);
  const setFinnhubKey = useLiveStore((s) => s.setFinnhubKey);
  const addSymbol = useLiveStore((s) => s.addSymbol);
  const removeSymbol = useLiveStore((s) => s.removeSymbol);
  const refreshAll = useLiveStore((s) => s.refreshAll);

  const [keyDraft, setKeyDraft] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [finnhubDraft, setFinnhubDraft] = useState("");
  const [editingFinnhub, setEditingFinnhub] = useState(false);
  const [symbolDraft, setSymbolDraft] = useState("");

  const hasKey = apiKey.length > 0;

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
        Add any US ticker to score it on <strong>real</strong> data. Technical
        is computed live from price; add a Finnhub key to also source
        Fundamentals (insider buys, analyst trend, revenue accel). Remaining
        categories show as “no source” until their providers are wired
        (DATA.md).
      </p>

      {/* API key */}
      {!hasKey || editingKey ? (
        <form onSubmit={submitKey} className="mb-4">
          <label
            htmlFor="av-key"
            className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" /> Alpha Vantage API key
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
            href="https://www.alphavantage.co/support/#api-key"
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
            title="Refresh all"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </form>

      {symbols.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No live tickers yet. Add one above to see real technical analysis.
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

      {/* Scored live plays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {symbols.map((sym, i) => {
          const entry = entries[sym];
          if (entry?.status !== "ok" || !entry.play) return null;
          return (
            <div key={sym} className="relative">
              <button
                type="button"
                aria-label={`Remove ${sym}`}
                className="absolute -top-2 -right-2 z-10 rounded-full bg-card border border-border p-1 text-muted-foreground hover:text-destructive"
                onClick={() => removeSymbol(sym)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <PlayCard play={entry.play} rank={i + 1} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
