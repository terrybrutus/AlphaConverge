import { analyzePlay } from "@/lib/ai/analyze";
import {
  type BtResult,
  type BtSample,
  aggregate,
  backtestCandles,
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
import { persist } from "zustand/middleware";

export interface LiveEntry {
  status: "loading" | "ok" | "error";
  play?: Play;
  error?: string;
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
  setFinnhubKey: (key: string) => void;
  setAiKey: (key: string) => void;
  setPriceProvider: (p: PriceProvider) => void;
  addSymbol: (symbol: string) => void;
  loadSymbols: (symbols: string[]) => Promise<void>;
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
  return p === "twelveData" ? 8000 : 1500;
}

// Max tickers fetched before a longer inter-batch pause. Twelve Data's free tier
// allows 8/min, so after 5 back-to-back requests (each ~8s apart) we've already
// spent ~40s and used 5 of 8 slots — staying well within the limit.
const BATCH_SIZE = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      backtest: { status: "idle", progress: { done: 0, total: 0 } },

      setApiKey: (key) =>
        set((s) => ({
          priceKeys: { ...s.priceKeys, [s.priceProvider]: key.trim() },
        })),
      setFinnhubKey: (key) => set({ finnhubKey: key.trim() }),
      setAiKey: (key) => set({ aiKey: key.trim() }),
      setPriceProvider: (p) => set({ priceProvider: p }),

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
        const incoming = raw.map((s) => s.trim().toUpperCase()).filter(Boolean);
        set((s) => {
          const merged = [...s.symbols];
          for (const sym of incoming)
            if (!merged.includes(sym)) merged.push(sym);
          return { symbols: merged };
        });
        await get().refreshAll();
      },

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
            entries: { ...s.entries, [symbol]: { status: "ok", play } },
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
        // Sequential, paced to the price provider's per-minute limit.
        // Fetches at most BATCH_SIZE tickers before a longer pause so we never
        // exceed the free-tier rate limit (Twelve Data: 8/min).
        const delay = scanDelayMs(get().priceProvider);
        const symbols = get().symbols;
        for (let i = 0; i < symbols.length; i++) {
          await get().refreshOne(symbols[i]);
          if (i < symbols.length - 1) {
            // After every BATCH_SIZE tickers, pause for a full minute window
            // before continuing (conservative guard against burst limits).
            const isEndOfBatch =
              (i + 1) % BATCH_SIZE === 0 && i + 1 < symbols.length;
            await sleep(isEndOfBatch ? 60_000 : delay);
          }
        }
      },

      retryErrored: async () => {
        const { entries, symbols } = get();
        const errored = symbols.filter((s) => entries[s]?.status === "error");
        const delay = scanDelayMs(get().priceProvider);
        for (let i = 0; i < errored.length; i++) {
          await get().refreshOne(errored[i]);
          if (i < errored.length - 1) {
            const isEndOfBatch =
              (i + 1) % BATCH_SIZE === 0 && i + 1 < errored.length;
            await sleep(isEndOfBatch ? 60_000 : delay);
          }
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
              error: "No tickers to backtest.",
            },
          });
          return;
        }
        set({
          backtest: {
            status: "running",
            progress: { done: 0, total: symbols.length },
          },
        });
        const delay = scanDelayMs(priceProvider);
        const samples: BtSample[] = [];
        for (let i = 0; i < symbols.length; i++) {
          try {
            const candles = await provider.weeklyCandles(symbols[i], apiKey);
            samples.push(...backtestCandles(symbols[i], candles, horizon));
          } catch {
            // skip tickers that fail / rate-limit; the run continues
          }
          set((s) => ({
            backtest: {
              ...s.backtest,
              progress: { done: i + 1, total: symbols.length },
            },
          }));
          if (i < symbols.length - 1) await sleep(delay);
        }
        set({
          backtest: {
            status: "done",
            progress: { done: symbols.length, total: symbols.length },
            result: aggregate(samples, horizon),
          },
        });
      },
    }),
    {
      name: "alphaconverge-live",
      version: 1,
      // v0 used a single `apiKey` shared across providers — migrate it onto the
      // Alpha Vantage slot so existing users don't lose their saved key.
      migrate: (persisted: unknown, version: number) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version < 1 && typeof p.apiKey === "string") {
          p.priceKeys = { alphaVantage: p.apiKey, twelveData: "" };
        }
        return p as unknown as LiveState;
      },
      partialize: (s) => ({
        priceKeys: s.priceKeys,
        finnhubKey: s.finnhubKey,
        aiKey: s.aiKey,
        priceProvider: s.priceProvider,
        symbols: s.symbols,
      }),
    },
  ),
);
