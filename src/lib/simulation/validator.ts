import { DISTRICT_ORDER } from "../../data/districts";
import { MEASURES_BY_ID } from "../../data/measures";
import {
  BUDGET,
  MAX_MEASURES_PER_DIRECTION,
  REQUIRED_MEASURE_COUNT,
} from "./constants";
import type {
  Direction,
  ScenarioInput,
  SelectedMeasure,
  ValidationResult,
} from "./types";

interface RuntimeSelection {
  measureId?: unknown;
  districtId?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSelections(input: unknown): unknown[] | null {
  if (!isRecord(input) || !Array.isArray(input.selections)) {
    return null;
  }

  return input.selections;
}

function getRuntimeSelection(value: unknown): RuntimeSelection | null {
  return isRecord(value) ? value : null;
}

function isKnownDistrict(value: unknown): boolean {
  return typeof value === "string" && DISTRICT_ORDER.includes(value as never);
}

export function calculateScenarioCost(input: unknown): number | null {
  const selections = getSelections(input);
  if (selections === null) {
    return null;
  }

  let cost = 0;
  for (const rawSelection of selections) {
    const selection = getRuntimeSelection(rawSelection);
    if (selection === null || typeof selection.measureId !== "string") {
      return null;
    }

    const measure = MEASURES_BY_ID.get(selection.measureId);
    if (measure === undefined) {
      return null;
    }

    cost += measure.cost;
  }

  return cost;
}

export function validateScenario(input: unknown): ValidationResult {
  const errors: string[] = [];
  const selections = getSelections(input);

  if (selections === null) {
    return {
      valid: false,
      errors: ["Поле selections должно быть массивом."],
    };
  }

  if (selections.length !== REQUIRED_MEASURE_COUNT) {
    errors.push(`Необходимо выбрать ровно ${REQUIRED_MEASURE_COUNT} мер.`);
  }

  const knownSelections: Array<{
    index: number;
    measureId: string;
    districtId: unknown;
  }> = [];

  for (const [index, rawSelection] of selections.entries()) {
    const selection = getRuntimeSelection(rawSelection);
    if (selection === null) {
      errors.push(`Решение ${index + 1} должно быть объектом.`);
      continue;
    }

    if (typeof selection.measureId !== "string" || selection.measureId.length === 0) {
      errors.push(`У решения ${index + 1} нет корректного measureId.`);
      continue;
    }

    const measure = MEASURES_BY_ID.get(selection.measureId);
    if (measure === undefined) {
      errors.push(`Неизвестная мера: ${selection.measureId}.`);
      continue;
    }

    knownSelections.push({
      index,
      measureId: selection.measureId,
      districtId: selection.districtId,
    });

    if (measure.scope === "district" && !isKnownDistrict(selection.districtId)) {
      errors.push(`Для меры ${measure.id} нужно указать существующий район.`);
    }

    if (measure.scope === "city" && selection.districtId !== undefined) {
      errors.push(`Для городской меры ${measure.id} район указывать нельзя.`);
    }
  }

  const measureCounts = new Map<string, number>();
  for (const selection of knownSelections) {
    measureCounts.set(selection.measureId, (measureCounts.get(selection.measureId) ?? 0) + 1);
  }

  for (const [measureId, count] of measureCounts) {
    if (count > 1) {
      errors.push(`Мера ${measureId} выбрана более одного раза.`);
    }
  }

  const directionCounts = new Map<Direction, number>();
  for (const selection of knownSelections) {
    const direction = MEASURES_BY_ID.get(selection.measureId)?.direction;
    if (direction !== undefined) {
      directionCounts.set(direction, (directionCounts.get(direction) ?? 0) + 1);
    }
  }

  const directionOrder: readonly Direction[] = [
    "transport",
    "ecology",
    "social",
    "safety",
    "services",
  ];
  for (const direction of directionOrder) {
    if ((directionCounts.get(direction) ?? 0) > MAX_MEASURES_PER_DIRECTION) {
      errors.push(`Нельзя выбирать более ${MAX_MEASURES_PER_DIRECTION} мер направления ${direction}.`);
    }
  }

  const cost = calculateScenarioCost(input);
  if (cost !== null && cost > BUDGET) {
    errors.push(`Бюджет превышен на ${cost - BUDGET}.`);
  }

  const selectedIds = new Set(knownSelections.map((selection) => selection.measureId));
  if (selectedIds.has("M1") && selectedIds.has("M3")) {
    errors.push("Меры M1 и M3 несовместимы.");
  }

  addSameDistrictConflict(errors, knownSelections, "M4", "M7");
  addSameDistrictConflict(errors, knownSelections, "M5", "M13");

  return { valid: errors.length === 0, errors };
}

function addSameDistrictConflict(
  errors: string[],
  selections: readonly { measureId: string; districtId: unknown }[],
  firstMeasureId: string,
  secondMeasureId: string,
): void {
  const first = selections.find((selection) => selection.measureId === firstMeasureId);
  const second = selections.find((selection) => selection.measureId === secondMeasureId);

  if (
    first !== undefined &&
    second !== undefined &&
    typeof first.districtId === "string" &&
    first.districtId === second.districtId
  ) {
    errors.push(
      `Меры ${firstMeasureId} и ${secondMeasureId} нельзя выбирать в одном районе.`,
    );
  }
}

export function assertScenarioInput(input: unknown): asserts input is ScenarioInput {
  const validation = validateScenario(input);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }
}

export function isSelectedMeasure(value: unknown): value is SelectedMeasure {
  if (!isRecord(value) || typeof value.measureId !== "string") {
    return false;
  }
  return value.districtId === undefined || isKnownDistrict(value.districtId);
}
