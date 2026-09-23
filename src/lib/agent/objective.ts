import type { DistrictId, IndicatorId } from "@/types/domain";
import type { ObjectiveKind, StructuredObjective } from "@/lib/optimizer/types";
import { createOpenAIResponse } from "./openai";
import { OBJECTIVE_INSTRUCTIONS } from "./prompts";

const OBJECTIVES: readonly ObjectiveKind[] = [
  "maximize_city_score",
  "improve_district",
  "reduce_critical_indicators",
  "balanced_development",
];
const DISTRICTS: readonly DistrictId[] = ["esil", "almaty", "saryarka", "baikonur", "nura"];
const INDICATORS: readonly IndicatorId[] = [
  "T1", "T2", "E1", "E2", "S1", "S2", "B1", "B2", "C1", "C2",
];

const OBJECTIVE_SCHEMA = {
  type: "json_schema",
  name: "urban_planning_objective",
  strict: true,
  schema: {
    type: "object",
    properties: {
      objective: { type: "string", enum: OBJECTIVES },
      districtId: { type: ["string", "null"], enum: [...DISTRICTS, null] },
      focusIndicators: { type: "array", items: { type: "string", enum: INDICATORS } },
      reduceCritical: { type: "boolean" },
    },
    required: ["objective", "districtId", "focusIndicators", "reduceCritical"],
    additionalProperties: false,
  },
};

const DISTRICT_ALIASES: ReadonlyArray<[DistrictId, RegExp]> = [
  ["saryarka", /(?:saryarka|sary-arka|сарыарка)/iu],
  ["baikonur", /(?:baikonur|байконур)/iu],
  ["almaty", /(?:almaty|алматы)/iu],
  ["nura", /(?:nura|нуру|нура|нуре|нуры)/iu],
  ["esil", /(?:esil|есил|есиль)/iu],
];

const INDICATOR_HINTS: ReadonlyArray<[IndicatorId[], RegExp]> = [
  [["T1", "T2"], /transport|traffic|congestion|public transport|транспорт|пробк/iu],
  [["E1", "E2"], /ecolog|green|air|эколог|озелен|воздух/iu],
  [["S1", "S2"], /social|социальн/iu],
  [["S1"], /school|kindergarten|школ|детск(?:ий|ого) сад/iu],
  [["S2"], /clinic|health|поликлиник|здравоохран/iu],
  [["B1", "B2"], /safety|безопас/iu],
  [["C1", "C2"], /utilit|service|request|коммунал|услуг|обращен/iu],
];

export function validateStructuredObjective(value: unknown): StructuredObjective | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "objective",
    "districtId",
    "focusIndicators",
    "reduceCritical",
  ]);
  if (Object.keys(candidate).some((key) => !allowedKeys.has(key))) return null;
  if (!OBJECTIVES.includes(candidate.objective as ObjectiveKind)) return null;
  const districtId = candidate.districtId;
  if (districtId != null && !DISTRICTS.includes(districtId as DistrictId)) return null;
  if (!Array.isArray(candidate.focusIndicators)) return null;
  if (!candidate.focusIndicators.every((item) => INDICATORS.includes(item as IndicatorId))) return null;
  if (typeof candidate.reduceCritical !== "boolean") return null;
  if (candidate.objective === "improve_district" && districtId == null) return null;
  if (candidate.objective !== "improve_district" && districtId != null) return null;

  return {
    objective: candidate.objective as ObjectiveKind,
    ...(districtId ? { districtId: districtId as DistrictId } : {}),
    focusIndicators: [...new Set(candidate.focusIndicators as IndicatorId[])],
    reduceCritical: candidate.reduceCritical,
  };
}

export function interpretObjectiveDeterministically(message: string): StructuredObjective {
  const districtId = DISTRICT_ALIASES.find(([, pattern]) => pattern.test(message))?.[0];
  const reduceCritical = /critical|below\s*40|критичес|ниже\s*40|критик/iu.test(message);
  const balance = /balanc|равномер|сбаланс/iu.test(message);
  const focusIndicators = [
    ...new Set(
      INDICATOR_HINTS.filter(([, pattern]) => pattern.test(message)).flatMap(([ids]) => ids),
    ),
  ];

  let objective: ObjectiveKind = "maximize_city_score";
  if (districtId) objective = "improve_district";
  else if (reduceCritical) objective = "reduce_critical_indicators";
  else if (balance) objective = "balanced_development";

  return { objective, ...(districtId ? { districtId } : {}), focusIndicators, reduceCritical };
}

export async function interpretObjective(message: string): Promise<StructuredObjective> {
  if (!process.env.OPENAI_API_KEY) return interpretObjectiveDeterministically(message);

  try {
    const output = await createOpenAIResponse(
      OBJECTIVE_INSTRUCTIONS,
      message,
      OBJECTIVE_SCHEMA,
    );
    return validateStructuredObjective(JSON.parse(output)) ?? interpretObjectiveDeterministically(message);
  } catch {
    return interpretObjectiveDeterministically(message);
  }
}
