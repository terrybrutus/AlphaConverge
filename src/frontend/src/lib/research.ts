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

export interface ImportPreview {
  symbols: string[];
  duplicates: string[];
  rejected: string[];
  mode: "table" | "list";
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
  return analyzeTickerImport(text).symbols;
}

export function analyzeTickerImport(text: string): ImportPreview {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0)
    return { symbols: [], duplicates: [], rejected: [], mode: "list" };

  const header = lines[0].split(/\t| {2,}/).map((cell) => cell.trim());
  const tickerIndex = header.findIndex(
    (cell) => cell.toUpperCase() === "TICKER",
  );
  if (tickerIndex >= 0) {
    const values = lines
      .slice(1)
      .map((line) => line.split(/\t| {2,}/)[tickerIndex]?.toUpperCase())
      .filter((symbol): symbol is string => !!symbol);
    return classifyImport(values, "table");
  }

  return classifyImport(
    text
      .toUpperCase()
      .split(/[\s,;]+/)
      .map((token) => token.trim())
      .filter(Boolean),
    "list",
  );
}

function classifyImport(
  values: string[],
  mode: ImportPreview["mode"],
): ImportPreview {
  const symbols: string[] = [];
  const duplicates: string[] = [];
  const rejected: string[] = [];
  for (const value of values) {
    if (!validSymbol(value)) {
      rejected.push(value);
    } else if (symbols.includes(value)) {
      duplicates.push(value);
    } else {
      symbols.push(value);
    }
  }
  return { symbols, duplicates, rejected, mode };
}

const FRESHNESS_DAYS: Record<string, number> = {
  [MICRO_SIGNAL.unusualCall]: 7,
  [MICRO_SIGNAL.darkPool]: 14,
  [MICRO_SIGNAL.putCall]: 14,
  [SENT_SIGNAL.reddit]: 7,
  [SENT_SIGNAL.news]: 14,
  [SENT_SIGNAL.trends]: 14,
  [MICRO_SIGNAL.shortFuel]: 30,
  [FUND_SIGNAL.estRev]: 45,
  [FUND_SIGNAL.insider]: 120,
  [FUND_SIGNAL.inst]: 120,
};

export function evidenceFreshnessDays(signal: string): number {
  return FRESHNESS_DAYS[signal] ?? 90;
}

export function evidenceIsFresh(
  signal: string,
  evidence: ManualSignalEvidence,
  now = Date.now(),
): boolean {
  const observed = new Date(`${evidence.observedAt}T00:00:00`).getTime();
  return now - observed <= evidenceFreshnessDays(signal) * 86_400_000;
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
    if (!evidenceIsFresh(name, fact)) continue;
    ticker.signalAvailability![name] = true;
    setSignalValue(ticker, name, fact.verdict === "confirmed");
  }

  const names = Object.entries(evidence.signals)
    .filter(([name, fact]) => evidenceIsFresh(name, fact))
    .map(([name]) => name);
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
