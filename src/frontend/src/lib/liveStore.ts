import { analyzePlay } from "@/lib/ai/analyze";
import {
  type BtResult,
  type BtSample,
  aggregate,
  backtestCandles,
  backtestCoverage,
} from "@/lib/backtest";
import { scoreTicker } from "@/lib/convergence";
import { buildLiveTicker } from "@/lib/liveTicker";
import { type MacroFacts, fetchMacro } from "@/lib/macro";
import { alphaVantageProvider } from "@/lib/providers/alphaVantage";
import {
  type FundamentalData,
  type SentimentData,
  fetchFundamentals,
  fetchProfile,
  fetchSentiment,
} from "@/lib/providers/finnhub";
import { twelveDataProvider } from "@/lib/providers/twelveData";
import type { Play } from "@/types/ticker";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface LiveEntry {
  status: "loading" | "ok" | "error";
  play?: Play;
  error?: string;
  updatedAt?: number;
}

export interface AiNote {
  status: "loading" | "ok" | "error";
  text?: string;
  error?: string;
}

export type PriceProvider = "alphaVantage" | "twelveData";

export interface BacktestState {
  status: "idle" | "running" | "done" | "error";
  progress: { done: number; total: number };
  error?: string;
  result?: BtResult;
  failures: Array<{ symbol: string; error: string }>;
  succeeded: number;
}

interface LiveState {
  priceKeys: Record<PriceProvider, string>; // a separate key per price provider
  finnhubKey: string; // Finnhub (fundamentals + sentiment) — optional
  aiKey: string; // Anthropic (AI read) — optional
  priceProvider: PriceProvider;
  symbols: string[];
  entries: Record<string, LiveEntry>;
  aiNotes: Record<string, AiNote>;
  backtest: BacktestState;
  setApiKey: (key: string) => void; // sets the key for the CURRENT provider
  setPriceKey: (provider: PriceProvider, key: string) => void;
  setFinnhubKey: (key: string) => void;
  setAiKey: (key: string) => void;
  setPriceProvider: (p: PriceProvider) => void;
  clearUserSession: () => void;
  addSymbol: (symbol: string) => void;
  loadSymbols: (symbols: string[]) => Promise<void>;
  replaceSymbols: (symbols: string[]) => void;
  removeSymbol: (symbol: string) => void;
  refreshOne: (symbol: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  retryErrored: () => Promise<void>;
  analyze: (play: Play) => Promise<void>;
  runBacktest: (opts: { horizon: number; symbols: string[] }) => Promise<void>;
}

function priceProviderFor(p: PriceProvider) {
  return p === "twelveData" ? twelveDataProvider : alphaVantageProvider;
}

// Pacing between tickers during a batch scan, tuned to each free tier's
// per-minute ceiling (Twelve Data: 8/min = 1 every 7.5s; we use 8s to be safe).
function scanDelayMs(p: PriceProvider): number {
  // Twelve Data has a provider-level queue that also covers benchmark calls.
  return p === "twelveData" ? 0 : 1500;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const memoryStorage = {
  getItem: (_name: string) => null,
  setItem: (_name: string, _value: string) => undefined,
  removeItem: (_name: string) => undefined,
};

export const useLiveStore = create<LiveState>()(
  persist(
    (set, get) => ({
      priceKeys: { alphaVantage: "", twelveData: "" },
      finnhubKey: "",
      aiKey: "",
      priceProvider: "alphaVantage",
      symbols: [],
      entries: {},
      aiNotes: {},
      backtest: {
        status: "idle",
        progress: { done: 0, total: 0 },
        failures: [],
        succeeded: 0,
      },

      setApiKey: (key) =>
        set((s) => ({
          priceKeys: { ...s.priceKeys, [s.priceProvider]: key.trim() },
        })),
      setPriceKey: (provider, key) =>
        set((s) => ({
          priceKeys: { ...s.priceKeys, [provider]: key.trim() },
        })),
      setFinnhubKey: (key) => set({ finnhubKey: key.trim() }),
      setAiKey: (key) => set({ aiKey: key.trim() }),
      setPriceProvider: (p) => set({ priceProvider: p }),
      clearUserSession: () =>
        set({
          priceKeys: { alphaVantage: "", twelveData: "" },
          finnhubKey: "",
          aiKey: "",
          symbols: [],
          entries: {},
          aiNotes: {},
          backtest: {
            status: "idle",
            progress: { done: 0, total: 0 },
            failures: [],
            succeeded: 0,
          },
        }),

      analyze: async (play) => {
        const { aiKey } = get();
        const sym = play.symbol;
        if (!aiKey) {
          set((s) => ({
            aiNotes: {
              ...s.aiNotes,
              [sym]: {
                status: "error",
                error: "Add your Anthropic API key first.",
              },
            },
          }));
          return;
        }
        set((s) => ({
          aiNotes: { ...s.aiNotes, [sym]: { status: "loading" } },
        }));
        try {
          const text = await analyzePlay(play, aiKey);
          set((s) => ({
            aiNotes: { ...s.aiNotes, [sym]: { status: "ok", text } },
          }));
        } catch (e) {
          set((s) => ({
            aiNotes: {
              ...s.aiNotes,
              [sym]: { status: "error", error: (e as Error).message },
            },
          }));
        }
      },

      addSymbol: (raw) => {
        const symbol = raw.trim().toUpperCase();
        if (!symbol) return;
        if (get().symbols.includes(symbol)) {
          void get().refreshOne(symbol);
          return;
        }
        set((s) => ({ symbols: [...s.symbols, symbol] }));
        void get().refreshOne(symbol);
      },

      // Add many symbols (e.g. the starter universe) without firing a fetch per
      // symbol, then scan them sequentially with pacing.
      loadSymbols: async (raw) => {
        const existing = get().symbols;
        const entries = get().entries;
        const incoming = Array.from(
          new Set(raw.map((s) => s.trim().toUpperCase()).filter(Boolean)),
        ).filter((symbol) => !existing.includes(symbol) || !entries[symbol]);
        set((s) => {
          const merged = [...s.symbols];
          for (const sym of incoming)
            if (!merged.includes(sym)) merged.push(sym);
          return { symbols: merged };
        });
        const delay = scanDelayMs(get().priceProvider);
        for (let i = 0; i < incoming.length; i++) {
          await get().refreshOne(incoming[i]);
          if (i < incoming.length - 1) await sleep(delay);
        }
      },

      replaceSymbols: (raw) =>
        set({
          symbols: Array.from(
            new Set(
              raw.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
            ),
          ),
          entries: {},
          aiNotes: {},
        }),

      removeSymbol: (symbol) =>
        set((s) => {
          const entries = { ...s.entries };
          delete entries[symbol];
          return {
            symbols: s.symbols.filter((x) => x !== symbol),
            entries,
          };
        }),

      refreshOne: async (symbol) => {
        const { priceProvider } = get();
        const apiKey = get().priceKeys[priceProvider];
        const provider = priceProviderFor(priceProvider);
        if (!apiKey) {
          set((s) => ({
            entries: {
              ...s.entries,
              [symbol]: {
                status: "error",
                error: `Add your ${provider.name} API key first.`,
              },
            },
          }));
          return;
        }
        set((s) => ({
          entries: { ...s.entries, [symbol]: { status: "loading" } },
        }));
        try {
          const candles = await provider.weeklyCandles(symbol, apiKey);

          // Everything beyond price is best-effort: a failure here must not sink
          // the technical analysis, which is the core of the live ticker.
          let name: string | undefined;
          let sector: string | undefined;
          let fundamentals: FundamentalData | undefined;
          let sentiment: SentimentData | undefined;
          let source = provider.name;
          const { finnhubKey } = get();
          if (finnhubKey) {
            try {
              const profile = await fetchProfile(symbol, finnhubKey);
              name = profile.name;
              sector = profile.sector;
            } catch {
              // leave undefined
            }
            try {
              fundamentals = await fetchFundamentals(symbol, finnhubKey);
            } catch {
              fundamentals = undefined;
            }
            try {
              sentiment = await fetchSentiment(symbol, finnhubKey);
            } catch {
              sentiment = undefined;
            }
            if (fundamentals || sentiment) {
              source = `${provider.name} + Finnhub`;
            }
          }

          // Macro/sector uses the price provider (SPY + sector ETF trends,
          // cached across the scan); sector comes from the profile above.
          let macro: MacroFacts | undefined;
          try {
            macro = await fetchMacro(provider, apiKey, sector);
          } catch {
            macro = undefined;
          }

          const ticker = buildLiveTicker(symbol, candles, {
            name,
            sector,
            source,
            fundamentals,
            sentiment,
            macro,
          });
          const play = scoreTicker(ticker);
          set((s) => ({
            entries: {
              ...s.entries,
              [symbol]: { status: "ok", play, updatedAt: Date.now() },
            },
          }));
        } catch (e) {
          set((s) => ({
            entries: {
              ...s.entries,
              [symbol]: { status: "error", error: (e as Error).message },
            },
          }));
        }
      },

      refreshAll: async () => {
        // Sequential and paced to the selected provider's free-tier limit.
        // The UI groups progress naturally, but requests never run concurrently.
        const delay = scanDelayMs(get().priceProvider);
        const symbols = get().symbols;
        for (let i = 0; i < symbols.length; i++) {
          await get().refreshOne(symbols[i]);
          if (i < symbols.length - 1) await sleep(delay);
        }
      },

      retryErrored: async () => {
        const { entries, symbols } = get();
        const errored = symbols.filter((s) => entries[s]?.status === "error");
        const delay = scanDelayMs(get().priceProvider);
        for (let i = 0; i < errored.length; i++) {
          await get().refreshOne(errored[i]);
          if (i < errored.length - 1) await sleep(delay);
        }
      },

      runBacktest: async ({ horizon, symbols }) => {
        const { priceProvider } = get();
        const apiKey = get().priceKeys[priceProvider];
        const provider = priceProviderFor(priceProvider);
        if (!apiKey) {
          set({
            backtest: {
              status: "error",
              progress: { done: 0, total: 0 },
              failures: [],
              succeeded: 0,
              error: `Add your ${provider.name} API key first.`,
            },
          });
          return;
        }
        if (symbols.length === 0) {
          set({
            backtest: {
              status: "error",
              progress: { done: 0, total: 0 },
              failures: [],
              succeeded: 0,
              error: "No tickers to backtest.",
            },
          });
          return;
        }
        set({
          backtest: {
            status: "running",
            progress: { done: 0, total: symbols.length },
            failures: [],
            succeeded: 0,
          },
        });
        const delay = scanDelayMs(priceProvider);
        const samples: BtSample[] = [];
        const failures: Array<{ symbol: string; error: string }> = [];
        let succeeded = 0;
        for (let i = 0; i < symbols.length; i++) {
          try {
            const candles = await provider.weeklyCandles(symbols[i], apiKey);
            const tickerSamples = backtestCandles(symbols[i], candles, horizon);
            if (tickerSamples.length === 0) {
              failures.push({
                symbol: symbols[i],
                error: "Not enough history for this horizon.",
              });
            } else {
              samples.push(...tickerSamples);
              succeeded++;
            }
          } catch (e) {
            failures.push({
              symbol: symbols[i],
              error: (e as Error).message,
            });
          }
          set((s) => ({
            backtest: {
              ...s.backtest,
              progress: { done: i + 1, total: symbols.length },
              failures: [...failures],
              succeeded,
            },
          }));
          if (i < symbols.length - 1) await sleep(delay);
        }
        const result =
          samples.length > 0 ? aggregate(samples, horizon) : undefined;
        const coverage = backtestCoverage(
          succeeded,
          symbols.length,
          result?.baseline.effectiveCount ?? 0,
        );
        set({
          backtest: {
            status: coverage.usable ? "done" : "error",
            progress: { done: symbols.length, total: symbols.length },
            failures,
            succeeded,
            result,
            error: coverage.error,
          },
        });
      },
    }),
    {
      name: "alphaconverge-live",
      version: 3,
      storage: createJSONStorage(() =>
        typeof localStorage === "undefined" ? memoryStorage : localStorage,
      ),
      migrate: (persisted) => {
        const prior = persisted as Partial<LiveState>;
        return {
          priceProvider: prior.priceProvider ?? "alphaVantage",
          symbols: prior.symbols ?? [],
          entries: prior.entries ?? {},
        } as LiveState;
      },
      partialize: (s) => ({
        priceProvider: s.priceProvider,
        symbols: s.symbols,
        entries: Object.fromEntries(
          Object.entries(s.entries).filter(
            ([, entry]) => entry.status === "ok",
          ),
        ),
      }),
    },
  ),
);
