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

export interface SelectedMeasure {
  measureId: string;
  districtId?: DistrictId;
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

export interface ScenarioInput {
  selections: SelectedMeasure[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SimulationResult {
  valid: boolean;
  validationErrors: string[];
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

export interface ScenarioCandidate {
  selections: SelectedMeasure[];
  result: SimulationResult;
  reason?: string;
}
