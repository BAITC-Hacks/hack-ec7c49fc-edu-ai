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

const DISTRICT_NAMES: Record<NonNullable<StructuredObjective["districtId"]>, string> = {
  esil: "Esil",
  almaty: "Almaty",
  saryarka: "Saryarka",
  baikonur: "Baikonur",
  nura: "Nura",
};

function baselineCriticalIndicators(
  candidates: readonly ScenarioCandidate[],
  objective: StructuredObjective,
): string[] {
  const baseline = candidates[0]?.result.districts ?? [];
  const indicators = baseline
    .filter((district) => !objective.districtId || district.districtId === objective.districtId)
    .flatMap((district) => district.indicators)
    .filter(
      (indicator) =>
        indicator.before < 40 &&
        (objective.focusIndicators.length === 0 ||
          objective.focusIndicators.includes(indicator.indicator)),
    )
    .map((indicator) => indicator.indicator);
  return [...new Set(indicators)];
}

function joinIndicators(indicators: readonly string[]): string {
  if (indicators.length < 2) return indicators.join("");
  return `${indicators.slice(0, -1).join(", ")} and ${indicators.at(-1)}`;
}

export async function advise(
  request: AdvisorRequest,
  simulateScenario: SimulateScenario,
): Promise<AdvisorResponse> {
  const interpretedGoal = await interpretObjective(request.message);
  const search = searchScenarios(interpretedGoal, simulateScenario);
  const critical = baselineCriticalIndicators(search.candidates, interpretedGoal);
  const trace = [
    interpretedGoal.districtId
      ? `Analyzed ${DISTRICT_NAMES[interpretedGoal.districtId]} baseline`
      : "Analyzed city baseline",
    critical.length > 0
      ? `Identified ${joinIndicators(critical)} as critical`
      : "Identified no critical indicators in the requested focus",
    `Evaluated ${search.validScenarios} valid scenarios`,
    `Selected ${search.candidates.length} alternatives`,
  ];
  const explanation = await explainCandidates(interpretedGoal, search.candidates);

  return { interpretedGoal, trace, candidates: search.candidates, explanation };
}
