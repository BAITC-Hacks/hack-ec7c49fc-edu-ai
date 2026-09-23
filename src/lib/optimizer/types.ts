import type {
  Direction,
  DistrictId,
  IndicatorId,
  ScenarioCandidate,
  ScenarioInput,
  SimulationResult,
} from "@/types/domain";

export type ObjectiveKind =
  | "maximize_city_score"
  | "improve_district"
  | "reduce_critical_indicators"
  | "balanced_development";

export interface StructuredObjective {
  objective: ObjectiveKind;
  districtId?: DistrictId;
  focusIndicators: IndicatorId[];
  reduceCritical: boolean;
}

export interface MeasureSearchDefinition {
  id: string;
  direction: Direction;
  scope: "city" | "district";
  cost: number;
}

export type SimulateScenario = (input: ScenarioInput) => SimulationResult;

export interface SearchResult {
  candidates: ScenarioCandidate[];
  evaluatedScenarios: number;
  validScenarios: number;
}
