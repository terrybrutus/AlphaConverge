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
  fetchAlphaVantageFundamentals,
  fetchAlphaVantageMicrostructure,
  fetchAlphaVantageSentiment,
} from "@/lib/providers/alphaVantageEnrichment";
import {
  type FundamentalData,
  type SentimentData,
  fetchFundamentals,
  fetchProfile,
  fetchSentiment,
} from "@/lib/providers/finnhub";
import { fetchFmpFundamentals } from "@/lib/providers/fmp";
import {
  mergeFundamentals,
  mergeSentiment,
} from "@/lib/providers/fundamentals";
import type { MicrostructureData } from "@/lib/providers/microstructure";
import { twelveDataProvider } from "@/lib/providers/twelveData";
import {
  type ManualEvidence,
  type ManualSignalEvidence,
  type ValidationRecord,
  applyManualEvidence,
} from "@/lib/research";
import type { Play, ProviderAudit, TickerRaw } from "@/types/ticker";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface LiveEntry {
  status: "loading" | "ok" | "error";
  play?: Play;
  raw?: TickerRaw;
  error?: string;
  updatedAt?: number;
  providerAudits?: ProviderAudit[];
}

export interface PlaySnapshot {
  capturedAt: number;
  score: number;
  coverage: number;
  aligned: number;
  surfaced: boolean;
}

export interface ScanQueue {
  status: "idle" | "running" | "paused";
  pending: string[];
  completed: number;
  total: number;
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
  fmpKey: string;
  simfinKey: string;
  tiingoKey: string;
  aiKey: string; // Anthropic (AI read) — optional
  priceProvider: PriceProvider;
  symbols: string[];
  entries: Record<string, LiveEntry>;
  aiNotes: Record<string, AiNote>;
  backtest: BacktestState;
  manualEvidence: Record<string, ManualEvidence>;
  validationRecords: ValidationRecord[];
  snapshots: Record<string, PlaySnapshot[]>;
  scanQueue: ScanQueue;
  setApiKey: (key: string) => void; // sets the key for the CURRENT provider
  setPriceKey: (provider: PriceProvider, key: string) => void;
  setFinnhubKey: (key: string) => void;
  setFmpKey: (key: string) => void;
  setSimfinKey: (key: string) => void;
  setTiingoKey: (key: string) => void;
  setAiKey: (key: string) => void;
  setPriceProvider: (p: PriceProvider) => void;
  clearUserSession: () => void;
  addSymbol: (symbol: string) => void;
  loadSymbols: (symbols: string[]) => Promise<void>;
  addWithoutScan: (symbols: string[]) => void;
  scanSymbols: (symbols: string[]) => Promise<void>;
  pauseScan: () => void;
  resumeScan: () => Promise<void>;
  replaceSymbols: (symbols: string[]) => void;
  removeSymbol: (symbol: string) => void;
  removeSymbols: (symbols: string[]) => void;
  refreshOne: (symbol: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  retryErrored: () => Promise<void>;
  setManualEvidence: (
    symbol: string,
    signal: string,
    evidence?: ManualSignalEvidence,
  ) => void;
  trackPlay: (play: Play) => void;
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
      fmpKey: "",
      simfinKey: "",
      tiingoKey: "",
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
      manualEvidence: {},
      validationRecords: [],
      snapshots: {},
      scanQueue: { status: "idle", pending: [], completed: 0, total: 0 },

      setApiKey: (key) =>
        set((s) => ({
          priceKeys: { ...s.priceKeys, [s.priceProvider]: key.trim() },
        })),
      setPriceKey: (provider, key) =>
        set((s) => ({
          priceKeys: { ...s.priceKeys, [provider]: key.trim() },
        })),
      setFinnhubKey: (key) => set({ finnhubKey: key.trim() }),
      setFmpKey: (key) => set({ fmpKey: key.trim() }),
      setSimfinKey: (key) => set({ simfinKey: key.trim() }),
      setTiingoKey: (key) => set({ tiingoKey: key.trim() }),
      setAiKey: (key) => set({ aiKey: key.trim() }),
      setPriceProvider: (p) => set({ priceProvider: p }),
      clearUserSession: () =>
        set({
          priceKeys: { alphaVantage: "", twelveData: "" },
          finnhubKey: "",
          fmpKey: "",
          simfinKey: "",
          tiingoKey: "",
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
          manualEvidence: {},
          validationRecords: [],
          snapshots: {},
          scanQueue: { status: "idle", pending: [], completed: 0, total: 0 },
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
        await get().scanSymbols(incoming);
      },

      addWithoutScan: (raw) =>
        set((s) => ({
          symbols: Array.from(
            new Set([
              ...s.symbols,
              ...raw
                .map((symbol) => symbol.trim().toUpperCase())
                .filter(Boolean),
            ]),
          ),
        })),

      scanSymbols: async (raw) => {
        const queue = Array.from(
          new Set(
            raw.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
          ),
        );
        get().addWithoutScan(queue);
        set({
          scanQueue: {
            status: "running",
            pending: queue,
            completed: 0,
            total: queue.length,
          },
        });
        const delay = scanDelayMs(get().priceProvider);
        while (get().scanQueue.pending.length > 0) {
          if (get().scanQueue.status === "paused") return;
          const symbol = get().scanQueue.pending[0];
          await get().refreshOne(symbol);
          set((s) => ({
            scanQueue: {
              ...s.scanQueue,
              pending: s.scanQueue.pending.slice(1),
              completed: s.scanQueue.completed + 1,
            },
          }));
          if (get().scanQueue.pending.length > 0) await sleep(delay);
        }
        set((s) => ({ scanQueue: { ...s.scanQueue, status: "idle" } }));
      },

      pauseScan: () =>
        set((s) => ({
          scanQueue: { ...s.scanQueue, status: "paused" },
        })),

      resumeScan: async () => {
        const pending = get().scanQueue.pending;
        if (pending.length === 0) return;
        await get().scanSymbols(pending);
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

      removeSymbols: (symbols) =>
        set((s) => {
          const remove = new Set(symbols);
          const entries = { ...s.entries };
          for (const symbol of remove) delete entries[symbol];
          return {
            symbols: s.symbols.filter((symbol) => !remove.has(symbol)),
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
                ...s.entries[symbol],
                status: "error",
                error: `Add your ${provider.name} API key first.`,
              },
            },
          }));
          return;
        }
        set((s) => ({
          entries: {
            ...s.entries,
            [symbol]: { ...s.entries[symbol], status: "loading" },
          },
        }));
        try {
          const providerAudits: ProviderAudit[] = [];
          const candles = await provider.weeklyCandles(symbol, apiKey);
          providerAudits.push({
            provider: provider.name,
            area: "weekly price and volume",
            status: "success",
            detail: `${candles.length} weekly candles returned; Technical was computed locally.`,
          });

          // Everything beyond price is best-effort: a failure here must not sink
          // the technical analysis, which is the core of the live ticker.
          let name: string | undefined;
          let sector: string | undefined;
          let fundamentals: FundamentalData | undefined;
          let sentiment: SentimentData | undefined;
          let microstructure: MicrostructureData | undefined;
          let source = provider.name;
          const { finnhubKey, fmpKey } = get();
          if (finnhubKey) {
            try {
              const profile = await fetchProfile(symbol, finnhubKey);
              name = profile.name;
              sector = profile.sector;
              providerAudits.push({
                provider: "Finnhub",
                area: "profile",
                status: profile.name || profile.sector ? "success" : "partial",
                detail:
                  profile.name || profile.sector
                    ? "Company identity and sector metadata returned."
                    : "Request succeeded but returned no usable profile metadata.",
              });
            } catch (error) {
              providerAudits.push({
                provider: "Finnhub",
                area: "profile",
                status: "error",
                detail: (error as Error).message,
              });
            }
            try {
              fundamentals = await fetchFundamentals(symbol, finnhubKey);
              const count = Object.values(fundamentals.availability).filter(
                Boolean,
              ).length;
              providerAudits.push({
                provider: "Finnhub",
                area: "fundamentals",
                status: count > 0 ? "partial" : "error",
                detail:
                  count > 0
                    ? `${count} of 6 Fundamental signals became measurable.`
                    : "Request returned no measurable Fundamental signals.",
              });
            } catch (error) {
              fundamentals = undefined;
              providerAudits.push({
                provider: "Finnhub",
                area: "fundamentals",
                status: "error",
                detail: (error as Error).message,
              });
            }
            try {
              sentiment = await fetchSentiment(symbol, finnhubKey);
              const count = Object.values(sentiment.availability).filter(
                Boolean,
              ).length;
              providerAudits.push({
                provider: "Finnhub",
                area: "news and sentiment",
                status:
                  count >= 2 ? "success" : count > 0 ? "partial" : "error",
                detail:
                  count > 0
                    ? `${count} of 3 Sentiment signals became measurable.`
                    : "No recent company news was returned, so Sentiment remained unmeasurable.",
              });
            } catch (error) {
              sentiment = undefined;
              providerAudits.push({
                provider: "Finnhub",
                area: "news and sentiment",
                status: "error",
                detail: (error as Error).message,
              });
            }
            if (fundamentals || sentiment) {
              source = `${provider.name} + Finnhub`;
            }
          } else {
            providerAudits.push({
              provider: "Finnhub",
              area: "fundamentals and sentiment",
              status: "not-configured",
              detail:
                "No Finnhub key was active, so insider activity and company-news evidence were not requested.",
            });
          }

          if (fmpKey) {
            try {
              const fmp = await fetchFmpFundamentals(symbol, fmpKey);
              fundamentals = mergeFundamentals(fundamentals, fmp);
              const count = Object.values(fmp.availability).filter(
                Boolean,
              ).length;
              if (count > 0) {
                source = `${source} + FMP`;
              }
              providerAudits.push({
                provider: "FMP",
                area: "fundamentals",
                status: count > 0 ? "partial" : "error",
                detail:
                  count > 0
                    ? `${count} of 6 Fundamental signals became measurable.`
                    : "No usable revenue acceleration or historical valuation data returned; endpoints may be plan-gated.",
              });
            } catch (error) {
              providerAudits.push({
                provider: "FMP",
                area: "fundamentals",
                status: "error",
                detail: (error as Error).message,
              });
            }
          } else {
            providerAudits.push({
              provider: "FMP",
              area: "fundamentals",
              status: "not-configured",
              detail:
                "No FMP key was active, so revenue acceleration and historical P/E were not requested.",
            });
          }

          // A free Alpha Vantage account is too constrained for enrichment
          // across a broad queue. Use these extra calls only for one ticker.
          if (priceProvider === "alphaVantage" && get().scanQueue.total <= 1) {
            try {
              const alphaFundamentals = await fetchAlphaVantageFundamentals(
                symbol,
                apiKey,
              );
              fundamentals = mergeFundamentals(fundamentals, alphaFundamentals);
              if (Object.values(alphaFundamentals.availability).some(Boolean)) {
                source = `${source} + Alpha Vantage fundamentals`;
              }
              providerAudits.push({
                provider: "Alpha Vantage",
                area: "fundamental enrichment",
                status: Object.values(alphaFundamentals.availability).some(
                  Boolean,
                )
                  ? "partial"
                  : "error",
                detail: Object.values(alphaFundamentals.availability).some(
                  Boolean,
                )
                  ? "Quarterly statements returned and revenue acceleration became measurable."
                  : "Request succeeded but returned no usable revenue acceleration.",
              });
            } catch (error) {
              providerAudits.push({
                provider: "Alpha Vantage",
                area: "fundamental enrichment",
                status: "error",
                detail: (error as Error).message,
              });
            }
            try {
              const alphaSentiment = await fetchAlphaVantageSentiment(
                symbol,
                apiKey,
              );
              sentiment = mergeSentiment(sentiment, alphaSentiment);
              providerAudits.push({
                provider: "Alpha Vantage",
                area: "sentiment enrichment",
                status: Object.values(alphaSentiment.availability).some(Boolean)
                  ? "partial"
                  : "error",
                detail: Object.values(alphaSentiment.availability).some(Boolean)
                  ? "Ticker-specific news sentiment became measurable."
                  : "Request succeeded but returned no ticker-specific sentiment.",
              });
            } catch (error) {
              providerAudits.push({
                provider: "Alpha Vantage",
                area: "sentiment enrichment",
                status: "error",
                detail: (error as Error).message,
              });
            }
            try {
              microstructure = await fetchAlphaVantageMicrostructure(
                symbol,
                apiKey,
              );
              if (Object.values(microstructure.availability).some(Boolean)) {
                source = `${source} + Alpha Vantage options`;
              }
              providerAudits.push({
                provider: "Alpha Vantage",
                area: "options microstructure",
                status: Object.values(microstructure.availability).some(Boolean)
                  ? "partial"
                  : "error",
                detail: Object.values(microstructure.availability).some(Boolean)
                  ? "Options chain returned; unusual calls and put/call positioning were measured."
                  : "Options request returned no measurable microstructure fields.",
              });
            } catch (error) {
              providerAudits.push({
                provider: "Alpha Vantage",
                area: "options microstructure",
                status: "error",
                detail: (error as Error).message,
              });
            }
          } else {
            providerAudits.push({
              provider: "Alpha Vantage",
              area: "fundamental, sentiment, and options enrichment",
              status: "skipped",
              detail:
                priceProvider !== "alphaVantage"
                  ? "Skipped because Alpha Vantage is not the selected price provider."
                  : "Skipped during a batch scan to protect the free account's small daily quota. Scan one ticker to attempt it.",
            });
          }

          // Macro/sector uses the price provider (SPY + sector ETF trends,
          // cached across the scan); sector comes from the profile above.
          let macro: MacroFacts | undefined;
          try {
            macro = await fetchMacro(provider, apiKey, sector);
            const count = Object.values(macro.availability).filter(
              Boolean,
            ).length;
            providerAudits.push({
              provider: provider.name,
              area: "macro context",
              status: count > 0 ? "partial" : "error",
              detail:
                count > 0
                  ? `${count} Macro context signals became measurable; Macro remains context and cannot inflate convergence.`
                  : "No usable benchmark or sector context returned.",
            });
          } catch (error) {
            macro = undefined;
            providerAudits.push({
              provider: provider.name,
              area: "macro context",
              status: "error",
              detail: (error as Error).message,
            });
          }

          const ticker = buildLiveTicker(symbol, candles, {
            name,
            sector,
            source,
            fundamentals,
            sentiment,
            microstructure,
            macro,
          });
          const play = scoreTicker(
            applyManualEvidence(ticker, get().manualEvidence[symbol]),
          );
          set((s) => ({
            entries: {
              ...s.entries,
              [symbol]: {
                status: "ok",
                raw: ticker,
                play,
                updatedAt: Date.now(),
                providerAudits,
              },
            },
            validationRecords: s.validationRecords.map((record) =>
              record.symbol === symbol
                ? {
                    ...record,
                    latestPrice: play.price,
                    latestAt: Date.now(),
                  }
                : record,
            ),
            snapshots: {
              ...s.snapshots,
              [symbol]: [
                ...(s.snapshots[symbol] ?? []),
                {
                  capturedAt: Date.now(),
                  score: play.convergenceScore,
                  coverage: play.dataCoverage,
                  aligned: play.categoriesAligned,
                  surfaced: play.surfaced,
                },
              ].slice(-20),
            },
          }));
        } catch (e) {
          set((s) => ({
            entries: {
              ...s.entries,
              [symbol]: {
                ...s.entries[symbol],
                status: "error",
                error: (e as Error).message,
              },
            },
          }));
        }
      },

      refreshAll: async () => {
        // Sequential and paced to the selected provider's free-tier limit.
        // The UI groups progress naturally, but requests never run concurrently.
        await get().scanSymbols(get().symbols);
      },

      retryErrored: async () => {
        const { entries, symbols } = get();
        const errored = symbols.filter((s) => entries[s]?.status === "error");
        await get().scanSymbols(errored);
      },

      setManualEvidence: (symbol, signal, evidence) =>
        set((s) => {
          const current = s.manualEvidence[symbol] ?? { signals: {} };
          const signals = { ...current.signals };
          if (evidence) signals[signal] = evidence;
          else delete signals[signal];
          const manualEvidence = {
            ...s.manualEvidence,
            [symbol]: { signals },
          };
          const entry = s.entries[symbol];
          if (!entry?.raw) return { manualEvidence };
          const researched = applyManualEvidence(
            entry.raw,
            manualEvidence[symbol],
          );
          return {
            manualEvidence,
            entries: {
              ...s.entries,
              [symbol]: { ...entry, play: scoreTicker(researched) },
            },
          };
        }),

      trackPlay: (play) =>
        set((s) => {
          const now = Date.now();
          const alreadyTrackedToday = s.validationRecords.some(
            (record) =>
              record.symbol === play.symbol &&
              new Date(record.capturedAt).toDateString() ===
                new Date(now).toDateString(),
          );
          if (alreadyTrackedToday) return {};
          return {
            validationRecords: [
              ...s.validationRecords,
              {
                id: `${play.symbol}-${now}`,
                symbol: play.symbol,
                capturedAt: now,
                entryPrice: play.price,
                convergenceScore: play.convergenceScore,
                categoriesAligned: play.categoriesAligned,
                surfaced: play.surfaced,
                dataCoverage: play.dataCoverage,
                manualSignalCount: Object.keys(
                  s.manualEvidence[play.symbol]?.signals ?? {},
                ).length,
                latestPrice: play.price,
                latestAt: now,
              },
            ],
          };
        }),

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
      version: 6,
      storage: createJSONStorage(() =>
        typeof localStorage === "undefined" ? memoryStorage : localStorage,
      ),
      migrate: (persisted) => {
        const prior = persisted as Partial<LiveState>;
        return {
          priceProvider: prior.priceProvider ?? "alphaVantage",
          symbols: prior.symbols ?? [],
          entries: prior.entries ?? {},
          manualEvidence: prior.manualEvidence ?? {},
          validationRecords: prior.validationRecords ?? [],
          snapshots: prior.snapshots ?? {},
          scanQueue: prior.scanQueue
            ? {
                ...prior.scanQueue,
                status: prior.scanQueue.pending.length > 0 ? "paused" : "idle",
              }
            : { status: "idle", pending: [], completed: 0, total: 0 },
        } as unknown as LiveState;
      },
      partialize: (s) => ({
        priceProvider: s.priceProvider,
        symbols: s.symbols,
        entries: Object.fromEntries(
          Object.entries(s.entries).filter(
            ([, entry]) => entry.status === "ok",
          ),
        ),
        manualEvidence: s.manualEvidence,
        validationRecords: s.validationRecords,
        snapshots: s.snapshots,
        scanQueue: {
          ...s.scanQueue,
          status: s.scanQueue.pending.length > 0 ? "paused" : "idle",
        },
      }),
    },
  ),
);
