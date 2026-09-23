// HackAlem AI — Astana Innovations
// "Аким на 5 часов" — данные и правила из ТЗ.
// Формулы симуляции должны быть реализованы отдельно.

export type DistrictId = "esil" | "almaty" | "saryarka" | "baikonur" | "nura";
export type Direction = "transport" | "ecology" | "social" | "safety" | "services";
export type IndicatorId = "T1" | "T2" | "E1" | "E2" | "S1" | "S2" | "B1" | "B2" | "C1" | "C2";
export type MeasureScope = "district" | "city";

export interface DistrictData {
  id: DistrictId;
  name: string;
  populationShare: number;
  indicators: Record<IndicatorId, number>;
  profile: string;
}

export interface MeasureData {
  id: string;
  direction: Direction;
  name: string;
  scope: MeasureScope;
  cost: number;
  lag: number;
  effects: Partial<Record<IndicatorId, number>>;
}

export interface SynergyRule {
  measures: [string, string];
  appliesTo: "first-measure-district";
  effect: Partial<Record<IndicatorId, number>>;
  description: string;
}

export interface IncompatibilityRule {
  measures: [string, string];
  scope: "global" | "same-district";
  description: string;
}

export const SIMULATION_HORIZON_QUARTERS = 8;
export const INITIAL_BUDGET = 100;
export const REQUIRED_DECISIONS = 5;
export const MAX_MEASURES_PER_DIRECTION = 2;

export const INDICATOR_WEIGHTS: Record<IndicatorId, number> = {
  T1: 0.10, T2: 0.10, E1: 0.09, E2: 0.11, S1: 0.11,
  S2: 0.11, B1: 0.09, B2: 0.09, C1: 0.10, C2: 0.10,
};

export const DIRECTION_WEIGHTS: Record<Direction, number> = {
  transport: 0.20,
  ecology: 0.20,
  social: 0.22,
  safety: 0.18,
  services: 0.20,
};

export const DISTRICTS: DistrictData[] = [
  {
    id: "esil",
    name: "Есиль",
    populationShare: 0.27,
    indicators: { T1:45,T2:62,E1:68,E2:72,S1:48,S2:55,B1:78,B2:60,C1:75,C2:70 },
    profile: "Богатый, но с пробками на мостах и переполненными школами.",
  },
  {
    id: "almaty",
    name: "Алматы",
    populationShare: 0.24,
    indicators: { T1:40,T2:75,E1:50,E2:55,S1:60,S2:65,B1:62,B2:52,C1:50,C2:60 },
    profile: "Старый ЖКХ и пробки.",
  },
  {
    id: "saryarka",
    name: "Сарыарка",
    populationShare: 0.20,
    indicators: { T1:50,T2:70,E1:42,E2:40,S1:62,S2:68,B1:58,B2:55,C1:45,C2:55 },
    profile: "Смог от частного сектора, слабое озеленение.",
  },
  {
    id: "baikonur",
    name: "Байконур",
    populationShare: 0.13,
    indicators: { T1:52,T2:68,E1:55,E2:50,S1:58,S2:60,B1:52,B2:58,C1:55,C2:58 },
    profile: "Середняк без ярких перекосов.",
  },
  {
    id: "nura",
    name: "Нура",
    populationShare: 0.16,
    indicators: { T1:55,T2:40,E1:45,E2:65,S1:38,S2:35,B1:55,B2:50,C1:60,C2:50 },
    profile: "Главный аутсайдер по соцсфере и транспорту.",
  },
];

export const MEASURES: MeasureData[] = [
  { id:"M1", direction:"transport", name:"Выделенные полосы для автобусов", scope:"district", cost:18, lag:2, effects:{T1:6,T2:9} },
  { id:"M2", direction:"transport", name:"Умные светофоры (адаптивное управление)", scope:"city", cost:22, lag:2, effects:{T1:4,B2:3} },
  { id:"M3", direction:"transport", name:"Линия ЛРТ / расширение", scope:"district", cost:30, lag:4, effects:{T1:16,T2:20,E2:4} },
  { id:"M4", direction:"ecology", name:"Парк / сквер", scope:"district", cost:15, lag:2, effects:{E1:12,E2:3,B1:2} },
  { id:"M5", direction:"ecology", name:"Перевод частного сектора на чистое топливо", scope:"district", cost:25, lag:3, effects:{E2:14,C1:4} },
  { id:"M6", direction:"ecology", name:"Городская программа озеленения и ветрозащитных полос", scope:"city", cost:20, lag:4, effects:{E1:5,E2:3} },
  { id:"M7", direction:"social", name:"Школа + детсад (модульное строительство)", scope:"district", cost:24, lag:3, effects:{S1:16} },
  { id:"M8", direction:"social", name:"Центр семейного здоровья / поликлиника", scope:"district", cost:20, lag:3, effects:{S2:14} },
  { id:"M9", direction:"social", name:"Дворовые спорт-хабы", scope:"district", cost:10, lag:1, effects:{S1:3,S2:3,B1:3} },
  { id:"M10", direction:"safety", name:"Освещение и камеры (расширение Safe City)", scope:"district", cost:12, lag:1, effects:{B1:12,B2:2} },
  { id:"M11", direction:"safety", name:"Безопасные переходы и школьные зоны", scope:"district", cost:10, lag:1, effects:{B2:12,T1:-2} },
  { id:"M12", direction:"services", name:"Единая цифровая платформа обращений", scope:"city", cost:14, lag:1, effects:{C2:5} },
  { id:"M13", direction:"services", name:"Модернизация тепло- и водосетей", scope:"district", cost:28, lag:4, effects:{C1:18,E2:2} },
  { id:"M14", direction:"services", name:"Аварийные бригады ЖКХ + раннее оповещение", scope:"city", cost:16, lag:1, effects:{C1:5,C2:2} },
];

export const SYNERGIES: SynergyRule[] = [
  { measures:["M1","M2"], appliesTo:"first-measure-district", effect:{T1:2}, description:"M1 + M2: T1 +2 в районе M1." },
  { measures:["M10","M12"], appliesTo:"first-measure-district", effect:{B1:2}, description:"M10 + M12: B1 +2 в районе M10." },
  { measures:["M5","M6"], appliesTo:"first-measure-district", effect:{E2:2}, description:"M5 + M6: E2 +2 в районе M5." },
];

export const INCOMPATIBILITIES: IncompatibilityRule[] = [
  { measures:["M1","M3"], scope:"global", description:"M1 и M3 нельзя выбирать одновременно." },
  { measures:["M4","M7"], scope:"same-district", description:"M4 и M7 нельзя выбирать в одном районе." },
  { measures:["M5","M13"], scope:"same-district", description:"M5 и M13 нельзя выбирать в одном районе." },
];

export const BASELINE_EXPECTED_SCORE = 52.56;

export const REFERENCE_SCENARIO = {
  selections: [
    { measureId:"M7", districtId:"nura" as DistrictId },
    { measureId:"M8", districtId:"nura" as DistrictId },
    { measureId:"M10", districtId:"nura" as DistrictId },
    { measureId:"M12" },
    { measureId:"M5", districtId:"saryarka" as DistrictId },
  ],
  totalCost: 95,
  expectedScoreApprox: 56.5,
};

export const SCORE_RULES = {
  cityAverageWeight: 0.7,
  weakestDistrictWeight: 0.3,
  criticalPenaltyPerIndicator: 1.0,
  criticalThresholdStrictlyBelow: 40,
  formula: "Score = 0.7 * D_avg + 0.3 * min(D_d) - 1.0 * N_crit",
} as const;
