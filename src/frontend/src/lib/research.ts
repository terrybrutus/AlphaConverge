import { FUND_SIGNAL, MICRO_SIGNAL, SENT_SIGNAL } from "@/lib/convergence";
import type { TickerRaw } from "@/types/ticker";

export type EvidenceVerdict = "confirmed" | "contradicted";

export interface ManualSignalEvidence {
  verdict: EvidenceVerdict;
  source: string;
  observedAt: string;
  note?: string;
}

export interface ManualEvidence {
  signals: Record<string, ManualSignalEvidence>;
}

export const RESEARCH_SIGNALS = [
  FUND_SIGNAL.revAccel,
  FUND_SIGNAL.estRev,
  FUND_SIGNAL.peHist,
  FUND_SIGNAL.psSector,
  FUND_SIGNAL.insider,
  FUND_SIGNAL.inst,
  MICRO_SIGNAL.unusualCall,
  MICRO_SIGNAL.shortFuel,
  MICRO_SIGNAL.darkPool,
  MICRO_SIGNAL.putCall,
  SENT_SIGNAL.reddit,
  SENT_SIGNAL.news,
  SENT_SIGNAL.trends,
] as const;

const FINVIZ_NOISE = new Set([
  "NO",
  "TICKER",
  "COMPANY",
  "SECTOR",
  "INDUSTRY",
  "COUNTRY",
  "MARKET",
  "CAP",
  "PRICE",
  "CHANGE",
  "VOLUME",
]);

function validSymbol(value: string): boolean {
  return /^[A-Z][A-Z0-9.-]{0,5}$/.test(value) && !FINVIZ_NOISE.has(value);
}

export function parseTickerImport(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const header = lines[0].split(/\t| {2,}/).map((cell) => cell.trim());
  const tickerIndex = header.findIndex(
    (cell) => cell.toUpperCase() === "TICKER",
  );
  if (tickerIndex >= 0) {
    return Array.from(
      new Set(
        lines
          .slice(1)
          .map((line) => line.split(/\t| {2,}/)[tickerIndex]?.toUpperCase())
          .filter(
            (symbol): symbol is string => !!symbol && validSymbol(symbol),
          ),
      ),
    );
  }

  return Array.from(
    new Set(
      text
        .toUpperCase()
        .split(/[\s,;]+/)
        .map((token) => token.trim())
        .filter(validSymbol),
    ),
  );
}

function setSignalValue(ticker: TickerRaw, name: string, fired: boolean) {
  switch (name) {
    case FUND_SIGNAL.revAccel:
      ticker.revenueGrowthAccel = fired ? 1 : -1;
      break;
    case FUND_SIGNAL.estRev:
      ticker.estimateRevision = fired ? 0.2 : -0.2;
      break;
    case FUND_SIGNAL.peHist:
      ticker.peVs5yrAvg = fired ? 0.9 : 1.1;
      break;
    case FUND_SIGNAL.psSector:
      ticker.psVsSector = fired ? 0.9 : 1.1;
      break;
    case FUND_SIGNAL.insider:
      ticker.insiderBuy90d = fired;
      break;
    case FUND_SIGNAL.inst:
      ticker.instOwnershipChange = fired ? 1 : -1;
      break;
    case MICRO_SIGNAL.unusualCall:
      ticker.unusualCallActivity = fired;
      break;
    case MICRO_SIGNAL.shortFuel:
      ticker.shortInterestPct = fired ? 20 : 0;
      break;
    case MICRO_SIGNAL.darkPool:
      ticker.darkPoolAccumulation = fired;
      break;
    case MICRO_SIGNAL.putCall:
      ticker.putCallShift = fired ? -0.3 : 0;
      break;
    case SENT_SIGNAL.reddit:
      ticker.redditMentionVelocity = fired ? 1.5 : 0;
      break;
    case SENT_SIGNAL.news:
      ticker.newsSentiment = fired ? 0.3 : 0;
      break;
    case SENT_SIGNAL.trends:
      ticker.googleTrendsSlope = fired ? 0.3 : 0;
      break;
  }
}

export function applyManualEvidence(
  raw: TickerRaw,
  evidence?: ManualEvidence,
): TickerRaw {
  if (!evidence || Object.keys(evidence.signals).length === 0) return raw;
  const ticker: TickerRaw = {
    ...raw,
    availability: { ...raw.availability },
    signalAvailability: { ...raw.signalAvailability },
  };

  for (const [name, fact] of Object.entries(evidence.signals)) {
    ticker.signalAvailability![name] = true;
    setSignalValue(ticker, name, fact.verdict === "confirmed");
  }

  const names = Object.keys(evidence.signals);
  ticker.availability!.fundamental =
    !!ticker.availability?.fundamental ||
    names.some((name) => Object.values(FUND_SIGNAL).includes(name as never));
  ticker.availability!.microstructure =
    !!ticker.availability?.microstructure ||
    names.some((name) => Object.values(MICRO_SIGNAL).includes(name as never));
  ticker.availability!.sentiment =
    !!ticker.availability?.sentiment ||
    names.some((name) => Object.values(SENT_SIGNAL).includes(name as never));
  ticker.source = `${raw.source ?? "Live"} + manual research`;
  return ticker;
}

export interface ValidationRecord {
  id: string;
  symbol: string;
  capturedAt: number;
  entryPrice: number;
  convergenceScore: number;
  categoriesAligned: number;
  surfaced: boolean;
  dataCoverage: number;
  manualSignalCount: number;
  latestPrice: number;
  latestAt: number;
}

export function maturedDays(record: ValidationRecord): number {
  return Math.floor((record.latestAt - record.capturedAt) / 86_400_000);
}

export function recordReturn(record: ValidationRecord): number {
  return (record.latestPrice - record.entryPrice) / record.entryPrice;
}
