import { FUND_SIGNAL, SENT_SIGNAL } from "@/lib/convergence";
import { fetchFundamentals, fetchSentiment } from "@/lib/providers/finnhub";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Finnhub evidence independence", () => {
  it("does not duplicate recommendation trend into fundamentals", async () => {
    const fetchMock = vi.fn(async (_input: string) => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFundamentals("TEST", "key");

    expect(result.availability[FUND_SIGNAL.estRev]).toBe(false);
    expect(result.availability[FUND_SIGNAL.revAccel]).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "insider-transactions",
    );
  });

  it("does not fetch analyst recommendations as independent sentiment", async () => {
    const fetchMock = vi.fn(async (_input: string) => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          headline: "Company wins contract",
          datetime: Math.floor(Date.now() / 1000),
        },
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSentiment("TEST", "key");

    expect(result.availability[SENT_SIGNAL.news]).toBe(true);
    expect(result.availability[SENT_SIGNAL.reddit]).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("company-news");
  });
});
