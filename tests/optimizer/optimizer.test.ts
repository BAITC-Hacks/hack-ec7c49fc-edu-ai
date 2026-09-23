import { describe, expect, it, vi } from "vitest";
import { compareCandidateQuality, searchScenarios } from "@/lib/optimizer/optimizer";
import type { MeasureSearchDefinition, StructuredObjective } from "@/lib/optimizer/types";
import type { DistrictId, DistrictResult, ScenarioInput, SimulationResult } from "@/types/domain";

const districts: DistrictId[] = ["esil", "almaty", "saryarka", "baikonur", "nura"];

function withTestCost(
  measures: Array<Omit<MeasureSearchDefinition, "cost">>,
): MeasureSearchDefinition[] {
  return measures.map((measure) => ({ ...measure, cost: 1 }));
}

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

  if (input.selections.some((selection) => selection.measureId === "M0")) {
    return {
      valid: false,
      validationErrors: ["Invalid test scenario."],
      cost: value,
      remainingBudget: 100 - value,
      scoreBefore: 50,
      scoreAfter: null,
      scoreDelta: null,
      weakestDistrict: null,
      criticalBefore: 1,
      criticalAfter: null,
      districts: [],
    };
  }

  return {
    valid: true,
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
  it("ranks zero critical indicators above greater district/focus/city gains and cost savings", () => {
    const base = resultFor({ selections: [{ measureId: "M1" }] });
    if (!base.valid) throw new Error("Expected valid fixture");
    const goal: StructuredObjective = { objective: "improve_district", districtId: "nura", focusIndicators: ["S1"], reduceCritical: true };
    const candidates = [2, 0, 1].map((criticalAfter) => ({ selections: [], result: {
      ...base, criticalAfter, scoreAfter: 60 + criticalAfter, cost: 100 - criticalAfter,
      districts: base.districts.map((district) => ({ ...district, scoreDelta: criticalAfter,
        indicators: [{ indicator: "S1" as const, before: 35, after: 40 + criticalAfter, delta: 5 + criticalAfter }],
      })),
    } }));
    expect([...candidates].sort((a, b) => compareCandidateQuality(a, b, goal)).map((item) => item.result.criticalAfter)).toEqual([0, 1, 2]);
    expect(compareCandidateQuality(candidates[0], candidates[1], { ...goal, reduceCritical: false })).toBeLessThan(0);
  });

  it("keeps critical-first search deterministic with distinct strategies", () => {
    const measures = withTestCost([
      { id: "M2", direction: "transport", scope: "city" },
      { id: "M4", direction: "ecology", scope: "city" },
      { id: "M6", direction: "ecology", scope: "city" },
      { id: "M8", direction: "social", scope: "city" },
      { id: "M10", direction: "safety", scope: "city" },
      { id: "M12", direction: "services", scope: "city" },
    ]);
    const goal: StructuredObjective = { objective: "improve_district", districtId: "nura", focusIndicators: ["S1"], reduceCritical: true };
    const first = searchScenarios(goal, resultFor, measures);
    expect(searchScenarios(goal, resultFor, measures)).toEqual(first);
    expect(searchScenarios(goal, resultFor, [...measures].reverse()).candidates.map((item) => item.result)).toEqual(first.candidates.map((item) => item.result));
    expect(new Set(first.candidates.map((item) => item.selections.map((selection) => selection.measureId).sort().join("|"))).size).toBe(3);
  });

  it("is deterministic and returns three distinct initiative strategies", () => {
    const measures = withTestCost([
      { id: "M1", direction: "transport", scope: "city" },
      { id: "M2", direction: "transport", scope: "city" },
      { id: "M3", direction: "ecology", scope: "city" },
      { id: "M4", direction: "ecology", scope: "city" },
      { id: "M5", direction: "social", scope: "city" },
      { id: "M6", direction: "safety", scope: "city" },
      { id: "M7", direction: "services", scope: "city" },
    ]);

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
    const measures = withTestCost([
      { id: "M1", direction: "transport", scope: "district" },
      { id: "M4", direction: "ecology", scope: "city" },
      { id: "M7", direction: "social", scope: "city" },
      { id: "M10", direction: "safety", scope: "city" },
      { id: "M12", direction: "services", scope: "city" },
    ]);
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

  it("prioritizes fewer critical indicators for reduce_critical_indicators", () => {
    const measures = withTestCost([
      { id: "M1", direction: "transport", scope: "city" },
      { id: "M2", direction: "transport", scope: "city" },
      { id: "M4", direction: "ecology", scope: "city" },
      { id: "M7", direction: "social", scope: "city" },
      { id: "M10", direction: "safety", scope: "city" },
      { id: "M12", direction: "services", scope: "city" },
    ]);
    const simulator = (input: ScenarioInput): SimulationResult => {
      const includesM1 = input.selections.some((item) => item.measureId === "M1");
      const base = resultFor(input);
      if (!base.valid) return base;
      return {
        ...base,
        criticalAfter: includesM1 ? 0 : 2,
        scoreAfter: includesM1 ? 51 : 99,
      };
    };

    const result = searchScenarios(
      {
        objective: "reduce_critical_indicators",
        focusIndicators: [],
        reduceCritical: true,
      },
      simulator,
      measures,
    );

    expect(result.candidates[0].result.criticalAfter).toBe(0);
    expect(result.candidates[0].selections).toContainEqual({ measureId: "M1" });
  });

  it("prioritizes the weakest district for balanced_development", () => {
    const measures = withTestCost([
      { id: "M1", direction: "transport", scope: "city" },
      { id: "M2", direction: "transport", scope: "city" },
      { id: "M4", direction: "ecology", scope: "city" },
      { id: "M7", direction: "social", scope: "city" },
      { id: "M10", direction: "safety", scope: "city" },
      { id: "M12", direction: "services", scope: "city" },
    ]);
    const simulator = (input: ScenarioInput): SimulationResult => {
      const includesM1 = input.selections.some((item) => item.measureId === "M1");
      const base = resultFor(input);
      if (!base.valid) return base;
      return {
        ...base,
        scoreAfter: includesM1 ? 51 : 99,
        districts: base.districts.map((district) =>
          district.districtId === "nura"
            ? { ...district, scoreAfter: includesM1 ? 60 : 40 }
            : district,
        ),
      };
    };

    const result = searchScenarios(
      {
        objective: "balanced_development",
        focusIndicators: [],
        reduceCritical: false,
      },
      simulator,
      measures,
    );

    expect(result.candidates[0].selections).toContainEqual({ measureId: "M1" });
  });

  it("rejects obvious conflicts before calling the simulator", () => {
    const simulator = vi.fn(resultFor);
    const conflict = withTestCost([
      { id: "M1", direction: "transport", scope: "city" },
      { id: "M3", direction: "transport", scope: "city" },
      { id: "M4", direction: "ecology", scope: "city" },
      { id: "M7", direction: "social", scope: "city" },
      { id: "M10", direction: "safety", scope: "city" },
    ]);
    const directionOverflow = withTestCost([
      { id: "M1", direction: "transport", scope: "city" },
      { id: "M2", direction: "transport", scope: "city" },
      { id: "MX", direction: "transport", scope: "city" },
      { id: "M4", direction: "ecology", scope: "city" },
      { id: "M7", direction: "social", scope: "city" },
    ]);

    expect(searchScenarios(objective, simulator, conflict).evaluatedScenarios).toBe(0);
    expect(searchScenarios(objective, simulator, directionOverflow).evaluatedScenarios).toBe(0);
    expect(simulator).not.toHaveBeenCalled();
  });
});
