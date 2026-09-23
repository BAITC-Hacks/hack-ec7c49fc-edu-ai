import { expect, it } from "vitest";
import { simulateScenario } from "@/lib/simulation/engine";
import { compareCandidateQuality, searchScenarios } from "@/lib/optimizer/optimizer";
import type { StructuredObjective } from "@/lib/optimizer/types";

it("benchmarks critical-first search through the integrated engine", () => {
  const goal: StructuredObjective = { objective: "improve_district", districtId: "nura", focusIndicators: ["S1", "S2"], reduceCritical: true };
  const startedAt = performance.now();
  const result = searchScenarios(goal, simulateScenario);
  const elapsedMs = performance.now() - startedAt;
  console.info("optimizer benchmark", JSON.stringify({ elapsedMs: Math.round(elapsedMs),
    evaluatedScenarios: result.evaluatedScenarios, validScenarios: result.validScenarios }));
  expect(result.candidates).toHaveLength(3);
  expect(result.candidates.every((candidate) => candidate.result.criticalAfter === 0)).toBe(true);
  for (const candidate of result.candidates) {
    expect(candidate.result).toEqual(simulateScenario({ selections: candidate.selections }));
  }
  expect(compareCandidateQuality(result.candidates[0], result.candidates[1], goal)).toBeLessThanOrEqual(0);
  expect(compareCandidateQuality(result.candidates[1], result.candidates[2], goal)).toBeLessThanOrEqual(0);
  expect(result.validScenarios).toBe(result.evaluatedScenarios);
  expect(elapsedMs).toBeLessThan(2_000);
}, 10_000);
