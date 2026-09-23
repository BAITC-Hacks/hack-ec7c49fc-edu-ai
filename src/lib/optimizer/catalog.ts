import type { DistrictId } from "@/types/domain";
import { MEASURES } from "@/data/measures";
import type { MeasureSearchDefinition } from "./types";

export const DISTRICT_IDS: readonly DistrictId[] = [
  "esil",
  "almaty",
  "saryarka",
  "baikonur",
  "nura",
];

// Search-only metadata. Effects and score math remain exclusively in the simulation layer.
export const OPTIMIZER_MEASURES: readonly MeasureSearchDefinition[] = MEASURES.map(
  ({ id, direction, scope, cost }) => ({ id, direction, scope, cost }),
);
