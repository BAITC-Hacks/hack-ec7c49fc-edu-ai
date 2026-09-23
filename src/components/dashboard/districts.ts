import type { DistrictId, IndicatorId } from "@/types/domain";

export const indicators: { id: IndicatorId; label: string }[] = [
  { id: "T1", label: "Разгрузка дорог" },
  { id: "T2", label: "Общественный транспорт" },
  { id: "E1", label: "Озеленение" },
  { id: "E2", label: "Качество воздуха" },
  { id: "S1", label: "Школы и детсады" },
  { id: "S2", label: "Поликлиники" },
  { id: "B1", label: "Безопасность улиц" },
  { id: "B2", label: "Безопасность дорог" },
  { id: "C1", label: "Надёжность ЖКХ" },
  { id: "C2", label: "Обращения жителей" },
];

export type DistrictOverview = {
  id: DistrictId;
  name: string;
  score: number;
  populationShare: number;
  values: Record<IndicatorId, number>;
};

export const districts: DistrictOverview[] = [
  {
    id: "esil",
    name: "Есиль",
    score: 62.99,
    populationShare: 27,
    values: { T1: 45, T2: 62, E1: 68, E2: 72, S1: 48, S2: 55, B1: 78, B2: 60, C1: 75, C2: 70 },
  },
  {
    id: "almaty",
    name: "Алматы",
    score: 57.06,
    populationShare: 24,
    values: { T1: 40, T2: 75, E1: 50, E2: 55, S1: 60, S2: 65, B1: 62, B2: 52, C1: 50, C2: 60 },
  },
  {
    id: "saryarka",
    name: "Сарыарка",
    score: 54.65,
    populationShare: 20,
    values: { T1: 50, T2: 70, E1: 42, E2: 40, S1: 62, S2: 68, B1: 58, B2: 55, C1: 45, C2: 55 },
  },
  {
    id: "baikonur",
    name: "Байконур",
    score: 56.63,
    populationShare: 13,
    values: { T1: 52, T2: 68, E1: 55, E2: 50, S1: 58, S2: 60, B1: 52, B2: 58, C1: 55, C2: 58 },
  },
  {
    id: "nura",
    name: "Нура",
    score: 49.18,
    populationShare: 16,
    values: { T1: 55, T2: 40, E1: 45, E2: 65, S1: 38, S2: 35, B1: 55, B2: 50, C1: 60, C2: 50 },
  },
];

export const baselineScore = 52.56;
export const totalBudget = 100;
