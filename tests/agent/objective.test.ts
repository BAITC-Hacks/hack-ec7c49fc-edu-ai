import { afterEach, describe, expect, it, vi } from "vitest";
import {
  interpretObjective,
  interpretObjectiveDeterministically,
  validateStructuredObjective,
} from "@/lib/agent/objective";

describe("objective interpretation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("extracts a district, social focus, and critical constraint", () => {
    expect(
      interpretObjectiveDeterministically(
        "Improve Nura and eliminate critical social indicators without exceeding the budget",
      ),
    ).toEqual({
      objective: "improve_district",
      districtId: "nura",
      focusIndicators: ["S1", "S2"],
      reduceCritical: true,
    });
  });

  it("supports Russian district and objective wording", () => {
    expect(
      interpretObjectiveDeterministically(
        "Улучши Нуру и убери критические социальные показатели",
      ),
    ).toMatchObject({
      objective: "improve_district",
      districtId: "nura",
      focusIndicators: ["S1", "S2"],
      reduceCritical: true,
    });
  });

  it("rejects malformed or incomplete model output", () => {
    expect(
      validateStructuredObjective({
        objective: "improve_district",
        districtId: null,
        focusIndicators: [],
        reduceCritical: false,
      }),
    ).toBeNull();
    expect(validateStructuredObjective({ objective: "invented" })).toBeNull();
    expect(
      validateStructuredObjective({
        objective: "maximize_city_score",
        districtId: "nura",
        focusIndicators: [],
        reduceCritical: false,
      }),
    ).toBeNull();
    expect(
      validateStructuredObjective({
        objective: "maximize_city_score",
        districtId: null,
        focusIndicators: [],
        reduceCritical: false,
        score: 99,
      }),
    ).toBeNull();
  });

  it("falls back deterministically when OpenAI is unavailable", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await expect(
      interpretObjective(
        "Improve Nura and eliminate critical social indicators without exceeding the budget",
      ),
    ).resolves.toEqual({
      objective: "improve_district",
      districtId: "nura",
      focusIndicators: ["S1", "S2"],
      reduceCritical: true,
    });
  });
});
