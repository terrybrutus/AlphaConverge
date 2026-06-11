import {
  auditFamilies,
  maximumObservableScore,
  surfacedBlocker,
} from "@/lib/evidenceAudit";
import type { Play } from "@/types/ticker";
import { describe, expect, it } from "vitest";

function play(): Play {
  return {
    symbol: "TEST",
    name: "Test",
    sector: "Technology",
    price: 10,
    priceHistory: [9, 10],
    convergenceScore: 26,
    categoriesAligned: 1,
    categories: [
      {
        key: "technical",
        label: "Technical structure",
        score: 80,
        coverage: 100,
        aligned: true,
        available: true,
        signals: [
          { name: "A", detail: "", weight: 0.5, fired: true },
          { name: "B", detail: "", weight: 0.5, fired: false },
        ],
      },
      {
        key: "fundamental",
        label: "Fundamental inflection",
        score: 0,
        coverage: 18,
        aligned: false,
        available: true,
        signals: [
          { name: "C", detail: "", weight: 0.18, fired: false },
          {
            name: "D",
            detail: "",
            weight: 0.82,
            fired: false,
            available: false,
          },
        ],
      },
      {
        key: "microstructure",
        label: "Market microstructure",
        score: 0,
        coverage: 0,
        aligned: false,
        available: false,
        signals: [],
      },
      {
        key: "sentiment",
        label: "Sentiment",
        score: 0,
        coverage: 75,
        aligned: false,
        available: true,
        signals: [
          { name: "E", detail: "", weight: 0.75, fired: false },
          {
            name: "F",
            detail: "",
            weight: 0.25,
            fired: false,
            available: false,
          },
        ],
      },
      {
        key: "macro",
        label: "Macro",
        score: 100,
        coverage: 100,
        aligned: true,
        available: true,
        signals: [],
      },
    ],
    stage: "earlyTrend",
    instrument: "pass",
    instrumentRationale: "",
    thesis: "",
    fatigueWarning: null,
    surfaced: false,
    sample: false,
    categoriesWithData: 4,
    dataCoverage: 49,
  };
}

describe("evidence acquisition audit", () => {
  it("reports the maximum score observable from independent-family coverage", () => {
    expect(maximumObservableScore(play())).toBe(49);
  });

  it("separates sourced negatives from missing evidence", () => {
    const families = auditFamilies(play());
    expect(
      families.find((family) => family.key === "fundamental"),
    ).toMatchObject({
      positive: 0,
      negative: 1,
      missing: 1,
    });
  });

  it("names insufficient observability as the surfaced blocker", () => {
    expect(surfacedBlocker(play())).toContain("not measurable enough");
  });
});
