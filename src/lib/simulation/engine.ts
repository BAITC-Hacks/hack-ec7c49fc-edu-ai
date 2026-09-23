import { DISTRICTS, DISTRICT_ORDER } from "../../data/districts";
import { INDICATOR_ORDER } from "../../data/indicators";
import { MEASURES_BY_ID, MEASURE_ORDER } from "../../data/measures";
import { BUDGET, SIMULATION_HORIZON } from "./constants";
import {
  calculateCityAverage,
  calculateDistrictScores,
  calculateFinalScore,
  countCriticalIndicators,
  findWeakestDistrict,
} from "./score";
import type {
  BaselineResult,
  DistrictId,
  IndicatorState,
  IndicatorValues,
  ScenarioInput,
  SelectedMeasure,
  SimulationResult,
} from "./types";
import { calculateScenarioCost, validateScenario } from "./validator";

export function createBaselineState(): IndicatorState {
  return Object.fromEntries(
    DISTRICTS.map((district) => [district.id, { ...district.indicators }]),
  ) as IndicatorState;
}

export function createZeroState(): IndicatorState {
  return Object.fromEntries(
    DISTRICT_ORDER.map((districtId) => [
      districtId,
      Object.fromEntries(INDICATOR_ORDER.map((indicator) => [indicator, 0])),
    ]),
  ) as IndicatorState;
}

export function applyMeasures(
  deltas: IndicatorState,
  selections: readonly SelectedMeasure[],
): IndicatorState {
  const result = cloneState(deltas);
  const selectionByMeasure = new Map(
    selections.map((selection) => [selection.measureId, selection]),
  );

  for (const measureId of MEASURE_ORDER) {
    const selection = selectionByMeasure.get(measureId);
    const measure = MEASURES_BY_ID.get(measureId);
    if (selection === undefined || measure === undefined) {
      continue;
    }

    const factor = (SIMULATION_HORIZON - measure.lag) / SIMULATION_HORIZON;
    const targetDistricts =
      measure.scope === "city"
        ? DISTRICT_ORDER
        : ([selection.districtId] as readonly DistrictId[]);

    for (const districtId of targetDistricts) {
      for (const indicator of INDICATOR_ORDER) {
        const fullEffect = measure.effects[indicator];
        if (fullEffect !== undefined) {
          result[districtId][indicator] += fullEffect * factor;
        }
      }
    }
  }

  return result;
}

export function applySynergies(
  deltas: IndicatorState,
  selections: readonly SelectedMeasure[],
): IndicatorState {
  const result = cloneState(deltas);
  const selectionByMeasure = new Map(
    selections.map((selection) => [selection.measureId, selection]),
  );

  addSynergy(result, selectionByMeasure, "M1", "M2", "T1", 2);
  addSynergy(result, selectionByMeasure, "M10", "M12", "B1", 2);
  addSynergy(result, selectionByMeasure, "M5", "M6", "E2", 2);

  return result;
}

function addSynergy(
  deltas: IndicatorState,
  selections: ReadonlyMap<string, SelectedMeasure>,
  districtMeasureId: string,
  partnerMeasureId: string,
  indicator: keyof IndicatorValues,
  bonus: number,
): void {
  const districtMeasure = selections.get(districtMeasureId);
  if (
    districtMeasure?.districtId !== undefined &&
    selections.has(partnerMeasureId)
  ) {
    deltas[districtMeasure.districtId][indicator] += bonus;
  }
}

export function applyIndicatorDeltas(
  initialState: IndicatorState,
  deltas: IndicatorState,
): IndicatorState {
  const result = cloneState(initialState);
  for (const districtId of DISTRICT_ORDER) {
    for (const indicator of INDICATOR_ORDER) {
      const value = initialState[districtId][indicator] + deltas[districtId][indicator];
      result[districtId][indicator] = Math.min(100, Math.max(0, value));
    }
  }
  return result;
}

export function getBaseline(): BaselineResult {
  const state = createBaselineState();
  const districtScores = calculateDistrictScores(state);
  const cityAverage = calculateCityAverage(districtScores);
  const weakestDistrict = findWeakestDistrict(districtScores);
  const criticalCount = countCriticalIndicators(state);
  const score = calculateFinalScore(
    cityAverage,
    districtScores[weakestDistrict],
    criticalCount,
  );

  return {
    score,
    cityAverage,
    criticalCount,
    weakestDistrict,
    districts: DISTRICT_ORDER.map((districtId) => ({
      districtId,
      score: districtScores[districtId],
      indicators: { ...state[districtId] },
    })),
  };
}

export function simulateScenario(input: ScenarioInput): SimulationResult {
  const baseline = getBaseline();
  const validation = validateScenario(input);
  const cost = calculateScenarioCost(input);

  if (!validation.valid) {
    return {
      valid: false,
      validationErrors: validation.errors,
      cost,
      remainingBudget: cost === null ? null : BUDGET - cost,
      scoreBefore: baseline.score,
      scoreAfter: null,
      scoreDelta: null,
      weakestDistrict: null,
      criticalBefore: baseline.criticalCount,
      criticalAfter: null,
      districts: [],
    };
  }

  const initialState = createBaselineState();
  const measureDeltas = applyMeasures(createZeroState(), input.selections);
  const totalDeltas = applySynergies(measureDeltas, input.selections);
  const finalState = applyIndicatorDeltas(initialState, totalDeltas);
  const scoresBefore = calculateDistrictScores(initialState);
  const scoresAfter = calculateDistrictScores(finalState);
  const cityAverageAfter = calculateCityAverage(scoresAfter);
  const weakestDistrict = findWeakestDistrict(scoresAfter);
  const criticalAfter = countCriticalIndicators(finalState);
  const scoreAfter = calculateFinalScore(
    cityAverageAfter,
    scoresAfter[weakestDistrict],
    criticalAfter,
  );

  return {
    valid: true,
    validationErrors: [],
    cost: cost as number,
    remainingBudget: BUDGET - (cost as number),
    scoreBefore: baseline.score,
    scoreAfter,
    scoreDelta: scoreAfter - baseline.score,
    weakestDistrict,
    criticalBefore: baseline.criticalCount,
    criticalAfter,
    districts: DISTRICT_ORDER.map((districtId) => ({
      districtId,
      scoreBefore: scoresBefore[districtId],
      scoreAfter: scoresAfter[districtId],
      scoreDelta: scoresAfter[districtId] - scoresBefore[districtId],
      indicators: INDICATOR_ORDER.map((indicator) => ({
        indicator,
        before: initialState[districtId][indicator],
        after: finalState[districtId][indicator],
        delta: finalState[districtId][indicator] - initialState[districtId][indicator],
      })),
    })),
  };
}

function cloneState(state: IndicatorState): IndicatorState {
  return Object.fromEntries(
    DISTRICT_ORDER.map((districtId) => [districtId, { ...state[districtId] }]),
  ) as IndicatorState;
}
