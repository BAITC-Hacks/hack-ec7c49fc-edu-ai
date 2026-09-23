import { describe, expect, it } from "vitest";
import { fallbackExplanation } from "@/lib/agent/explanation";
import type { ScenarioCandidate } from "@/types/domain";

describe("fallbackExplanation", () => {
  it("uses only calculated candidate fields", () => {
    const candidate: ScenarioCandidate = {
      selections: [
        { measureId: "M7", districtId: "nura" },
        { measureId: "M8", districtId: "nura" },
        { measureId: "M10", districtId: "nura" },
        { measureId: "M12" },
        { measureId: "M5", districtId: "saryarka" },
      ],
      result: {
        valid: true,
        validationErrors: [],
        cost: 95,
        remainingBudget: 5,
        scoreBefore: 52.56,
        scoreAfter: 56.5,
        scoreDelta: 3.94,
        weakestDistrict: "baikonur",
        criticalBefore: 2,
        criticalAfter: 0,
        districts: [],
      },
    };

    const explanation = fallbackExplanation(
      {
        objective: "improve_district",
        districtId: "nura",
        focusIndicators: ["S1", "S2"],
        reduceCritical: true,
      },
      [candidate],
    );

    expect(explanation).toContain("Cost 95");
    expect(explanation).toContain("52.56 → 56.50");
    expect(explanation).toContain("critical indicators 2 → 0");
    expect(explanation).toContain("baikonur");
  });
});
