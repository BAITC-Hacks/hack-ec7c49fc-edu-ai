import type { ScenarioCandidate } from "@/types/domain";
import type { StructuredObjective } from "@/lib/optimizer/types";

export const OBJECTIVE_INSTRUCTIONS = `You extract a planning objective for Astana.
Return only the requested structured object. Never propose initiatives and never calculate
scores, budgets, indicator values, or effects. Use improve_district only when the user names
a district. Supported districts: esil, almaty, saryarka, baikonur, nura.`;

export function explanationInstructions(): string {
  return `You explain already-calculated urban planning alternatives.
Use only the facts supplied by the application. Do not calculate, infer, round differently,
or introduce any number. Explain goal fit, budget, score improvement, weakest remaining
district, critical indicators, trade-offs, and how alternatives differ. Be concise.`;
}

export function explanationInput(
  goal: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
): string {
  const facts = candidates.map((candidate, index) => ({
    alternative: index + 1,
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
