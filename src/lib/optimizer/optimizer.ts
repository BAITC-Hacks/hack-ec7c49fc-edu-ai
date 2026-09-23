import type {
  Direction,
  DistrictId,
  IndicatorDelta,
  ScenarioCandidate,
  SelectedMeasure,
} from "@/types/domain";
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

function hasGlobalConflict(measures: readonly MeasureSearchDefinition[]): boolean {
  const ids = new Set(measures.map((measure) => measure.id));
  return ids.has("M1") && ids.has("M3");
}

function respectsDirectionLimit(measures: readonly MeasureSearchDefinition[]): boolean {
  const counts = new Map<Direction, number>();
  for (const measure of measures) {
    const count = (counts.get(measure.direction) ?? 0) + 1;
    if (count > 2) return false;
    counts.set(measure.direction, count);
  }
  return true;
}

function hasSameDistrictConflict(selections: readonly SelectedMeasure[]): boolean {
  return SAME_DISTRICT_CONFLICTS.some(([left, right]) =>
    DISTRICT_IDS.some(
      (districtId) =>
        selections.some((item) => item.measureId === left && item.districtId === districtId) &&
        selections.some((item) => item.measureId === right && item.districtId === districtId),
    ),
  );
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  const output: T[][] = [];
  const selected: T[] = [];

  function visit(start: number): void {
    if (selected.length === size) {
      output.push([...selected]);
      return;
    }
    for (let index = start; index <= items.length - (size - selected.length); index += 1) {
      selected.push(items[index]);
      visit(index + 1);
      selected.pop();
    }
  }

  visit(0);
  return output;
}

function selectionVariants(measures: readonly MeasureSearchDefinition[]): SelectedMeasure[][] {
  let variants: SelectedMeasure[][] = [[]];
  for (const measure of measures) {
    const targets: SelectedMeasure[] =
      measure.scope === "city"
        ? [{ measureId: measure.id }]
        : DISTRICT_IDS.map((districtId) => ({ measureId: measure.id, districtId }));
    variants = variants.flatMap((partial) =>
      targets.map((target) => [...partial, target]),
    );
  }
  return variants;
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

  for (const measureSet of combinations(measures, 5)) {
    if (!respectsDirectionLimit(measureSet) || hasGlobalConflict(measureSet)) continue;

    for (const selections of selectionVariants(measureSet)) {
      if (hasSameDistrictConflict(selections)) continue;
      evaluatedScenarios += 1;
      const result = simulateScenario({ selections });
      if (!result.valid) continue;
      validScenarios += 1;

      const candidate: ScenarioCandidate = { selections, result };
      const signature = strategySignature(selections);
      const current = bestByStrategy.get(signature);
      if (!current || compareCandidates(candidate, current, objective) < 0) {
        bestByStrategy.set(signature, candidate);
      }
    }
  }

  const candidates = [...bestByStrategy.values()]
    .sort((left, right) => compareCandidates(left, right, objective))
    .slice(0, 3)
    .map((candidate) => ({
      ...candidate,
      reason: reasonFor(candidate, objective),
    }));

  return { candidates, evaluatedScenarios, validScenarios };
}
