import type { ScenarioCandidate } from "@/types/domain";
import type { StructuredObjective } from "@/lib/optimizer/types";
import { describeResult, type CurrentScenarioAnalysis } from "./analysis";

export const OBJECTIVE_INSTRUCTIONS = `You extract a planning objective for Astana.
Return only the requested structured object. Never propose initiatives and never calculate
scores, budgets, indicator values, or effects. Use improve_district only when the user names
a district. Preserve explicit requests to eliminate/reduce critical indicators as
reduceCritical=true, even for improve_district. Supported districts: esil, almaty, saryarka, baikonur, nura.`;

export function explanationInstructions(): string {
  return `Select the most relevant grounded evidence for explaining urban planning alternatives.
Return only evidence keys for goalFit and tradeoff, never prose or numbers. Use the supplied
Russian evidence and calculated results, including the current plan when supplied. Do not
calculate scores, budgets, effects or indicators; do not invent policy risks. Keep candidate
order. The application renders the chosen evidence verbatim in Russian.`;
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
              goalFit: { type: "string", enum: ["fit", "improvements", "remaining", "low", "weakest", "budget"] },
              tradeoff: { type: "string", enum: ["fit", "improvements", "remaining", "low", "weakest", "budget"] },
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
  current?: CurrentScenarioAnalysis,
): string {
  const facts = candidates.map((candidate, index) => ({
    alternative: String.fromCharCode(65 + index),
    evidence: describeResult(candidate.result, goal),
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

  return JSON.stringify({ goal, calculatedFacts: facts, ...(current ? { currentScenarioAnalysis: current } : {}) });
}
