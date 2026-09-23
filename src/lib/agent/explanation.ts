import type { ScenarioCandidate } from "@/types/domain";
import type { StructuredObjective } from "@/lib/optimizer/types";
import { createOpenAIResponse } from "./openai";
import { explanationInput, explanationInstructions } from "./prompts";

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function fallbackExplanation(
  objective: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
): string {
  if (candidates.length === 0) {
    return "No valid five-initiative scenario was found within the simulation constraints.";
  }

  const target = objective.districtId ? ` for ${objective.districtId}` : "";
  return candidates
    .map((candidate, index) => {
      const result = candidate.result;
      const measures = candidate.selections
        .map((selection) => `${selection.measureId}${selection.districtId ? ` ${selection.districtId}` : " city"}`)
        .join(", ");
      return `Alternative ${index + 1}${target}: ${measures}. Cost ${format(result.cost)}; ` +
        `score ${format(result.scoreBefore)} → ${format(result.scoreAfter)} ` +
        `(Δ ${format(result.scoreDelta)}); remaining budget ${format(result.remainingBudget)}; ` +
        `critical indicators ${result.criticalBefore} → ${result.criticalAfter}; ` +
        `weakest remaining district: ${result.weakestDistrict}.`;
    })
    .join("\n");
}

function numericTokens(text: string): number[] {
  return [...text.matchAll(/-?\d+(?:[.,]\d+)?/g)].map((match) =>
    Number(match[0].replace(",", ".")),
  );
}

function groundedNumbers(text: string, facts: string): boolean {
  const allowed = numericTokens(facts);
  return numericTokens(text).every((value) =>
    allowed.some((known) => Math.abs(known - value) < Number.EPSILON),
  );
}

export async function explainCandidates(
  objective: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
): Promise<string> {
  const fallback = fallbackExplanation(objective, candidates);
  if (!process.env.OPENAI_API_KEY || candidates.length === 0) return fallback;

  const facts = explanationInput(objective, candidates);
  try {
    const explanation = await createOpenAIResponse(explanationInstructions(), facts);
    return groundedNumbers(explanation, facts) ? explanation : fallback;
  } catch {
    return fallback;
  }
}
