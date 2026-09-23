import type { ScenarioCandidate, ScenarioInput } from "@/types/domain";
import { searchScenarios } from "@/lib/optimizer/optimizer";
import type { SimulateScenario, StructuredObjective } from "@/lib/optimizer/types";
import { explainCandidates } from "./explanation";
import { interpretObjective } from "./objective";

export interface AdvisorRequest {
  message: string;
  currentScenario?: ScenarioInput;
}

export interface AdvisorResponse {
  interpretedGoal: StructuredObjective;
  trace: string[];
  candidates: ScenarioCandidate[];
  explanation: string;
}

function baselineCriticalIndicators(candidates: readonly ScenarioCandidate[]): string[] {
  const baseline = candidates[0]?.result.districts ?? [];
  return baseline.flatMap((district) =>
    district.indicators
      .filter((indicator) => indicator.before < 40)
      .map((indicator) => `${district.districtId}.${indicator.indicator}`),
  );
}

export async function advise(
  request: AdvisorRequest,
  simulateScenario: SimulateScenario,
): Promise<AdvisorResponse> {
  const interpretedGoal = await interpretObjective(request.message);
  const search = searchScenarios(interpretedGoal, simulateScenario);
  const critical = baselineCriticalIndicators(search.candidates);
  const trace = [
    interpretedGoal.districtId
      ? `Analyzed ${interpretedGoal.districtId} baseline`
      : "Analyzed city baseline",
    critical.length > 0
      ? `Found critical indicators: ${critical.join(", ")}`
      : "Found no critical baseline indicators",
    `Evaluated ${search.validScenarios} valid scenarios`,
    `Selected ${search.candidates.length} alternatives`,
  ];
  const explanation = await explainCandidates(interpretedGoal, search.candidates);

  return { interpretedGoal, trace, candidates: search.candidates, explanation };
}
