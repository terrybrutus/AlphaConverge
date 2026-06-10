import { scoreTicker } from "@/lib/convergence";
import { buildLiveTicker } from "@/lib/liveTicker";
import { alphaVantageProvider } from "@/lib/providers/alphaVantage";
import type { Play } from "@/types/ticker";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LiveEntry {
  status: "loading" | "ok" | "error";
  play?: Play;
  error?: string;
}

interface LiveState {
  apiKey: string;
  symbols: string[];
  entries: Record<string, LiveEntry>;
  setApiKey: (key: string) => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  refreshOne: (symbol: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const provider = alphaVantageProvider;

export const useLiveStore = create<LiveState>()(
  persist(
    (set, get) => ({
      apiKey: "",
      symbols: [],
      entries: {},

      setApiKey: (key) => set({ apiKey: key.trim() }),

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
          const ticker = buildLiveTicker(symbol, candles, {
            source: provider.name,
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
      partialize: (s) => ({ apiKey: s.apiKey, symbols: s.symbols }),
    },
  ),
);
