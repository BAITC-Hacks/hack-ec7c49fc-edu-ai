import { describe, expect, it } from "vitest";

import {
  DISTRICTS,
  INDICATOR_ORDER,
  INDICATOR_WEIGHTS,
  MEASURES,
} from "../../src/lib/simulation";

describe("simulation data", () => {
  it("contains five districts, fourteen unique measures and ten indicators", () => {
    expect(DISTRICTS).toHaveLength(5);
    expect(MEASURES).toHaveLength(14);
    expect(new Set(MEASURES.map((measure) => measure.id)).size).toBe(14);
    expect(INDICATOR_ORDER).toHaveLength(10);
    for (const district of DISTRICTS) {
      expect(Object.keys(district.indicators)).toHaveLength(10);
    }
  });

  it("uses normalized weights and population shares", () => {
    const weightSum = INDICATOR_ORDER.reduce(
      (sum, indicator) => sum + INDICATOR_WEIGHTS[indicator],
      0,
    );
    const populationSum = DISTRICTS.reduce(
      (sum, district) => sum + district.populationShare,
      0,
    );

    expect(weightSum).toBeCloseTo(1, 12);
    expect(populationSum).toBeCloseTo(1, 12);
  });

  it("keeps every baseline indicator in the 0-100 range", () => {
    for (const district of DISTRICTS) {
      for (const value of Object.values(district.indicators)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});
