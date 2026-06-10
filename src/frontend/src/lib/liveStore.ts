import { analyzePlay } from "@/lib/ai/analyze";
import { scoreTicker } from "@/lib/convergence";
import { buildLiveTicker } from "@/lib/liveTicker";
import { alphaVantageProvider } from "@/lib/providers/alphaVantage";
import {
  type FundamentalData,
  type SentimentData,
  fetchFundamentals,
  fetchSentiment,
} from "@/lib/providers/finnhub";
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

interface LiveState {
  apiKey: string; // Alpha Vantage (price/technical)
  finnhubKey: string; // Finnhub (fundamentals) — optional
  aiKey: string; // Anthropic (AI read) — optional
  symbols: string[];
  entries: Record<string, LiveEntry>;
  aiNotes: Record<string, AiNote>;
  setApiKey: (key: string) => void;
  setFinnhubKey: (key: string) => void;
  setAiKey: (key: string) => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  refreshOne: (symbol: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  analyze: (play: Play) => Promise<void>;
}

const provider = alphaVantageProvider;

export const useLiveStore = create<LiveState>()(
  persist(
    (set, get) => ({
      apiKey: "",
      finnhubKey: "",
      aiKey: "",
      symbols: [],
      entries: {},
      aiNotes: {},

      setApiKey: (key) => set({ apiKey: key.trim() }),
      setFinnhubKey: (key) => set({ finnhubKey: key.trim() }),
      setAiKey: (key) => set({ aiKey: key.trim() }),

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
        const { apiKey } = get();
        if (!apiKey) {
          set((s) => ({
            entries: {
              ...s.entries,
              [symbol]: {
                status: "error",
                error: "Add your Alpha Vantage API key first.",
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

          // Fundamentals + sentiment are best-effort: a failure here must not
          // sink the technical analysis, which is the core of the live ticker.
          let fundamentals: FundamentalData | undefined;
          let sentiment: SentimentData | undefined;
          let source = provider.name;
          const { finnhubKey } = get();
          if (finnhubKey) {
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

          const ticker = buildLiveTicker(symbol, candles, {
            source,
            fundamentals,
            sentiment,
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
        // Sequential to respect free-tier rate limits.
        for (const symbol of get().symbols) {
          await get().refreshOne(symbol);
        }
      },
    }),
    {
      name: "alphaconverge-live",
      partialize: (s) => ({
        apiKey: s.apiKey,
        finnhubKey: s.finnhubKey,
        aiKey: s.aiKey,
        symbols: s.symbols,
      }),
    },
  ),
);
