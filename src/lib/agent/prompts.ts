import type { ScenarioCandidate } from "@/types/domain";
import type { StructuredObjective } from "@/lib/optimizer/types";

export const OBJECTIVE_INSTRUCTIONS = `You extract a planning objective for Astana.
Return only the requested structured object. Never propose initiatives and never calculate
scores, budgets, indicator values, or effects. Use improve_district only when the user names
a district. Supported districts: esil, almaty, saryarka, baikonur, nura.`;

export function explanationInstructions(): string {
  return `You explain already-calculated urban planning alternatives.
Return the requested structured object. For each alternative, write a concise qualitative
goal-fit statement and trade-off. Do not use digits or number words. Do not calculate,
infer, round, or restate numeric values. The application will attach all numeric facts itself.
Use only the supplied facts and keep the array in the supplied alternative order.`;
}

export function explanationFormat(candidateCount: number): Record<string, unknown> {
  return {
    type: "json_schema",
    name: "scenario_explanations",
    strict: true,
    schema: {
      type: "object",
      properties: {
        summaries: {
          type: "array",
          minItems: candidateCount,
          maxItems: candidateCount,
          items: {
            type: "object",
            properties: {
              goalFit: { type: "string" },
              tradeoff: { type: "string" },
            },
            required: ["goalFit", "tradeoff"],
            additionalProperties: false,
          },
        },
      },
      required: ["summaries"],
      additionalProperties: false,
    },
  };
}

export function explanationInput(
  goal: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
): string {
  const facts = candidates.map((candidate, index) => ({
    alternative: String.fromCharCode(65 + index),
    selections: candidate.selections,
    cost: candidate.result.cost,
    remainingBudget: candidate.result.remainingBudget,
    scoreBefore: candidate.result.scoreBefore,
    scoreAfter: candidate.result.scoreAfter,
    scoreDelta: candidate.result.scoreDelta,
    weakestDistrict: candidate.result.weakestDistrict,
    criticalBefore: candidate.result.criticalBefore,
    criticalAfter: candidate.result.criticalAfter,
    districtResults: candidate.result.districts.map((district) => ({
      districtId: district.districtId,
      scoreBefore: district.scoreBefore,
      scoreAfter: district.scoreAfter,
      scoreDelta: district.scoreDelta,
      indicators: district.indicators,
    })),
  }));

  return JSON.stringify({ goal, calculatedFacts: facts });
}
