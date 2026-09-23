import type { ScenarioCandidate } from "@/types/domain";
import type { StructuredObjective } from "@/lib/optimizer/types";
import { createOpenAIResponse } from "./openai";
import {
  explanationFormat,
  explanationInput,
  explanationInstructions,
} from "./prompts";

interface QualitativeSummary {
  goalFit: string;
  tradeoff: string;
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatDelta(value: number): string {
  return `${value >= 0 ? "+" : ""}${format(value)}`;
}

function renderExplanation(
  objective: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
  summaries?: readonly QualitativeSummary[],
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
      const districtDeltas = result.districts
        .map((district) => `${district.districtId} ${formatDelta(district.scoreDelta)}`)
        .join(", ");
      const qualitative = summaries?.[index];
      const rationale = qualitative
        ? ` Goal fit: ${qualitative.goalFit} Trade-off: ${qualitative.tradeoff}`
        : "";

      return `Alternative ${String.fromCharCode(65 + index)}${target}: ${measures}. ` +
        `Cost ${format(result.cost)}; score ${format(result.scoreBefore)} → ${format(result.scoreAfter)} ` +
        `(Δ ${formatDelta(result.scoreDelta)}); remaining budget ${format(result.remainingBudget)}; ` +
        `critical indicators ${result.criticalBefore} → ${result.criticalAfter}; ` +
        `weakest remaining district: ${result.weakestDistrict}; ` +
        `district deltas: ${districtDeltas || "unavailable"}.${rationale}`;
    })
    .join("\n");
}

export function fallbackExplanation(
  objective: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
): string {
  return renderExplanation(objective, candidates);
}

function validateQualitativeSummaries(
  value: unknown,
  candidateCount: number,
): QualitativeSummary[] | null {
  if (!value || typeof value !== "object") return null;
  const summaries = (value as Record<string, unknown>).summaries;
  if (!Array.isArray(summaries) || summaries.length !== candidateCount) return null;

  const numberWords = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|hundred|ноль|один|одна|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|сто)\b/iu;
  const validated: QualitativeSummary[] = [];
  for (const item of summaries) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    if (Object.keys(record).some((key) => key !== "goalFit" && key !== "tradeoff")) return null;
    if (typeof record.goalFit !== "string" || typeof record.tradeoff !== "string") return null;
    if (record.goalFit.length === 0 || record.tradeoff.length === 0) return null;
    if (/\d/u.test(record.goalFit) || /\d/u.test(record.tradeoff)) return null;
    if (numberWords.test(record.goalFit) || numberWords.test(record.tradeoff)) return null;
    validated.push({ goalFit: record.goalFit, tradeoff: record.tradeoff });
  }
  return validated;
}

export async function explainCandidates(
  objective: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
): Promise<string> {
  const fallback = fallbackExplanation(objective, candidates);
  if (!process.env.OPENAI_API_KEY || candidates.length === 0) return fallback;

  const facts = explanationInput(objective, candidates);
  try {
    const output = await createOpenAIResponse(
      explanationInstructions(),
      facts,
      explanationFormat(candidates.length),
    );
    const summaries = validateQualitativeSummaries(JSON.parse(output), candidates.length);
    return summaries ? renderExplanation(objective, candidates, summaries) : fallback;
  } catch {
    return fallback;
  }
}
