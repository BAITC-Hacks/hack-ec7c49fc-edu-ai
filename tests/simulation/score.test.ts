import { describe, expect, it } from "vitest";

import {
  calculateDistrictScore,
  calculateFinalScore,
  countCriticalIndicators,
  createZeroState,
  getBaseline,
} from "../../src/lib/simulation";

describe("score calculation", () => {
  it("calculates the documented district and city baseline", () => {
    const baseline = getBaseline();
    const scores = Object.fromEntries(
      baseline.districts.map((district) => [district.districtId, district.score]),
    );

    expect(scores.esil).toBeCloseTo(62.99, 10);
    expect(scores.almaty).toBeCloseTo(57.06, 10);
    expect(scores.saryarka).toBeCloseTo(54.65, 10);
    expect(scores.baikonur).toBeCloseTo(56.63, 10);
    expect(scores.nura).toBeCloseTo(49.18, 10);
    expect(baseline.cityAverage).toBeCloseTo(56.8624, 10);
    expect(baseline.criticalCount).toBe(2);
    expect(baseline.weakestDistrict).toBe("nura");
    expect(baseline.score).toBeCloseTo(52.55768, 10);
  });

  it("uses all indicator weights rather than a stored district score", () => {
    expect(
      calculateDistrictScore({
        T1: 45,
        T2: 62,
        E1: 68,
        E2: 72,
        S1: 48,
        S2: 55,
        B1: 78,
        B2: 60,
        C1: 75,
        C2: 70,
      }),
    ).toBeCloseTo(62.99, 10);
  });

  it("treats 39.999 as critical and exactly 40 as non-critical", () => {
    const state = createZeroState();
    for (const district of Object.values(state)) {
      for (const indicator of Object.keys(district) as Array<keyof typeof district>) {
        district[indicator] = 40;
      }
    }
    state.esil.T1 = 39.999;

    expect(countCriticalIndicators(state)).toBe(1);
  });

  it("does not clip the final score", () => {
    expect(calculateFinalScore(0, 0, 2)).toBe(-2);
    expect(calculateFinalScore(100, 100, 0)).toBe(100);
  });
});
