import type { DistrictId } from "@/types/domain";
import type { MeasureSearchDefinition } from "./types";

export const DISTRICT_IDS: readonly DistrictId[] = [
  "esil",
  "almaty",
  "saryarka",
  "baikonur",
  "nura",
];

// Search metadata only. Costs and effects deliberately remain in the simulation layer.
export const OPTIMIZER_MEASURES: readonly MeasureSearchDefinition[] = [
  { id: "M1", direction: "transport", scope: "district" },
  { id: "M2", direction: "transport", scope: "city" },
  { id: "M3", direction: "transport", scope: "district" },
  { id: "M4", direction: "ecology", scope: "district" },
  { id: "M5", direction: "ecology", scope: "district" },
  { id: "M6", direction: "ecology", scope: "city" },
  { id: "M7", direction: "social", scope: "district" },
  { id: "M8", direction: "social", scope: "district" },
  { id: "M9", direction: "social", scope: "district" },
  { id: "M10", direction: "safety", scope: "district" },
  { id: "M11", direction: "safety", scope: "district" },
  { id: "M12", direction: "services", scope: "city" },
  { id: "M13", direction: "services", scope: "district" },
  { id: "M14", direction: "services", scope: "city" },
];
