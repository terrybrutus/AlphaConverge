import { useLiveStore } from "@/lib/liveStore";
import { beforeEach, describe, expect, it } from "vitest";

describe("user session isolation", () => {
  beforeEach(() => {
    useLiveStore.getState().clearUserSession();
  });

  it("replaces rather than merges an identity's watchlist", () => {
    useLiveStore.getState().replaceSymbols(["OLD"]);
    useLiveStore.getState().replaceSymbols(["new", "NEW", ""]);

    expect(useLiveStore.getState().symbols).toEqual(["NEW"]);
  });

  it("clears in-memory credentials and user data on identity changes", () => {
    const store = useLiveStore.getState();
    store.setApiKey("price-secret");
    store.setFinnhubKey("finnhub-secret");
    store.setAiKey("ai-secret");
    store.replaceSymbols(["AAPL"]);

    useLiveStore.getState().clearUserSession();

    const cleared = useLiveStore.getState();
    expect(cleared.apiKey).toBe("");
    expect(cleared.finnhubKey).toBe("");
    expect(cleared.aiKey).toBe("");
    expect(cleared.symbols).toEqual([]);
  });
});
