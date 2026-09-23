import { expect, it } from "vitest";
import { simulateScenario } from "@/lib/simulation/engine";
import { searchScenarios } from "@/lib/optimizer/optimizer";

it("benchmarks the integrated optimizer", () => {
  const startedAt = performance.now();
  const result = searchScenarios(
    {
      objective: "improve_district",
      districtId: "nura",
      focusIndicators: ["S1", "S2"],
      reduceCritical: true,
    },
    simulateScenario,
  );
  const elapsedMs = performance.now() - startedAt;

  console.info("optimizer benchmark", JSON.stringify({
    elapsedMs: Math.round(elapsedMs),
    evaluatedScenarios: result.evaluatedScenarios,
    validScenarios: result.validScenarios,
    candidates: result.candidates.map((candidate) => ({
      selections: candidate.selections,
      scoreAfter: candidate.result.scoreAfter,
      scoreDelta: candidate.result.scoreDelta,
      criticalAfter: candidate.result.criticalAfter,
    })),
  }));
  expect(result.candidates).toHaveLength(3);
  expect(result.candidates.map((candidate) => candidate.selections)).toEqual([
    [
      { measureId: "M3", districtId: "nura" },
      { measureId: "M4", districtId: "nura" },
      { measureId: "M5", districtId: "nura" },
      { measureId: "M9", districtId: "nura" },
      { measureId: "M10", districtId: "nura" },
    ],
    [
      { measureId: "M3", districtId: "nura" },
      { measureId: "M4", districtId: "nura" },
      { measureId: "M5", districtId: "nura" },
      { measureId: "M10", districtId: "nura" },
      { measureId: "M11", districtId: "nura" },
    ],
    [
      { measureId: "M3", districtId: "nura" },
      { measureId: "M4", districtId: "nura" },
      { measureId: "M5", districtId: "nura" },
      { measureId: "M8", districtId: "nura" },
      { measureId: "M9", districtId: "nura" },
    ],
  ]);
  expect(elapsedMs).toBeLessThan(2_000);
}, 10_000);
