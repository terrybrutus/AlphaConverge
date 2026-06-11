import { FUND_SIGNAL } from "@/lib/convergence";
import {
  mergeFundamentals,
  revenueAcceleration,
} from "@/lib/providers/fundamentals";
import { describe, expect, it } from "vitest";

describe("fundamental provider aggregation", () => {
  it("computes change in year-over-year quarterly revenue growth", () => {
    expect(revenueAcceleration([150, 120, 110, 105, 100, 100])).toBe(30);
  });

  it("does not let an unavailable fallback erase sourced evidence", () => {
    const merged = mergeFundamentals(
      {
        fields: { insiderBuy90d: true },
        availability: { [FUND_SIGNAL.insider]: true },
      },
      {
        fields: { revenueGrowthAccel: 5 },
        availability: {
          [FUND_SIGNAL.insider]: false,
          [FUND_SIGNAL.revAccel]: true,
        },
      },
    );

    expect(merged?.availability[FUND_SIGNAL.insider]).toBe(true);
    expect(merged?.availability[FUND_SIGNAL.revAccel]).toBe(true);
  });
});
