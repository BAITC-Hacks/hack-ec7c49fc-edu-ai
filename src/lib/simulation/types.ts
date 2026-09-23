export type DistrictId =
  | "esil"
  | "almaty"
  | "saryarka"
  | "baikonur"
  | "nura";

export type Direction =
  | "transport"
  | "ecology"
  | "social"
  | "safety"
  | "services";

export type IndicatorId =
  | "T1"
  | "T2"
  | "E1"
  | "E2"
  | "S1"
  | "S2"
  | "B1"
  | "B2"
  | "C1"
  | "C2";

export type Scope = "district" | "city";

export interface SelectedMeasure {
  measureId: string;
  districtId?: DistrictId;
}

export interface ScenarioInput {
  selections: SelectedMeasure[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type IndicatorValues = Record<IndicatorId, number>;
export type IndicatorState = Record<DistrictId, IndicatorValues>;

export interface DistrictDefinition {
  id: DistrictId;
  name: string;
  populationShare: number;
  indicators: IndicatorValues;
}

export interface MeasureDefinition {
  id: string;
  name: string;
  direction: Direction;
  scope: Scope;
  cost: number;
  lag: number;
  effects: Partial<Record<IndicatorId, number>>;
}

export interface IndicatorDelta {
  indicator: IndicatorId;
  before: number;
  after: number;
  delta: number;
}

export interface DistrictResult {
  districtId: DistrictId;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  indicators: IndicatorDelta[];
}

export interface BaselineDistrictResult {
  districtId: DistrictId;
  score: number;
  indicators: IndicatorValues;
}

export interface BaselineResult {
  score: number;
  cityAverage: number;
  criticalCount: number;
  weakestDistrict: DistrictId;
  districts: BaselineDistrictResult[];
}

export interface ValidSimulationResult {
  valid: true;
  validationErrors: [];
  cost: number;
  remainingBudget: number;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  weakestDistrict: DistrictId;
  criticalBefore: number;
  criticalAfter: number;
  districts: DistrictResult[];
}

export interface InvalidSimulationResult {
  valid: false;
  validationErrors: string[];
  cost: number | null;
  remainingBudget: number | null;
  scoreBefore: number;
  scoreAfter: null;
  scoreDelta: null;
  weakestDistrict: null;
  criticalBefore: number;
  criticalAfter: null;
  districts: [];
}

export type SimulationResult = ValidSimulationResult | InvalidSimulationResult;
