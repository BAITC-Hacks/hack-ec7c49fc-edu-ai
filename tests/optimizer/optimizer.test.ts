import { describe, expect, it, vi } from "vitest";
import { searchScenarios } from "@/lib/optimizer/optimizer";
import type { MeasureSearchDefinition, StructuredObjective } from "@/lib/optimizer/types";
import type { DistrictId, DistrictResult, ScenarioInput, SimulationResult } from "@/types/domain";

const districts: DistrictId[] = ["esil", "almaty", "saryarka", "baikonur", "nura"];

function resultFor(input: ScenarioInput): SimulationResult {
  const value = input.selections.reduce(
    (total, selection) => total + Number(selection.measureId.replace(/\D/g, "")),
    0,
  );
  const districtResults: DistrictResult[] = districts.map((districtId) => {
    const targeted = input.selections.filter((item) => item.districtId === districtId).length;
    return {
      districtId,
      scoreBefore: 50,
      scoreAfter: 50 + targeted,
      scoreDelta: targeted,
      indicators: [{ indicator: "S1", before: 35, after: 35 + targeted, delta: targeted }],
    };
  });
  return {
    valid: !input.selections.some((selection) => selection.measureId === "M0"),
    validationErrors: [],
    cost: value,
    remainingBudget: 100 - value,
    scoreBefore: 50,
    scoreAfter: 50 + value,
    scoreDelta: value,
    weakestDistrict: "nura",
    criticalBefore: 1,
    criticalAfter: value > 20 ? 0 : 1,
    districts: districtResults,
  };
}

const objective: StructuredObjective = {
  objective: "maximize_city_score",
  focusIndicators: [],
  reduceCritical: false,
};

describe("searchScenarios", () => {
  it("is deterministic and returns three distinct initiative strategies", () => {
    const measures: MeasureSearchDefinition[] = [
      { id: "M1", direction: "transport", scope: "city" },
      { id: "M2", direction: "transport", scope: "city" },
      { id: "M3", direction: "ecology", scope: "city" },
      { id: "M4", direction: "ecology", scope: "city" },
      { id: "M5", direction: "social", scope: "city" },
      { id: "M6", direction: "safety", scope: "city" },
      { id: "M7", direction: "services", scope: "city" },
    ];

    const first = searchScenarios(objective, resultFor, measures);
    const second = searchScenarios(objective, resultFor, measures);

    expect(first).toEqual(second);
    expect(first.candidates).toHaveLength(3);
    const strategies = first.candidates.map((candidate) =>
      candidate.selections.map((selection) => selection.measureId).sort().join("|"),
    );
    expect(new Set(strategies).size).toBe(3);
    expect(first.candidates[0].result.scoreAfter).toBeGreaterThanOrEqual(
      first.candidates[1].result.scoreAfter,
    );
  });

  it("generates district targets and delegates every result to the simulator", () => {
    const measures: MeasureSearchDefinition[] = [
      { id: "M1", direction: "transport", scope: "district" },
      { id: "M4", direction: "ecology", scope: "city" },
      { id: "M7", direction: "social", scope: "city" },
      { id: "M10", direction: "safety", scope: "city" },
      { id: "M12", direction: "services", scope: "city" },
    ];
    const simulator = vi.fn(resultFor);
    const result = searchScenarios(
      {
        objective: "improve_district",
        districtId: "nura",
        focusIndicators: ["S1"],
        reduceCritical: true,
      },
      simulator,
      measures,
    );

    expect(simulator).toHaveBeenCalledTimes(5);
    expect(result.evaluatedScenarios).toBe(5);
    expect(result.candidates[0].selections).toContainEqual({ measureId: "M1", districtId: "nura" });
  });

  it("requires a district for improve_district", () => {
    expect(() =>
      searchScenarios(
        { objective: "improve_district", focusIndicators: [], reduceCritical: false },
        resultFor,
        [],
      ),
    ).toThrow("requires districtId");
  });
});
