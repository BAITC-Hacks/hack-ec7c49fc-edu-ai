import { DISTRICTS, DISTRICT_ORDER } from "../../data/districts";
import { INDICATOR_ORDER, INDICATOR_WEIGHTS } from "../../data/indicators";
import { CRITICAL_THRESHOLD } from "./constants";
import type {
  DistrictId,
  IndicatorState,
  IndicatorValues,
} from "./types";

export function calculateDistrictScore(indicators: IndicatorValues): number {
  return INDICATOR_ORDER.reduce(
    (score, indicator) => score + indicators[indicator] * INDICATOR_WEIGHTS[indicator],
    0,
  );
}

export function calculateDistrictScores(
  state: IndicatorState,
): Record<DistrictId, number> {
  return Object.fromEntries(
    DISTRICT_ORDER.map((districtId) => [
      districtId,
      calculateDistrictScore(state[districtId]),
    ]),
  ) as Record<DistrictId, number>;
}

export function calculateCityAverage(
  districtScores: Readonly<Record<DistrictId, number>>,
): number {
  return DISTRICTS.reduce(
    (average, district) =>
      average + district.populationShare * districtScores[district.id],
    0,
  );
}

export function findWeakestDistrict(
  districtScores: Readonly<Record<DistrictId, number>>,
): DistrictId {
  let weakest = DISTRICT_ORDER[0];
  for (const districtId of DISTRICT_ORDER.slice(1)) {
    if (districtScores[districtId] < districtScores[weakest]) {
      weakest = districtId;
    }
  }
  return weakest;
}

export function countCriticalIndicators(state: IndicatorState): number {
  let count = 0;
  for (const districtId of DISTRICT_ORDER) {
    for (const indicator of INDICATOR_ORDER) {
      if (state[districtId][indicator] < CRITICAL_THRESHOLD) {
        count += 1;
      }
    }
  }
  return count;
}

export function calculateFinalScore(
  cityAverage: number,
  minimumDistrictScore: number,
  criticalCount: number,
): number {
  return 0.7 * cityAverage + 0.3 * minimumDistrictScore - criticalCount;
}
