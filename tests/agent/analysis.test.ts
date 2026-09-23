import { afterEach, describe, expect, it, vi } from "vitest";
import { simulateScenario } from "@/lib/simulation/engine";
import { analyzeCurrentScenario } from "@/lib/agent/analysis";
import { advise } from "@/lib/agent/advisor";
import { explainCandidates, fallbackExplanation } from "@/lib/agent/explanation";
import * as optimizer from "@/lib/optimizer/optimizer";
import { explanationInput } from "@/lib/agent/prompts";
import type { StructuredObjective } from "@/lib/optimizer/types";
import type { ScenarioCandidate, ScenarioInput } from "@/types/domain";

const input: ScenarioInput = { selections: [
  { measureId: "M7", districtId: "nura" }, { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" }, { measureId: "M12" }, { measureId: "M5", districtId: "saryarka" },
] };
const goal: StructuredObjective = { objective: "improve_district", districtId: "nura", focusIndicators: ["S1", "S2"], reduceCritical: true };
const result = simulateScenario(input);
if (!result.valid) throw new Error("Reference must be valid");
const candidate: ScenarioCandidate = { ...input, result };

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("current scenario analysis", () => {
  it("keeps engine values and does not claim a proposal is always better", () => {
    const analysis = analyzeCurrentScenario(result, goal, [candidate]);
    expect(analysis.result).toBe(result);
    expect(analysis.comparisons[0].assessment).toBe("equivalent");
    expect(analysis.comparisons[0].advantages).toEqual([]);
    expect(analysis.remainingCriticalIndicators).toEqual([]);
    expect(analysis.summary).toContain("Сильные стороны");
    expect(analysis.summary).toContain("Риски / слабые места");
    expect(analysis.summary).toContain("Самый слабый район: Нура");
    expect(fallbackExplanation(goal, [candidate], analysis)).toContain("равноценен текущему плану");
  });

  it("identifies unaddressed critical and unchanged focus indicators from actual engine output", () => {
    const other = simulateScenario({ selections: input.selections.map((item) => item.districtId === "nura" ? { ...item, districtId: "esil" } : item) });
    const analysis = analyzeCurrentScenario(other, goal, [candidate]);
    expect(analysis.remainingCriticalIndicators.map((item) => item.indicator)).toEqual(["S1", "S2"]);
    expect(analysis.lowImprovementIndicators.every((item) => item.delta === 0)).toBe(true);
    expect(analysis.comparisons[0].assessment).toBe("better");
    expect(analysis.comparisons[0].tradeoffs.join(" ")).toContain("Есиль");
    expect(analysis.comparisons[0].budgetEfficiency).toContain("стоит не больше");
    expect(analysis.summary).not.toMatch(/коррупц|задержк|политичес/);
  });

  it("reports invalid plans without fabricated after-state comparisons", () => {
    const invalid = simulateScenario({ selections: [] });
    const analysis = analyzeCurrentScenario(invalid, goal, [candidate]);
    expect(analysis.result).toEqual(invalid);
    expect(analysis.comparisons).toEqual([]);
    expect(analysis.summary).toContain("не прошёл проверку");
  });

  it("actually simulates the supplied currentScenario even with no valid search results", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const invalid = simulateScenario({ selections: [] });
    const simulator = vi.fn().mockReturnValue(invalid);
    vi.spyOn(optimizer, "searchScenarios").mockReturnValueOnce({ candidates: [], evaluatedScenarios: 0, validScenarios: 0 });
    const response = await advise({ message: "Улучши Нуру", currentScenario: input }, simulator);
    expect(simulator).toHaveBeenCalledExactlyOnceWith(input);
    expect(response.currentScenarioAnalysis?.result).toBe(invalid);
    expect(response.explanation).toContain("Текущий план не прошёл проверку");
  });
});

describe("grounded model explanations", () => {
  it("sends the calculated current plan and comparisons to the model", () => {
    const analysis = analyzeCurrentScenario(result, goal, [candidate]);
    const payload = JSON.parse(explanationInput(goal, [candidate], analysis));
    expect(payload.currentScenarioAnalysis.result).toEqual(result);
    expect(payload.currentScenarioAnalysis.comparisons).toEqual(analysis.comparisons);
    expect(payload.calculatedFacts[0].scoreAfter).toBe(result.scoreAfter);
  });

  it.each([
    { goalFit: "fit", tradeoff: "low" },
    { goalFit: "Повышает Score на девятьсот", tradeoff: "Риск коррупции" },
  ])("only renders validated evidence keys: %j", async (summary) => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: JSON.stringify({ summaries: [summary] }) }))));
    const output = await explainCandidates(goal, [candidate]);
    expect(output).not.toMatch(/девятьсот|коррупции/);
    expect(output).toContain("Использует 95");
    if (summary.goalFit === "fit") expect(output).toContain("Акцент AI:");
    else expect(output).toBe(fallbackExplanation(goal, [candidate]));
  });

  it("falls back in Russian on timeout or API failure", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")));
    await expect(explainCandidates(goal, [candidate])).resolves.toBe(fallbackExplanation(goal, [candidate]));
  });
});
