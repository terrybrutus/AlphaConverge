import { MICRO_SIGNAL } from "@/lib/convergence";

export interface MicrostructureData {
  fields: {
    unusualCallActivity?: boolean;
    shortInterestPct?: number;
    darkPoolAccumulation?: boolean;
    putCallShift?: number;
    impliedVolatilityPctile?: number;
  };
  availability: Record<string, boolean>;
}

export function emptyMicroAvailability(): Record<string, boolean> {
  return {
    [MICRO_SIGNAL.unusualCall]: false,
    [MICRO_SIGNAL.shortFuel]: false,
    [MICRO_SIGNAL.darkPool]: false,
    [MICRO_SIGNAL.putCall]: false,
  };
}
