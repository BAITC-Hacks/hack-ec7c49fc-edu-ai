import type { IndicatorId } from "../lib/simulation/types";

export const INDICATOR_ORDER: readonly IndicatorId[] = [
  "T1",
  "T2",
  "E1",
  "E2",
  "S1",
  "S2",
  "B1",
  "B2",
  "C1",
  "C2",
];

export const INDICATOR_NAMES: Readonly<Record<IndicatorId, string>> = {
  T1: "Разгрузка дорог",
  T2: "Доступность общественного транспорта",
  E1: "Озеленение",
  E2: "Качество воздуха",
  S1: "Школы и детсады",
  S2: "Поликлиники и первичная медпомощь",
  B1: "Безопасность улиц",
  B2: "Безопасность дорожного движения",
  C1: "Надёжность ЖКХ",
  C2: "Скорость решения обращений жителей",
};

export const INDICATOR_WEIGHTS: Readonly<Record<IndicatorId, number>> = {
  T1: 0.1,
  T2: 0.1,
  E1: 0.09,
  E2: 0.11,
  S1: 0.11,
  S2: 0.11,
  B1: 0.09,
  B2: 0.09,
  C1: 0.1,
  C2: 0.1,
};
