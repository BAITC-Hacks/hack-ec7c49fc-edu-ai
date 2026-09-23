import type { ScenarioCandidate } from "@/types/domain";
import type { StructuredObjective } from "@/lib/optimizer/types";
import { createOpenAIResponse } from "./openai";
import { describeResult, type CurrentScenarioAnalysis } from "./analysis";
import { explanationFormat, explanationInput, explanationInstructions } from "./prompts";

// The model can choose emphasis only from these calculated facts. Its own prose or
// numbers are never displayed, including spelled-out numbers and invented risks.
export const EVIDENCE_KEYS = ["fit", "improvements", "remaining", "low", "weakest", "budget"] as const;
type EvidenceKey = typeof EVIDENCE_KEYS[number];
interface Emphasis { goalFit: EvidenceKey; tradeoff: EvidenceKey }

function renderExplanation(
  objective: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
  current?: CurrentScenarioAnalysis,
  emphasis?: readonly Emphasis[],
): string {
  const sections: string[] = current ? [current.summary] : [];
  if (candidates.length === 0) sections.push("Не найден допустимый сценарий из пяти мероприятий в пределах ограничений симулятора.");
  candidates.forEach((candidate, index) => {
    const facts = describeResult(candidate.result, objective);
    const comparison = current?.comparisons[index];
    const selected = emphasis?.[index];
    sections.push([
      `Сценарий ${String.fromCharCode(65 + index)}`,
      facts.fit,
      facts.improvements,
      facts.score,
      facts.budget,
      facts.critical,
      facts.remaining,
      facts.weakest,
      `Компромисс: ${facts.low}`,
      facts.districtDeltas,
      ...(comparison ? [
        `По приоритетам цели: ${comparison.assessment === "better" ? "лучше текущего плана" : comparison.assessment === "worse" ? "хуже текущего плана" : "равноценен текущему плану"}.`,
        `Преимущества перед текущим планом: ${comparison.advantages.join(" ") || "не выявлены"}`,
        `Уступает текущему плану: ${comparison.tradeoffs.join(" ") || "ухудшений по сравниваемым полям нет"}`,
        comparison.budgetEfficiency,
      ] : []),
      ...(selected ? [`Акцент AI: ${facts[selected.goalFit]} ${facts[selected.tradeoff]}`] : []),
    ].join("\n"));
  });
  return sections.join("\n\n");
}

export function fallbackExplanation(
  objective: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
  current?: CurrentScenarioAnalysis,
): string {
  return renderExplanation(objective, candidates, current);
}

function validateEmphasis(value: unknown, candidateCount: number): Emphasis[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "summaries")) return null;
  if (!Array.isArray(record.summaries) || record.summaries.length !== candidateCount) return null;
  const result: Emphasis[] = [];
  for (const item of record.summaries) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    if (Object.keys(item).some((key) => key !== "goalFit" && key !== "tradeoff")) return null;
    if (!EVIDENCE_KEYS.includes(item.goalFit) || !EVIDENCE_KEYS.includes(item.tradeoff)) return null;
    result.push({ goalFit: item.goalFit, tradeoff: item.tradeoff });
  }
  return result;
}

export async function explainCandidates(
  objective: StructuredObjective,
  candidates: readonly ScenarioCandidate[],
  current?: CurrentScenarioAnalysis,
): Promise<string> {
  const fallback = fallbackExplanation(objective, candidates, current);
  if (!process.env.OPENAI_API_KEY || candidates.length === 0) return fallback;
  try {
    const output = await createOpenAIResponse(
      explanationInstructions(),
      explanationInput(objective, candidates, current),
      explanationFormat(candidates.length),
    );
    const emphasis = validateEmphasis(JSON.parse(output), candidates.length);
    return emphasis ? renderExplanation(objective, candidates, current, emphasis) : fallback;
  } catch {
    return fallback;
  }
}
