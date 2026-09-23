import type { DistrictId, IndicatorDelta, ScenarioCandidate, SelectedMeasure } from "@/types/domain";
import {
  BUDGET,
  MAX_MEASURES_PER_DIRECTION,
  REQUIRED_MEASURE_COUNT,
} from "@/lib/simulation/constants";
import { DISTRICT_IDS, OPTIMIZER_MEASURES } from "./catalog";
import type {
  MeasureSearchDefinition,
  SearchResult,
  SimulateScenario,
  StructuredObjective,
} from "./types";

const SAME_DISTRICT_CONFLICTS = [
  ["M4", "M7"],
  ["M5", "M13"],
] as const;

function hasGlobalConflict(measureId: string, selectedIds: ReadonlySet<string>): boolean {
  return (
    (measureId === "M1" && selectedIds.has("M3")) ||
    (measureId === "M3" && selectedIds.has("M1"))
  );
}

function hasSameDistrictConflict(
  selection: SelectedMeasure,
  selections: readonly SelectedMeasure[],
): boolean {
  if (!selection.districtId) return false;
  return SAME_DISTRICT_CONFLICTS.some(([left, right]) => {
    const partner = selection.measureId === left ? right : selection.measureId === right ? left : null;
    return (
      partner !== null &&
      selections.some(
        (item) => item.measureId === partner && item.districtId === selection.districtId,
      )
    );
  });
}

function createMinimumRemainingCostTable(
  measures: readonly MeasureSearchDefinition[],
): number[][] {
  const table = Array.from({ length: measures.length + 1 }, () =>
    Array(REQUIRED_MEASURE_COUNT + 1).fill(Number.POSITIVE_INFINITY),
  );
  table[measures.length][0] = 0;

  for (let index = measures.length - 1; index >= 0; index -= 1) {
    table[index][0] = 0;
    for (let count = 1; count <= REQUIRED_MEASURE_COUNT; count += 1) {
      table[index][count] = Math.min(
        table[index + 1][count],
        measures[index].cost + table[index + 1][count - 1],
      );
    }
  }
  return table;
}

function districtResult(candidate: ScenarioCandidate, districtId?: DistrictId) {
  return districtId
    ? candidate.result.districts.find((district) => district.districtId === districtId)
    : undefined;
}

function focusDeltas(
  candidate: ScenarioCandidate,
  objective: StructuredObjective,
): IndicatorDelta[] {
  const districts = objective.districtId
    ? [districtResult(candidate, objective.districtId)].filter(Boolean)
    : candidate.result.districts;
  return districts.flatMap((district) =>
    district
      ? district.indicators.filter((indicator) =>
          objective.focusIndicators.includes(indicator.indicator),
        )
      : [],
  );
}

function compareNumberDescending(left: number, right: number): number {
  return right - left;
}

function compareCandidates(
  left: ScenarioCandidate,
  right: ScenarioCandidate,
  objective: StructuredObjective,
): number {
  if (objective.objective === "improve_district") {
    const leftDistrict = districtResult(left, objective.districtId);
    const rightDistrict = districtResult(right, objective.districtId);
    const comparison = compareNumberDescending(
      leftDistrict?.scoreDelta ?? Number.NEGATIVE_INFINITY,
      rightDistrict?.scoreDelta ?? Number.NEGATIVE_INFINITY,
    );
    if (comparison !== 0) return comparison;
  } else if (objective.objective === "reduce_critical_indicators") {
    const comparison = left.result.criticalAfter - right.result.criticalAfter;
    if (comparison !== 0) return comparison;
  } else if (objective.objective === "balanced_development") {
    const leftWeakest = districtResult(left, left.result.weakestDistrict)?.scoreAfter ?? 0;
    const rightWeakest = districtResult(right, right.result.weakestDistrict)?.scoreAfter ?? 0;
    const comparison = compareNumberDescending(leftWeakest, rightWeakest);
    if (comparison !== 0) return comparison;
  }

  if (objective.reduceCritical) {
    const comparison = left.result.criticalAfter - right.result.criticalAfter;
    if (comparison !== 0) return comparison;
  }

  const leftFocus = focusDeltas(left, objective).sort((a, b) => b.delta - a.delta);
  const rightFocus = focusDeltas(right, objective).sort((a, b) => b.delta - a.delta);
  for (let index = 0; index < Math.max(leftFocus.length, rightFocus.length); index += 1) {
    const comparison = compareNumberDescending(
      leftFocus[index]?.delta ?? Number.NEGATIVE_INFINITY,
      rightFocus[index]?.delta ?? Number.NEGATIVE_INFINITY,
    );
    if (comparison !== 0) return comparison;
  }

  const scoreComparison = compareNumberDescending(left.result.scoreAfter, right.result.scoreAfter);
  if (scoreComparison !== 0) return scoreComparison;
  const costComparison = left.result.cost - right.result.cost;
  if (costComparison !== 0) return costComparison;
  return selectionSignature(left.selections).localeCompare(selectionSignature(right.selections));
}

function selectionSignature(selections: readonly SelectedMeasure[]): string {
  return selections
    .map((selection) => `${selection.measureId}:${selection.districtId ?? "city"}`)
    .sort()
    .join("|");
}

function strategySignature(selections: readonly SelectedMeasure[]): string {
  return selections.map((selection) => selection.measureId).sort().join("|");
}

function reasonFor(candidate: ScenarioCandidate, objective: StructuredObjective): string {
  switch (objective.objective) {
    case "improve_district": {
      const district = districtResult(candidate, objective.districtId);
      return district
        ? `Improves ${district.districtId} by ${district.scoreDelta.toFixed(2)} points.`
        : "Improves the requested district.";
    }
    case "reduce_critical_indicators":
      return `Reduces critical indicators from ${candidate.result.criticalBefore} to ${candidate.result.criticalAfter}.`;
    case "balanced_development":
      return `Raises the weakest remaining district, ${candidate.result.weakestDistrict}.`;
    default:
      return `Achieves a city score of ${candidate.result.scoreAfter.toFixed(2)}.`;
  }
}

export function searchScenarios(
  objective: StructuredObjective,
  simulateScenario: SimulateScenario,
  measures: readonly MeasureSearchDefinition[] = OPTIMIZER_MEASURES,
): SearchResult {
  if (objective.objective === "improve_district" && !objective.districtId) {
    throw new Error("improve_district requires districtId");
  }

  let evaluatedScenarios = 0;
  let validScenarios = 0;
  const bestByStrategy = new Map<string, ScenarioCandidate>();

  for (const measure of measures) {
    if (!Number.isFinite(measure.cost) || measure.cost < 0) {
      throw new Error(`Invalid optimizer cost metadata for ${measure.id}`);
    }
  }

  const minimumRemainingCost = createMinimumRemainingCostTable(measures);
  const selectedMeasures: MeasureSearchDefinition[] = [];
  const selections: SelectedMeasure[] = [];
  const selectedIds = new Set<string>();
  const directionCounts = new Map<MeasureSearchDefinition["direction"], number>();

  function evaluateScenario(): void {
    const scenarioSelections = selections.map((selection) => ({ ...selection }));
    evaluatedScenarios += 1;
    const result = simulateScenario({ selections: scenarioSelections });
    if (!result.valid) return;
    validScenarios += 1;

    const candidate: ScenarioCandidate = { selections: scenarioSelections, result };
    const signature = strategySignature(scenarioSelections);
    const current = bestByStrategy.get(signature);
    if (!current || compareCandidates(candidate, current, objective) < 0) {
      bestByStrategy.set(signature, candidate);
    }
  }

  function targetOptions(measure: MeasureSearchDefinition): readonly (DistrictId | undefined)[] {
    if (measure.scope === "city") return [undefined];
    if (objective.objective !== "improve_district" || !objective.districtId) {
      return DISTRICT_IDS;
    }

    // improve_district ranks target scoreDelta first. District measures only affect their
    // target and have non-negative score contribution in this track, so placing a
    // non-conflicting measure elsewhere is dominated. Conflict pairs still branch fully.
    const belongsToSelectedConflict = SAME_DISTRICT_CONFLICTS.some(
      ([left, right]) =>
        (measure.id === left && selectedIds.has(right)) ||
        (measure.id === right && selectedIds.has(left)),
    );
    return belongsToSelectedConflict ? DISTRICT_IDS : [objective.districtId];
  }

  function assignTargets(index: number): void {
    if (index === selectedMeasures.length) {
      evaluateScenario();
      return;
    }

    const measure = selectedMeasures[index];
    for (const districtId of targetOptions(measure)) {
      const selection: SelectedMeasure = districtId
        ? { measureId: measure.id, districtId }
        : { measureId: measure.id };
      if (hasSameDistrictConflict(selection, selections)) continue;

      selections.push(selection);
      assignTargets(index + 1);
      selections.pop();
    }
  }

  function visitMeasures(startIndex: number, cost: number): void {
    const needed = REQUIRED_MEASURE_COUNT - selectedMeasures.length;
    if (needed === 0) {
      assignTargets(0);
      return;
    }
    if (measures.length - startIndex < needed) return;
    if (cost + minimumRemainingCost[startIndex][needed] > BUDGET) return;

    const lastStartIndex = measures.length - needed;
    for (let index = startIndex; index <= lastStartIndex; index += 1) {
      const measure = measures[index];
      if (selectedIds.has(measure.id)) continue;
      if (cost + measure.cost > BUDGET) continue;
      if ((directionCounts.get(measure.direction) ?? 0) >= MAX_MEASURES_PER_DIRECTION) continue;
      if (hasGlobalConflict(measure.id, selectedIds)) continue;

      selectedIds.add(measure.id);
      directionCounts.set(measure.direction, (directionCounts.get(measure.direction) ?? 0) + 1);
      selectedMeasures.push(measure);
      visitMeasures(index + 1, cost + measure.cost);
      selectedMeasures.pop();

      const directionCount = (directionCounts.get(measure.direction) ?? 1) - 1;
      if (directionCount === 0) directionCounts.delete(measure.direction);
      else directionCounts.set(measure.direction, directionCount);
      selectedIds.delete(measure.id);
    }
  }

  visitMeasures(0, 0);

  const candidates = [...bestByStrategy.values()]
    .sort((left, right) => compareCandidates(left, right, objective))
    .slice(0, 3)
    .map((candidate) => ({
      ...candidate,
      reason: reasonFor(candidate, objective),
    }));

  return { candidates, evaluatedScenarios, validScenarios };
}
