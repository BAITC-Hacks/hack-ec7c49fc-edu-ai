import { afterEach, describe, expect, it, vi } from "vitest";
import { explainCandidates, fallbackExplanation } from "@/lib/agent/explanation";
import type { ScenarioCandidate } from "@/types/domain";

describe("fallbackExplanation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

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
        districts: [
          {
            districtId: "nura",
            scoreBefore: 40,
            scoreAfter: 46,
            scoreDelta: 6,
            indicators: [
              { indicator: "S1", before: 38, after: 47, delta: 9 },
              { indicator: "S2", before: 35, after: 44, delta: 9 },
            ],
          },
        ],
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
    expect(explanation).toContain("district deltas: nura +6");
  });

  it("keeps numeric facts deterministic and rejects model-invented numbers", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            output_text: JSON.stringify({
              summaries: [{ goalFit: "Raises score by 999", tradeoff: "Higher cost" }],
            }),
          }),
          { status: 200 },
        ),
      ),
    );
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

    const explanation = await explainCandidates(
      {
        objective: "improve_district",
        districtId: "nura",
        focusIndicators: ["S1", "S2"],
        reduceCritical: true,
      },
      [candidate],
    );

    expect(explanation).not.toContain("999");
    expect(explanation).toContain("score 52.56 → 56.50");
  });
});
